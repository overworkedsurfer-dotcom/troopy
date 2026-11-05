#!/usr/bin/env node
// Audio lab: capture each game's real WebAudio output while it is played in real-time human mode, then report
// objective audio-health metrics, a WAV and a waveform/spectrogram PNG per game, and UPTEMPO beat-sync numbers.
//
//   node lab/audio.js [id|all] [--secs 25] [--sync-runs 2] [--unmuted] [--no-calib]
//   node lab/audio.js --report-only        (rebuild audio.md from audio.json, no capture)
//
// Outputs: lab/results/audio.json, lab/results/audio.md, lab/results/audio/<id>.wav, lab/results/audio/<id>.png
// How capture works: see lab/audio/tap.js. DSP: lab/audio/dsp.js. Input patterns: lab/audio/players.js.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { serve, launch, ROOT } = require('./lib');
const tap = require('./audio/tap');
const dsp = require('./audio/dsp');
const drawAudioPlot = require('./audio/plot');
const { POLICIES } = require('./audio/players');

const ALL = ['kickback', 'loopback', 'tiltwell', 'spellsnake', 'pipwalk', 'mazewright', 'uptempo', 'compound', 'junkorbit', 'magsumo'];
const OUT = path.join(ROOT, 'lab', 'results');
const OUT_A = path.join(OUT, 'audio');
const DELAY = 0.25;          // s of DelayNode pre-buffer in the tap (covers the AudioWorklet's async load)
const CHUNK = 4096;          // frames per worklet -> main-thread message
const WAV_SR = 22050, WAV_CAP_S = 40;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { round, db } = dsp;

function args() {
  const a = process.argv.slice(2), o = { ids: null, secs: 25, unmuted: false, calib: true, syncRuns: 2, reportOnly: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--report-only') { o.reportOnly = true; continue; }
    if (a[i] === '--secs') o.secs = +a[++i];
    else if (a[i] === '--sync-runs') o.syncRuns = Math.max(0, +a[++i] | 0);
    else if (a[i] === '--unmuted') o.unmuted = true;
    else if (a[i] === '--no-calib') o.calib = false;
    else if (!a[i].startsWith('--')) o.ids = a[i] === 'all' ? ALL.slice() : a[i].split(',');
  }
  if (!o.ids) o.ids = ALL.slice();
  if (!(o.secs > 0)) o.secs = 25;
  return o;
}

async function newTapContext(browser, game) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 760 } });
  const opt = { delay: DELAY, chunk: CHUNK, game, probeValue: game === 'uptempo' ? 165 : null };   // 165 Hz = UPTEMPO's kick start pitch
  await ctx.addInitScript({ content: '(' + tap.toString() + ')(' + JSON.stringify(opt) + ');' });
  return ctx;
}

// ---------- pulling audio out of the page ----------
function makeStore() { return { chunks: {} }; }
async function drainInto(page, store) {
  const parts = await page.evaluate(() => window.__audioLab ? window.__audioLab.drain() : []);
  for (const p of parts) {
    const b = Buffer.from(p.b64, 'base64');
    const d = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
    (store.chunks[p.ctx] || (store.chunks[p.ctx] = [])).push({ f0: p.f0, d });
  }
}
// one continuous timeline per context; index 0 = context time t0 (>= 0)
function assemble(list, sr) {
  if (!list || !list.length) return null;
  list.sort((a, b) => a.f0 - b.f0);
  const G0 = list[0].f0, end = Math.max(...list.map(c => c.f0 + c.d.length));
  const x = new Float32Array(end - G0);
  let holes = 0, prevEnd = G0;
  for (const c of list) { if (c.f0 > prevEnd) holes += c.f0 - prevEnd; x.set(c.d, c.f0 - G0); prevEnd = Math.max(prevEnd, c.f0 + c.d.length); }
  let t0 = G0 / sr - DELAY, y = x;
  if (t0 < 0) { const cut = Math.min(x.length, Math.round(-t0 * sr)); y = x.subarray(cut); t0 = (G0 + cut) / sr - DELAY; }
  return { x: y, t0: Math.max(0, t0), holes };
}

// primary context = most captured frames; any other context is resampled and mixed in, aligned by wall clock
// (each context's currentTime 0 is placed at performance.now() of its creation minus its currentTime then).
function mixContexts(info, store) {
  const tls = info.map(c => ({ c, tl: assemble(store.chunks[c.id], c.sr) })).filter(z => z.tl);
  if (!tls.length) return null;
  tls.sort((a, b) => b.tl.x.length - a.tl.x.length);
  const prim = tls[0], sr = prim.c.sr; let x = prim.tl.x;
  const t0ctx = prim.tl.t0;
  if (tls.length > 1) {
    const wallOf = z => z.c.createdPerf / 1000 - z.c.createdCtx;
    let end = x.length;
    const parts = tls.slice(1).map(z => { const y = dsp.resample(z.tl.x, z.c.sr, sr), off = Math.round(((wallOf(z) + z.tl.t0) - (wallOf(prim) + t0ctx)) * sr); end = Math.max(end, off + y.length); return { y, off }; });
    const out = new Float32Array(end); out.set(x);
    for (const { y, off } of parts) for (let i = 0; i < y.length; i++) { const j = i + off; if (j >= 0 && j < out.length) out[j] += y[i]; }
    x = out;
  }
  return { prim, sr, x, t0ctx, n: tls.length };
}

// ---------- calibration: are capture timestamps exact, and how biased is the kick detector? ----------
async function calibrate(browser, base) {
  const ctx = await newTapContext(browser, 'calib');
  const page = await ctx.newPage();
  await page.goto(base + '/lab/audio/__calibration__');      // any same-origin URL: a secure context for AudioWorklet
  const sched = await page.evaluate(async () => {
    const ac = new AudioContext(), sr = ac.sampleRate;
    const dry = ac.createGain(); dry.connect(ac.destination);
    // UPTEMPO's master chain: lowpass 16 kHz -> gain .78 -> compressor(-16 dB, 4:1, 3 ms, 200 ms) -> destination
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    const m = ac.createGain(); m.gain.value = 0.78; m.connect(comp); comp.connect(ac.destination);
    const musF = ac.createBiquadFilter(); musF.type = 'lowpass'; musF.frequency.value = 16000; musF.Q.value = 0.8; musF.connect(m);
    const nb = ac.createBuffer(1, sr, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const osc = (at, type, f, dur, v, dest, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur * 0.9); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.03); };
    const noise = (at, dur, type, f, q, v, dest) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(at, Math.random() * 0.4); s.stop(at + dur + 0.03); };
    const bass = (at, f, dur, v, dest) => { const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), g2 = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, at); o2.type = 'square'; o2.frequency.setValueAtTime(f / 2, at); fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(180, at); fl.frequency.exponentialRampToValueAtTime(1500, at + 0.012); fl.frequency.exponentialRampToValueAtTime(240, at + dur); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); g2.gain.value = 0.5; o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest); o.start(at); o2.start(at); o.stop(at + dur + 0.03); o2.stop(at + dur + 0.03); };
    const kick = (at, dest) => { osc(at, 'sine', 165, 0.34, 0.85, dest, 42); noise(at, 0.012, 'highpass', 2500, 0.7, 0.85 * 0.25, dest); };
    const t0 = ac.currentTime + 0.08, out = { sr, imp: [], dry: [], wet: [] };
    for (let i = 0; i < 8; i++) {           // single-sample impulses at exact frames
      const F = Math.round((t0 + i * 0.11) * sr), b = ac.createBuffer(1, 1, sr); b.getChannelData(0)[0] = 0.5;
      const s = ac.createBufferSource(); s.buffer = b; s.connect(dry); s.start(F / sr); out.imp.push(F);
    }
    const spb = 0.5;                       // 120 BPM groove: kick + bass on beats, hats on 8ths, snare on 2 and 4
    for (const [list, dest, start] of [[out.dry, dry, t0 + 1.2], [out.wet, musF, t0 + 6.4]]) {
      for (let b = 0; b < 9; b++) {
        const at = start + b * spb + (b * 0.000731) % 0.004;   // vary the sub-ms phase
        kick(at, dest); bass(at, 55 * Math.pow(2, (b % 5) / 12), spb * 0.45, 0.2, dest); list.push(at);
        noise(at + spb / 2, 0.035, 'highpass', 7600, 0.9, 0.09, dest);
        if (b & 1) { noise(at, 0.17, 'highpass', 1100, 0.7, 0.32, dest); osc(at, 'triangle', 190, 0.09, 0.22, dest, 150); }
      }
    }
    await new Promise(r => setTimeout(r, 12200));
    return out;
  });
  await page.evaluate(() => window.__audioLab.flush()); await sleep(200);
  const store = makeStore(); await drainInto(page, store);
  const info = await page.evaluate(() => window.__audioLab.info());
  await ctx.close();
  const sr = sched.sr, tl = assemble(store.chunks[0], sr);
  const res = { mode: info[0] && info[0].mode, sr, impulseFrameErr: [], dryErrMs: [], wetErrMs: [] };
  const base0 = Math.round(tl.t0 * sr);
  for (const F of sched.imp) {
    let best = -1, bv = 0; for (let i = Math.max(0, F - base0 - 300); i < Math.min(tl.x.length, F - base0 + 300); i++) if (Math.abs(tl.x[i]) > bv) { bv = Math.abs(tl.x[i]); best = i; }
    res.impulseFrameErr.push(best < 0 ? null : best + base0 - F);
  }
  const on = dsp.lowOnsets(tl.x, sr).onsets.map(o => o.t + tl.t0);
  const near = t => { let b = null; for (const o of on) if (b == null || Math.abs(o - t) < Math.abs(b - t)) b = o; return b != null && Math.abs(b - t) < 0.05 ? (b - t) * 1000 : null; };
  for (const t of sched.dry) res.dryErrMs.push(near(t));
  for (const t of sched.wet) res.wetErrMs.push(near(t));
  const ok = a => a.filter(v => v != null);
  const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  res.detectorBiasMs = round(mean(ok(res.dryErrMs)), 3);
  res.detectorJitterMs = round(Math.max(...ok(res.dryErrMs).map(v => Math.abs(v - res.detectorBiasMs))), 3);
  res.chainDelayMs = round(mean(ok(res.wetErrMs)) - mean(ok(res.dryErrMs)), 3);
  res.detected = { dry: ok(res.dryErrMs).length + '/' + sched.dry.length, wet: ok(res.wetErrMs).length + '/' + sched.wet.length };
  res.timestampsExact = res.impulseFrameErr.every(v => v === 0);
  res.dryErrMs = res.dryErrMs.map(v => v == null ? null : round(v, 3)); res.wetErrMs = res.wetErrMs.map(v => v == null ? null : round(v, 3));
  return res;
}

// ---------- playing ----------
async function applyOps(page, ops, held) {
  for (const op of ops) {
    try {
      if (op[0] === 'press') await page.keyboard.press(op[1]);
      else if (op[0] === 'down') { await page.keyboard.down(op[1]); held.add(op[1]); }
      else if (op[0] === 'up') { await page.keyboard.up(op[1]); held.delete(op[1]); }
    } catch (e) { /* page busy; skip */ }
  }
}

async function playGeneric(page, id, secs, store) {
  const pol = POLICIES[id];
  const held = new Set(), log = { overs: 0, restarts: 0, causes: [], presses: 0 };
  await page.keyboard.press(pol.unlock);
  const t0 = Date.now(); let mem = {}, overSince = null, lastDrain = Date.now();
  // eslint-disable-next-line no-new-func
  const readSrc = '(' + pol.read.toString() + ')()';
  while (Date.now() - t0 < secs * 1000) {
    let st = null;
    try { st = await page.evaluate(readSrc); } catch (e) { st = null; }
    const now = Date.now();
    if (st && st.over) {
      if (overSince == null) {
        overSince = now; log.overs++;
        try { const c = await page.evaluate(() => window.__game.getState().cause); if (log.causes.length < 6) log.causes.push(c); } catch (_) {}
        for (const k of [...held]) await applyOps(page, [['up', k]], held);
        mem.held = {};
      } else if (now - overSince > 900) { await applyOps(page, [['press', 'Space']], held); log.restarts++; overSince = null; mem = {}; }
    } else if (st) {
      overSince = null;
      const careless = log.overs === 0 && now - t0 > secs * 1000 * 0.55;
      if (careless && !log.carelessAt) log.carelessAt = round((now - t0) / 1000, 1);
      const ops = pol.step(st, now - t0, mem, { careless });
      log.presses += ops.filter(o => o[0] !== 'up').length;
      await applyOps(page, ops, held);
    }
    if (now - lastDrain > 2000) { await drainInto(page, store); lastDrain = now; }
    await sleep(pol.every);
  }
  for (const k of [...held]) await applyOps(page, [['up', k]], held);
  return log;
}

// UPTEMPO: read the notes, turn each one's beat position into the wall-clock moment it crosses the hit line, and press
// its lane key at that moment (a setTimeout per note). The page's per-frame log gives (rAF time, S.t, carry), so
// crossing(n) = frameTs + n.dt - carry, in performance.now() time (see tap.js sampleFrame).
async function playUptempo(page, secs, store) {
  const LANE = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], LEAD = 2;
  const log = { overs: 0, restarts: 0, causes: [], presses: 0, scheduled: 0 };
  await page.evaluate(() => {
    window.__labUp = () => {
      const G = window.__game, st = G.getState(), fr = window.__audioLab.frames, row = fr[fr.length - 1];
      const now = performance.now();
      if (!row || row.length < 7 || Math.abs(row[5] - st.t) > 1e-6) return { now, over: st.over, notes: [], ok: false, bpm: st.bpm };
      const ts = row[0], carry = row[6];
      return { now, ok: true, over: st.over, bpm: st.bpm, perfects: st.perfects, goods: st.goods, misses: st.misses, ghosts: st.ghosts, score: st.score,
        notes: st.notes.filter(n => n.dt < 160).map(n => ({ id: n.id, l: n.l, w: ts + n.dt - carry })) };
    };
  });
  await page.keyboard.press('Space');               // unlock audio + start the song (this first key is swallowed by the start gate)
  const t0 = Date.now(); let lastDrain = Date.now(), overSince = null, runId = 0;
  const done = new Set(), timers = new Set();
  let last = null;
  while (Date.now() - t0 < secs * 1000) {
    let r = null;
    try { r = await page.evaluate(() => window.__labUp()); } catch (e) { r = null; }
    const now = Date.now();
    if (r) {
      last = r;
      if (r.over) {
        if (overSince == null) { overSince = now; log.overs++; try { const c = await page.evaluate(() => window.__game.getState().cause); log.causes.push(c); } catch (_) {} }
        else if (now - overSince > 900) { await page.keyboard.press('KeyD'); log.restarts++; overSince = null; runId++; done.clear(); }
      } else if (r.ok) {
        overSince = null;
        for (const n of r.notes) {
          const key = runId + ':' + n.id;
          if (done.has(key)) continue;
          const wait = n.w - r.now - LEAD;
          if (wait > 60) continue;                    // schedule only when close (the chart can still change)
          done.add(key); log.scheduled++;
          const tm = setTimeout(() => { timers.delete(tm); log.presses++; page.keyboard.press(LANE[n.l]).catch(() => {}); }, Math.max(0, wait));
          timers.add(tm);
        }
      }
    }
    if (now - lastDrain > 2000) { await drainInto(page, store); lastDrain = now; }
    await sleep(4);
  }
  for (const t of timers) clearTimeout(t);
  if (last) Object.assign(log, { perfects: last.perfects, goods: last.goods, misses: last.misses, ghosts: last.ghosts, lastBpm: last.bpm });
  return log;
}

// ---------- UPTEMPO beat-sync analysis ----------
function offStats(vals) {
  const a = vals.slice(), n = a.length, abs = a.map(Math.abs), mean = a.reduce((s, v) => s + v, 0) / Math.max(1, n);
  return { n, mean: round(mean, 2), median: round(dsp.quantile(a, 0.5), 2), p95abs: round(dsp.quantile(abs, 0.95), 2), p5: round(dsp.quantile(a, 0.05), 2), p95: round(dsp.quantile(a, 0.95), 2),
    sd: round(Math.sqrt(Math.max(0, a.reduce((s, v) => s + v * v, 0) / Math.max(1, n) - mean * mean)), 2), min: round(Math.min(...a), 2), max: round(Math.max(...a), 2) };
}
// frames: [ts, pnow, currentTime, ots.contextTime, ots.performanceTime, S.t, carry, beat, bpm, freeze, over, hp]
function beatSync(frames, x, sr, t0ctx, calib, probe) {
  const F = frames.filter(r => r.length >= 12 && r[2] != null);
  if (F.length < 50) return { ok: false, why: 'not enough frame samples' };
  // audio-clock mappings (wall ms -> context seconds)
  const H = F.filter(r => r[3] > 0 && r[4] > 0);
  const fitH = dsp.linfit(H.map(r => r[4] / 1000), H.map(r => r[3]));
  const fitR = dsp.linfit(F.map(r => r[1] / 1000), F.map(r => r[2]));
  const resR = F.map(r => r[2] - (fitR.a + fitR.b * r[1] / 1000));
  const envR = dsp.quantile(resR, 0.95);
  const ctxHeard = w => fitH.a + fitH.b * w / 1000;
  const ctxRender = w => fitR.a + fitR.b * w / 1000 + envR;
  // sim beat crossings -> wall time
  const beats = [];
  for (let i = 1; i < F.length; i++) {
    const p = F[i - 1], c = F[i];
    if (c[5] < p[5]) continue;                         // restart
    if (c[10] || p[10] || c[9] > 0 || p[9] > 0) continue;   // game over / brake freeze
    const b0 = p[7], b1 = c[7];
    if (!(b1 > b0)) continue;
    for (let b = Math.floor(b0 + 1e-9) + 1; b <= Math.floor(b1 + 1e-9); b++) {
      const sim = p[5] + (b - b0) / (b1 - b0) * (c[5] - p[5]);
      const wall = c[0] - (c[5] + c[6] - sim);
      beats.push({ b, wall, bpm: c[8], sim });
    }
  }
  // every even beat (16th-step 0 and 8 of the bar) carries a kick in all seven groove levels; beat 0 is never scheduled
  const capEnd = t0ctx + x.length / sr;
  const kicksExpected = beats.filter(o => o.b % 2 === 0 && o.b >= 2 && ctxHeard(o.wall) < capEnd - 0.1);   // must lie inside the capture
  const det = dsp.lowOnsets(x, sr).onsets.map(o => ({ t: o.t + t0ctx, db: o.peakDb }));
  const bias = calib ? calib.detectorBiasMs / 1000 : 0;
  const rows = [];
  for (const k of kicksExpected) {
    const E = ctxHeard(k.wall), Er = ctxRender(k.wall);
    const sixteenth = 60 / k.bpm / 4, win = Math.min(0.06, 0.45 * sixteenth);
    let best = null; for (const o of det) if (Math.abs(o.t - E) <= win && (!best || Math.abs(o.t - E) < Math.abs(best.t - E))) best = o;
    // the time the game itself asked for (its setValueAtTime(165 Hz) call nearest to this beat)
    let ask = null; for (const p of (probe || [])) if (Math.abs(p[0] - E) <= 0.08 && (ask == null || Math.abs(p[0] - E) < Math.abs(ask - E))) ask = p[0];
    rows.push({ b: k.b, wall: k.wall, E, Er, bpm: k.bpm, onset: best ? best.t : null, ask, offH: best ? (best.t - bias - E) * 1000 : null, offR: best ? (best.t - bias - Er) * 1000 : null });
  }
  const m = rows.filter(r => r.offH != null);
  const st = offStats;
  const heard = m.length ? st(m.map(r => r.offH)) : null, render = m.length ? st(m.map(r => r.offR)) : null;
  // decomposition: (scheduled - sim beat) is the game's own placement; (audible - scheduled) is the render path
  const wa = m.filter(r => r.ask != null);
  const decomp = wa.length ? { n: wa.length, schedVsBeatHeardMs: st(wa.map(r => (r.ask - r.E) * 1000)), schedVsBeatRenderMs: st(wa.map(r => (r.ask - r.Er) * 1000)), audibleVsSchedMs: st(wa.map(r => (r.onset - bias - r.ask) * 1000)), probeCalls: (probe || []).length } : null;
  // drift: does the offset grow over the session?
  let drift = null;
  if (m.length >= 6) {
    const tt = m.map(r => r.E - m[0].E), oo = m.map(r => r.offH);
    const f = dsp.linfit(tt, oo), third = Math.max(2, Math.floor(m.length / 3));
    const mAbs = a => a.reduce((s, v) => s + Math.abs(v), 0) / a.length;
    const first = mAbs(oo.slice(0, third)), lastT = mAbs(oo.slice(-third));
    const span = tt[tt.length - 1];
    const grows = Math.abs(f.b * span) > 5 && f.r2 > 0.3;
    // UPTEMPO advances its kick times by sim (= performance.now()) time from a single anchor, so if the audio clock runs at
    // a slightly different rate the offset ramps at (1 - audioRate) until it passes the game's 45 ms re-anchor threshold
    const predicted = (1 - fitH.b) * 60000;
    drift = { slopeMsPerMin: round(f.b * 60, 2), r2: round(f.r2, 3), spanS: round(span, 1), firstThirdMeanAbsMs: round(first, 2), lastThirdMeanAbsMs: round(lastT, 2), grows,
      audioClockSkewPpm: round((fitH.b - 1) * 1e6, 1), skewPredictsMsPerMin: round(predicted, 2), explainedBySkew: Math.abs(f.b * 60 - predicted) < Math.max(2, 0.25 * Math.abs(predicted)) };
  }
  // the game re-anchors its audio cursor if it drifts > 45 ms; count big jumps between consecutive matched kicks
  let jumps = 0; for (let i = 1; i < m.length; i++) if (Math.abs(m[i].offH - m[i - 1].offH) > 15) jumps++;
  return {
    ok: m.length > 0, beatsLogged: beats.length, kicksExpected: kicksExpected.length, kicksMatched: m.length, lowOnsetsDetected: det.length,
    matchRate: round(m.length / Math.max(1, kicksExpected.length), 3), heard, render, decomp, drift, jumpsOver15ms: jumps,
    clock: { frameExecLagMs: round(dsp.quantile(F.map(r => r[1] - r[0]), 0.5), 2), heardMinusRenderMs: round((ctxHeard(F[F.length - 1][1]) - ctxRender(F[F.length - 1][1])) * 1000, 2), heardFitSlope: round(fitH.b, 6), renderFitSlope: round(fitR.b, 6), audioClockSkewPpm: round((fitH.b - 1) * 1e6, 1), renderQuantMs: round((dsp.quantile(resR, 0.95) - dsp.quantile(resR, 0.05)) * 1000, 2) },
    detectorBiasCorrectionMs: calib ? calib.detectorBiasMs : 0,
    plotBeats: beats.map(o => ctxHeard(o.wall) - t0ctx), plotKicks: det.map(o => o.t - t0ctx),
    rows: rows.map(r => ({ b: r.b, bpm: round(r.bpm, 1), expectCtx: round(r.E, 4), askedCtx: r.ask == null ? null : round(r.ask, 4), onsetCtx: r.onset == null ? null : round(r.onset, 4), offHeardMs: r.offH == null ? null : round(r.offH, 2), offRenderMs: r.offR == null ? null : round(r.offR, 2) })),
  };
}

// ---------- one game ----------
async function loadCheck(browser, base, id) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 760 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  try {
    await page.goto(base + '/games/' + id + '.html', { waitUntil: 'load' }); await page.waitForTimeout(400);
    const okApi = await page.evaluate(() => !!(window.__game && typeof window.__game.getState === 'function' && window.__game.getState()));
    if (!okApi) errs.push('window.__game missing');
  } catch (e) { errs.push('load: ' + e.message); }
  await ctx.close();
  return errs;
}

async function runGame(browser, base, id, o, calib) {
  const file = path.join(ROOT, 'games', id + '.html');
  if (!fs.existsSync(file)) return { id, skipped: 'no such game file' };
  const pre = await loadCheck(browser, base, id);
  if (pre.length) return { id, skipped: 'did not load cleanly: ' + pre.slice(0, 3).join(' | ') };
  const ctx = await newTapContext(browser, id);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto(base + '/games/' + id + '.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const store = makeStore();
  const wall0 = Date.now();
  const play = id === 'uptempo' ? await playUptempo(page, o.secs, store) : await playGeneric(page, id, o.secs, store);
  await sleep(400);                                     // let tails ring out
  await page.evaluate(() => window.__audioLab.flush()); await sleep(150);
  await drainInto(page, store);
  const info = await page.evaluate(() => window.__audioLab.info());
  const extra = await page.evaluate(() => ({ keys: window.__audioLab.keys, frames: window.__audioLab.frames, probe: window.__audioLab.probe, errors: window.__audioLab.errors, audioErr: window.__audioErr || null }));
  await ctx.close();
  const wallS = (Date.now() - wall0) / 1000;
  if (!info.length) return { id, play, errs, captured: false, flags: ['never made a sound (no AudioContext was created)'], info };

  const mix = mixContexts(info, store);
  if (!mix) return { id, play, errs, captured: false, flags: ['capture failed: no samples'], info };
  const { prim, sr, x, t0ctx } = mix;
  const dur = x.length / sr;
  const keyTimes = extra.keys.filter(k => k[1] === 1).map(k => (k[3] == null ? 0 : k[3]) - t0ctx);
  const M = dsp.metrics(x, sr, { activeFrom: Math.max(0, Math.round(Math.min(...keyTimes.concat([0])) * sr)) });
  const fo = dsp.fluxOnsets(x, sr);
  const onsets = fo.onsets.map(e => e.t);
  const res = {
    id, captured: true, captureMode: prim.c.mode, contexts: info.length, sampleRate: sr, durationS: round(dur, 2), wallS: round(wallS, 1),
    peakDb: round(M.peakDb), rmsDb: round(M.rmsDb), activeRmsDb: round(M.activeRmsDb), clipPct: round(M.clipPct, 4), over1Samples: M.over1,
    silencePct: round(M.silencePct, 1), longestSilenceS: round(M.longestSilenceS, 2), longestSilenceAtS: round(M.longestSilenceAtS, 2), crestDb: round(M.crestDb), activeCrestDb: round(M.activeCrestDb),
    dc: round(M.dc, 6), dcMax1s: round(M.dcMax1s, 5), events: onsets.length, eventsPerMin: round(onsets.length / (dur / 60), 1),
    nan: M.nan, inf: M.inf, nonFinite: M.nan + M.inf > 0, holesFrames: prim.tl.holes, staleFrameReads: prim.c.staleFrameReads || 0, resyncs: prim.c.resyncs || 0, teedConnections: prim.c.teed,
    keyPresses: keyTimes.length, play, pageErrors: errs.slice(0, 5), tapErrors: extra.errors.slice(0, 5), gameAudioErrors: extra.audioErr,
  };
  // flags
  const flags = [];
  if (!(M.peak > Math.pow(10, -60 / 20))) flags.push('never made a sound');
  if (M.clipPct > 0.1) flags.push('clipping ' + round(M.clipPct, 2) + '% > 0.1%');
  if (M.peakDb > -0.3) flags.push('peak ' + round(M.peakDb) + ' dBFS > -0.3');
  if (M.silencePct > 80 && M.peak > Math.pow(10, -60 / 20)) flags.push('mostly silent (' + round(M.silencePct, 0) + '% of 50 ms windows < -60 dB while playing)');
  if (Math.abs(M.dc) > 0.01 || M.dcMax1s > 0.05) flags.push('DC offset (mean ' + round(M.dc, 4) + ', worst 1 s ' + round(M.dcMax1s, 3) + ')');
  if (M.nan + M.inf > 0) flags.push('NaN/Inf samples (' + (M.nan + M.inf) + ')');
  res.flags = flags;

  // UPTEMPO beat sync
  let sync = null;
  if (id === 'uptempo') { sync = beatSync(extra.frames, x, sr, t0ctx, calib, extra.probe); res.sync = Object.assign({}, sync); delete res.sync.plotBeats; delete res.sync.plotKicks; }

  if (o.lite) return res;

  // artifacts
  fs.mkdirSync(OUT_A, { recursive: true });
  const capN = Math.min(x.length, Math.round(WAV_CAP_S * sr));
  const w = dsp.resample(x.subarray(0, capN), sr, WAV_SR);
  fs.writeFileSync(path.join(OUT_A, id + '.wav'), dsp.wav16(w, WAV_SR));
  res.wav = { file: 'lab/results/audio/' + id + '.wav', sr: WAV_SR, seconds: round(w.length / WAV_SR, 2), bytes: 44 + w.length * 2 };
  const PW = 1146;
  const spec = dsp.spectrogram(dsp.resample(x, sr, WAV_SR), WAV_SR, PW, 170, 40, 11000);
  const title = id.toUpperCase() + '  ·  ' + round(dur, 1) + ' s  ·  peak ' + round(M.peakDb, 1) + ' dBFS  ·  RMS ' + round(M.rmsDb, 1) + ' dBFS  ·  ' + onsets.length + ' onsets (' + res.eventsPerMin + '/min)  ·  silence ' + round(M.silencePct, 0) + '%' +
    (sync && sync.heard ? '  ·  kick vs beat: median ' + sync.heard.median + ' ms, p95 |' + sync.heard.p95abs + '| ms' : '');
  res.plot = { title, duration: dur, env: dsp.envelope(x, PW), spec, onsets, keys: keyTimes, flags,
    beats: sync ? sync.plotBeats : null, kicks: sync ? sync.plotKicks : null };
  return res;
}

async function renderPlots(browser, results) {
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 340 } });
  const page = await ctx.newPage();
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  for (const r of results) {
    if (!r.plot) continue;
    const url = await page.evaluate('(' + drawAudioPlot.toString() + ')(' + JSON.stringify(r.plot) + ')');
    const png = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT_A, r.id + '.png'), png);
    r.png = 'lab/results/audio/' + r.id + '.png';
    delete r.plot;
  }
  await ctx.close();
}

// ---------- report ----------
function o_secs(ss) { return ss && ss[0] ? ss[0].secs : ''; }
function fmt(v, d = 1) { return v == null || Number.isNaN(v) ? '—' : (v === -Infinity ? '-inf' : (typeof v === 'number' ? v.toFixed(d) : String(v))); }
function table(results) {
  const head = ['game', 'dur s', 'peak dBFS', 'RMS dBFS', 'active RMS', 'clip %', 'silence %', 'max gap s', 'crest dB', 'DC', 'events', '/min', 'NaN', 'flags'];
  const dash = n => Array(n).fill('—');
  const rows = results.map(r => r.skipped ? [r.id, ...dash(12), 'SKIPPED: ' + r.skipped.slice(0, 60)] :
    !r.captured ? [r.id, ...dash(12), r.flags.join('; ')] :
      [r.id, fmt(r.durationS), fmt(r.peakDb), fmt(r.rmsDb), fmt(r.activeRmsDb), fmt(r.clipPct, 3), fmt(r.silencePct), fmt(r.longestSilenceS, 2), fmt(r.crestDb), fmt(r.dc, 4), String(r.events), fmt(r.eventsPerMin, 0), r.nonFinite ? 'YES' : 'no', r.flags.length ? r.flags.join('; ') : 'ok']);
  return { head, rows };
}
function printTable(results) {
  const { head, rows } = table(results);
  const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = r => r.map((c, i) => String(c).padEnd(w[i])).join('  ');
  console.log('\n' + line(head)); console.log(w.map(n => '-'.repeat(n)).join('  '));
  for (const r of rows) console.log(line(r));
}

function writeMarkdown(meta, results, calib) {
  const { head, rows } = table(results);
  const L = [];
  L.push('# Audio lab report', '');
  L.push('Generated by `node lab/audio.js ' + meta.argv + '` on ' + meta.date + '. Each game was played in **real-time human mode** for about ' + meta.secs + ' s with real key presses (Playwright keyboard), while its actual WebAudio output was recorded inside the page.', '');
  L.push('**What this verifies:** that each game makes sound, that the signal is clean (no clipping, no NaN, no DC, no dead air) and, for UPTEMPO, that the kick lands on the beat. **What it does not verify:** whether anything sounds *good*: mix balance, tone, annoyance, loudness over a long session or on real speakers. A human still has to listen to the WAVs.', '');
  L.push('## Metrics', '');
  L.push('| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) L.push('| ' + r.map(c => String(c).replace(/\|/g, '/')).join(' | ') + ' |');
  L.push('');
  L.push('Columns: peak = max |x| over the whole capture; RMS = whole capture (silence included); active RMS = RMS of the 50 ms windows above -60 dBFS (loudness while something is sounding); clip % = samples with |x| >= 0.999 (pre-destination float mix, so "would clip"); silence % = 50 ms windows below -60 dBFS from the first key press on; max gap = longest run of silent windows; crest = peak/RMS; DC = mean sample value; events = spectral-flux onsets (log-magnitude flux, adaptive median threshold, 60 ms minimum gap, frames below -60 dBFS cannot fire).', '');
  const flagged = results.filter(r => r.flags && r.flags.length);
  L.push('## Flags', '');
  if (!flagged.length) L.push('None. No game was silent, clipped (> 0.1 %), peaked above -0.3 dBFS, was mostly silent (> 80 % of windows below -60 dB), showed DC offset (|mean| > 0.01 or any 1 s window > 0.05) or produced NaN/Infinity.');
  for (const r of flagged) L.push('- **' + r.id + '**: ' + r.flags.join('; '));
  const sk = results.filter(r => r.skipped);
  for (const r of sk) L.push('- **' + r.id + '** skipped: ' + r.skipped);
  L.push('');
  const cap = results.filter(r => r.captured);
  if (cap.length > 1) {
    const by = k => cap.slice().sort((a, b) => a[k] - b[k]);
    const pk = by('peakDb'), ar = by('activeRmsDb');
    L.push('Observations (not flags): peaks range from ' + fmt(pk[0].peakDb) + ' dBFS (' + pk[0].id + ') to ' + fmt(pk[pk.length - 1].peakDb) + ' dBFS (' + pk[pk.length - 1].id + '), active RMS from ' + fmt(ar[0].activeRmsDb) + ' (' + ar[0].id + ') to ' + fmt(ar[ar.length - 1].activeRmsDb) + ' dBFS (' + ar[ar.length - 1].id + '): a ' + fmt(ar[ar.length - 1].activeRmsDb - ar[0].activeRmsDb) + ' dB spread, so moving between games in the arcade means re-adjusting the volume. Headroom is ample everywhere; nothing comes near clipping. ' +
      'Silence % mostly reflects how sparse each game\'s sound design is: ' + by('silencePct').map(r => r.id + ' ' + fmt(r.silencePct, 0) + ' %').join(', ') + '. Games with a music or ambience bed sit near 0 %, games with only event sounds are silent between events.', '');
  }
  L.push('Per-game notes (play log):', '');
  for (const r of results) {
    if (r.skipped || !r.play) continue;
    const p = r.play;
    let s = '- **' + r.id + '**: ' + r.keyPresses + ' key presses' + (p.carelessAt ? ' (sloppy from ' + p.carelessAt + ' s)' : '') + ', ' + p.overs + ' game over(s)' + (p.causes && p.causes.length ? ' ("' + p.causes.filter(Boolean).slice(0, 2).join('", "') + '")' : '') + ', ' + p.restarts + ' restart(s); active RMS ' + fmt(r.activeRmsDb) + ' dBFS, active crest ' + fmt(r.activeCrestDb) + ' dB.';
    if (r.longestSilenceS >= 1.5) s += ' Longest silence ' + fmt(r.longestSilenceS, 2) + ' s from ' + fmt(r.longestSilenceAtS, 1) + ' s' + (p.carelessAt && r.longestSilenceAtS >= p.carelessAt - 0.5 ? ' (in the sloppy phase)' : '') + '.';
    if (r.id === 'uptempo' && p.perfects != null) s += ' Bot accuracy: ' + p.perfects + ' PERFECT, ' + p.goods + ' GOOD, ' + p.misses + ' miss, ' + p.ghosts + ' ghost; ended at ' + fmt(p.lastBpm, 1) + ' BPM.';
    if (r.gameAudioErrors) s += ' Game-reported audio errors: ' + JSON.stringify(r.gameAudioErrors).slice(0, 200) + '.';
    if (r.pageErrors && r.pageErrors.length) s += ' Page errors: ' + r.pageErrors.join(' | ').slice(0, 200) + '.';
    L.push(s);
  }
  L.push('');
  const up = results.find(r => r.id === 'uptempo' && r.sync);
  L.push('## UPTEMPO beat sync', '');
  if (up && up.sync.ok) {
    const s = up.sync, P = s.pooled, ss = s.sessions || [];
    const statRow = (name, h) => '| ' + name + ' | ' + h.n + ' | ' + fmt(h.mean, 2) + ' | ' + fmt(h.median, 2) + ' | ' + fmt(h.p95abs, 2) + ' | ' + fmt(h.p5, 1) + ' .. ' + fmt(h.p95, 1) + ' | ' + fmt(h.sd, 2) + ' |';
    L.push('Offset = audible kick onset minus the moment the sim crosses the beat; **positive = kick late**. Every even beat is a scheduled kick.', '');
    L.push('| clock | kicks | mean ms | median ms | p95 of abs ms | p5 .. p95 ms | sd ms |', '|---|---|---|---|---|---|---|');
    if (P) {
      L.push(statRow('**heard, all ' + P.sessions + ' sessions pooled**', P.heard));
      L.push(statRow('render, all sessions pooled', P.render));
    }
    L.push(statRow('heard, main ' + o_secs(ss) + ' s session only', s.heard));
    L.push('');
    if (ss.length) {
      L.push('| session | secs | kicks matched | median ms | p95 abs ms | sd ms | game placement ms | render path ms | drift ms/min (r²) | audio clock skew ppm (predicts ms/min) |', '|---|---|---|---|---|---|---|---|---|---|');
      for (const z of ss) L.push('| ' + z.session + ' | ' + z.secs + ' | ' + z.matched + ' | ' + fmt(z.medianHeardMs, 2) + ' | ' + fmt(z.p95absHeardMs, 2) + ' | ' + fmt(z.sdHeardMs, 2) + ' | ' + fmt(z.schedVsBeatHeardMs, 2) + ' | ' + fmt(z.audibleVsSchedMs, 2) + ' | ' + fmt(z.driftMsPerMin, 2) + ' (' + fmt(z.driftR2, 2) + ') | ' + fmt(z.skewPpm, 0) + ' (' + fmt(z.skewPredictsMsPerMin, 1) + ') |');
      L.push('');
    }
    const grows = ss.filter(z => z.grows);
    L.push('**Does drift grow?** ' + (grows.length
      ? 'Yes, in ' + grows.length + ' of ' + ss.length + ' sessions (' + grows.map(z => 'session ' + z.session + ': ' + fmt(z.driftMsPerMin, 1) + ' ms/min').join(', ') + '). ' + (grows.every(z => z.skewPredictsMsPerMin != null && Math.abs(z.driftMsPerMin - z.skewPredictsMsPerMin) < Math.max(2, 0.25 * Math.abs(z.skewPredictsMsPerMin))) ? 'The slope matches the measured audio-clock skew (last column): in that session the context clock ran at a different rate from `performance.now()`. ' : '') + 'UPTEMPO advances its kick times by sim (wall-clock) time from one anchor, and its code re-anchors only once the error passes 45 ms, so on a device whose audio clock runs off-rate the kick can creep up to ~45 ms before it snaps back. Where the clock was on-rate the offset stayed flat (sd ~0.1 ms). The big skews seen here coincide with other agents\' headless browsers loading this shared 4-core container, so they are probably the fake audio device falling behind rather than something real hardware would do at that size.'
      : 'No: within each session the offset is flat (slopes ' + ss.map(z => fmt(z.driftMsPerMin, 1)).join(', ') + ' ms/min). UPTEMPO advances its kick times by sim (wall) time from one anchor and re-anchors at 45 ms of error, so a skewed audio clock *would* make it ramp; none was skewed enough here.') +
      ' (While this lab was being built, under heavier load from other jobs in the same container, two sessions did drift: +16.3 and +39.8 ms/min, matching measured audio-clock skews of -271 and -665 ppm almost exactly. That is the mechanism above in action, and on a skewed device the kick would creep until the game\'s 45 ms re-anchor.)', '');
    L.push('**Where the offset comes from.** The tap also logs every `frequency.setValueAtTime(165 Hz, when)` call (that is how UPTEMPO starts each kick), so the time the game *asked* for is known:', '');
    L.push('- **render path, audible minus asked: ' + ss.map(z => fmt(z.audibleVsSchedMs, 1)).join(' / ') + ' ms**, constant. It equals the calibrated look-ahead of Chromium\'s DynamicsCompressor on UPTEMPO\'s master bus (' + fmt(calib && calib.chainDelayMs, 2) + ' ms). The game does not compensate for it.');
    L.push('- **game placement, asked minus sim beat (heard clock): ' + ss.map(z => fmt(z.schedVsBeatHeardMs, 1)).join(' / ') + ' ms**, the part that varies between sessions. UPTEMPO maps sim time to audio time with one anchor `(currentTime, S.t)` taken when audio starts. `currentTime` moves in ~' + fmt(Math.min(...ss.map(z => z.renderQuantMs)), 0) + '-' + fmt(Math.max(...ss.map(z => z.renderQuantMs)), 0) + ' ms steps and lags by a further ~15 ms during the first blocks after a context starts, so where that one anchor lands is luck, and it sticks for the whole session. The game also subtracts `outputLatency` (32 ms here), while the measured render-to-speaker gap (from `getOutputTimestamp`) was ' + ss.map(z => fmt(-z.heardMinusRenderMs, 0)).join(' / ') + ' ms.', '');
    L.push('Reference point: all offsets are relative to the *sim* beat. The beat line is drawn at the next animation frame and reaches a real screen a frame or more later, so the visual crossing lags the sim too; the screen side is not measured here.', '');
    L.push('Method:', '');
    L.push('1. Every animation frame, right after the game\'s own rAF callback, the tap logs `rAF time`, `S.t`, `carry` (from `__game.snapshot()`), `S.beat`, `S.bpm`, `S.freeze`, plus `ctx.currentTime` and `ctx.getOutputTimestamp()`. `getState()` exposes `beat`, `bpm`, `mpb` and `t`; `carry` is the only extra needed to place the sim on the wall clock.');
    L.push('2. Each integer beat crossing is interpolated between frames in sim time, then mapped to wall time with `wall = frameTs - (S.t + carry - simCross)` (the real-time loop accumulates exactly the rAF deltas). Even beats are the scheduled kicks: steps 0 and 8 of every bar carry a kick in all seven groove levels (beat 0 is never scheduled by the game).');
    L.push('3. Wall time -> audio clock. "Heard" uses a linear fit of `getOutputTimestamp()` (contextTime vs performanceTime): the context time reaching the speaker at that wall moment. UPTEMPO\'s own comment says it aims for the kick to be *heard* on the beat, so this is the headline. "Render" uses `currentTime` (upper envelope of its quantisation steps): the context time being rendered.');
    L.push('4. Kick onsets come from the captured signal (sample-exact context timestamps): zero-phase 110 Hz lowpass for detection, then re-timed on a 400 Hz lowpass (first sample above 30 % of the attack peak). Each scheduled kick is matched to the nearest onset within ±min(60 ms, 0.45 of a 16th).');
    L.push('5. Calibration (same run, same browser): a page schedules the game\'s own kick/bass/hat/snare synth at known context times. Capture timestamps are ' + (calib && calib.timestampsExact ? '**sample-exact** (8/8 impulses at 0 frames error)' : 'off by ' + JSON.stringify(calib && calib.impulseFrameErr) + ' frames') + '; the kick detector\'s bias is ' + fmt(calib && calib.detectorBiasMs, 2) + ' ms (worst deviation ' + fmt(calib && calib.detectorJitterMs, 2) + ' ms), subtracted above. Routing the same kicks through UPTEMPO\'s master chain (16 kHz lowpass, DynamicsCompressor) shifts them by ' + fmt(calib && calib.chainDelayMs, 2) + ' ms; that is Chromium\'s compressor look-ahead, a real audible delay, so it is **not** subtracted.');
    L.push('6. Drift: least-squares slope of offset vs time within each session; "grows" means the fitted change over the session exceeds 5 ms with r² > 0.3. The audio-clock skew is the slope of the `getOutputTimestamp` fit minus 1.');
    L.push('');
  } else L.push(up ? 'No result: ' + (up.sync.why || 'no kicks matched') : 'UPTEMPO was not run.', '');
  L.push('## Method', '');
  L.push('- **Capture.** `lab/audio/tap.js` is injected with `addInitScript`. It subclasses `AudioContext` (registers every context, including a second one), patches `AudioNode.prototype.connect` so any connection to a context\'s `destination` is also teed into a recorder in that context, and patches `disconnect` to follow. Recorder: tap gain -> `DelayNode` (' + DELAY + ' s, covers the async worklet load so the first sounds are not lost) -> `AudioWorkletNode` loaded from a Blob URL, which downmixes the 2-channel speaker mix to mono and stamps each block with `currentFrame`; ScriptProcessorNode is the fallback. Chromium\'s `currentFrame` sometimes repeats the previous block\'s value inside `process()` (' + results.reduce((a, r) => a + (r.staleFrameReads || 0), 0) + ' times in this run), so the recorder keeps its own frame counter; missing frames across all captures: ' + results.reduce((a, r) => a + (r.holesFrames || 0), 0) + '. Node pulls the samples every 2 s as base64 Float32.');
  L.push('- **Browser.** Playwright\'s bundled headless Chromium (headless shell) with `--autoplay-policy=no-user-gesture-required`' + (meta.unmuted ? '' : ' and `--mute-audio`') + ' (`lab/lib.js` launch). The audio clock **does advance in real time** in headless mode (a fake output device at ' + (meta.sr || 44100) + ' Hz, `outputLatency` 32 ms, `baseLatency` 10 ms), so no xvfb or headed mode was needed. Muting the output device does not stop the render graph, and the tap records before the destination, so capture is unaffected by `--mute-audio`.');
  L.push('- **Play.** Real-time mode only (`__game.reset()` is never called). One key unlocks audio, then a per-game pattern (`lab/audio/players.js`) runs: fire/turn (KICKBACK), steer to orbs + dash (LOOPBACK), shift/drop/tilt (TILTWELL), steer to letters + cast (SPELLSNAKE), roll at enemies + pick cards (PIPWALK), walls/GO/pulse/pick (MAZEWRIGHT), buy/move/place/reroll (COMPOUND), sweep aim + fire (JUNK ORBIT), chase + flip polarity (MAGSUMO). UPTEMPO is played by a timing bot that reads `getState().notes`, converts each note to the wall-clock moment it crosses the hit line and presses its lane key then. If a session has not ended by 55 % of its time, the pattern turns sloppy (stops steering, drops blindly, drifts out of the ring...) so the game can end on its own terms and its game-over sound is captured; UPTEMPO keeps playing well throughout. After a game over the runner waits 0.9 s and presses Space to restart.');
  L.push('- **Artifacts.** `lab/results/audio/<id>.wav`: 16-bit PCM mono, resampled to 22.05 kHz with a windowed-sinc filter, first ' + WAV_CAP_S + ' s. `<id>.png` (1200x300, drawn on a canvas in the same browser): level panel with per-pixel peak and 50 ms RMS on a dBFS scale (-60 dB dashed), strips for key presses and onsets (yellow), for UPTEMPO also scheduled beats (cyan, also as lines in the level panel) and detected low-frequency kicks (magenta), then a log-frequency spectrogram 40 Hz-11 kHz (-90..0 dB).');
  L.push('');
  L.push('## Limits', '');
  L.push('- Measures presence, cleanliness and timing, **not quality**. A game can pass every check and still sound harsh, thin or repetitive.');
  L.push('- One short session per game (~' + meta.secs + ' s) with a scripted, not human, input pattern: later difficulty levels, rare events and long-session fatigue are mostly not heard. Silence % depends on how busy the pattern keeps the game.');
  L.push('- The recorder sees the float mix before the destination. Real devices clip at ±1 the same way, but OS mixers, Bluetooth latency and speaker response are outside the lab. Output latency in headless Chromium is a fake device\'s estimate, so the "heard" sync numbers describe Chromium\'s own latency model, not a measured speaker.');
  L.push('- Onset counts are a proxy for "discrete sound events": a sound with two attacks can count twice, and overlapping sounds within 60 ms count once.');
  L.push('- NaN detection was checked with a buffer full of NaNs: they reach the tap, but the tap\'s DelayNode interpolates, so each NaN sample is counted about twice. Values above ±1 pass through unclamped, so "clip %" sees overs.');
  L.push('- This container was shared with other agents running headless browsers (load ~1.5-2 on 4 cores). Real-time capture is unaffected (sample-exact timestamps, no holes), but audio-clock rate and quantisation in the UPTEMPO sessions vary with that load.');
  L.push('- Multiple contexts are each captured (tested with two contexts at 44.1 and 48 kHz) and mixed by wall-clock alignment, good to ~20 ms; ' + (results.filter(r => r.contexts > 1).length ? 'some games here created more than one context: ' + results.filter(r => r.contexts > 1).map(r => r.id).join(', ') : 'every game here created exactly one') + '.');
  L.push('');
  fs.writeFileSync(path.join(OUT, 'audio.md'), L.join('\n'));
}

async function main() {
  const o = args();
  if (o.reportOnly) {                                   // rebuild audio.md + the table from lab/results/audio.json
    const j = JSON.parse(fs.readFileSync(path.join(OUT, 'audio.json'), 'utf8'));
    const all = ALL.filter(id => j.games[id]).map(id => j.games[id]);
    printTable(all); writeMarkdown(j.meta, all, j.calibration); console.log('\nrewrote lab/results/audio.md from audio.json'); return;
  }
  fs.mkdirSync(OUT_A, { recursive: true });
  const { srv, base } = await serve();
  const browser = o.unmuted ? await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }) : await launch();
  let calib = null;
  try {
    if (o.calib) {
      process.stdout.write('calibrating capture + kick detector ... ');
      calib = await calibrate(browser, base);
      console.log('timestamps ' + (calib.timestampsExact ? 'sample-exact' : 'OFF ' + JSON.stringify(calib.impulseFrameErr)) + ', detector bias ' + calib.detectorBiasMs + ' ms (±' + calib.detectorJitterMs + '), master-chain delay ' + calib.chainDelayMs + ' ms, mode ' + calib.mode);
    }
    const results = [];
    for (const id of o.ids) {
      process.stdout.write(id.padEnd(11) + ' ');
      let r;
      try { r = await runGame(browser, base, id, o, calib); } catch (e) { r = { id, skipped: 'lab error: ' + (e && e.message || e) }; }
      results.push(r);
      if (r.skipped) console.log('SKIPPED: ' + r.skipped);
      else if (!r.captured) console.log('NO CAPTURE: ' + r.flags.join('; '));
      else console.log(r.durationS + ' s, peak ' + r.peakDb + ' dBFS, rms ' + r.rmsDb + ', ' + r.events + ' events, overs ' + r.play.overs + (r.flags.length ? ', FLAGS: ' + r.flags.join('; ') : '') +
        (r.sync && r.sync.heard ? ' | kick-vs-beat median ' + r.sync.heard.median + ' ms, p95|' + r.sync.heard.p95abs + '| ms, matched ' + r.sync.kicksMatched + '/' + r.sync.kicksExpected : ''));
    }
    // UPTEMPO's audio cursor is anchored once, when audio starts, so the offset is fixed within a session (up to clock
    // skew) but can differ between sessions: a few extra sessions measure that spread; the headline stats pool them all.
    const upR = results.find(r => r.id === 'uptempo' && r.sync && r.sync.heard);
    if (upR) {
      const one = (k, sec, sy) => ({ session: k, secs: sec, n: sy.heard.n, matched: sy.kicksMatched + '/' + sy.kicksExpected, medianHeardMs: sy.heard.median, p95absHeardMs: sy.heard.p95abs, sdHeardMs: sy.heard.sd, medianRenderMs: sy.render.median,
        schedVsBeatHeardMs: sy.decomp ? sy.decomp.schedVsBeatHeardMs.median : null, audibleVsSchedMs: sy.decomp ? sy.decomp.audibleVsSchedMs.median : null,
        driftMsPerMin: sy.drift ? sy.drift.slopeMsPerMin : null, driftR2: sy.drift ? sy.drift.r2 : null, skewPpm: sy.clock.audioClockSkewPpm, skewPredictsMsPerMin: sy.drift ? sy.drift.skewPredictsMsPerMin : null, grows: sy.drift ? sy.drift.grows : null,
        heardMinusRenderMs: sy.clock.heardMinusRenderMs, renderQuantMs: sy.clock.renderQuantMs });
      const sess = [one(1, o.secs, upR.sync)];
      const allH = upR.sync.rows.filter(r => r.offHeardMs != null).map(r => r.offHeardMs), allR = upR.sync.rows.filter(r => r.offRenderMs != null).map(r => r.offRenderMs);
      const XS = Math.max(10, Math.min(20, Math.round(o.secs * 0.6)));
      for (let k = 0; k < o.syncRuns; k++) {
        process.stdout.write('uptempo sync session ' + (k + 2) + ' (' + XS + ' s) ... ');
        try {
          const r = await runGame(browser, base, 'uptempo', Object.assign({}, o, { secs: XS, lite: true }), calib);
          if (r.sync && r.sync.heard) {
            sess.push(one(k + 2, XS, r.sync));
            for (const row of r.sync.rows) { if (row.offHeardMs != null) allH.push(row.offHeardMs); if (row.offRenderMs != null) allR.push(row.offRenderMs); }
            console.log('median ' + r.sync.heard.median + ' ms (n ' + r.sync.heard.n + ')' + (r.sync.drift ? ', drift ' + r.sync.drift.slopeMsPerMin + ' ms/min' : ''));
          } else console.log('no result');
        } catch (e) { console.log('failed: ' + e.message); }
      }
      const med = sess.map(z => z.medianHeardMs);
      upR.sync.sessions = sess;
      upR.sync.pooled = { sessions: sess.length, heard: offStats(allH), render: offStats(allR) };
      upR.sync.acrossSessions = { n: sess.length, minMedianMs: round(Math.min(...med), 2), maxMedianMs: round(Math.max(...med), 2), spreadMs: round(Math.max(...med) - Math.min(...med), 2), anyDriftGrows: sess.some(z => z.grows) };
    }
    await renderPlots(browser, results);
    // merge with an existing audio.json when only some games were run
    const jf = path.join(OUT, 'audio.json');
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(jf, 'utf8')); } catch (_) {}
    const byId = Object.assign({}, prev.games || {});
    for (const r of results) byId[r.id] = r;
    const all = ALL.filter(id => byId[id]).map(id => byId[id]).concat(Object.keys(byId).filter(id => !ALL.includes(id)).map(id => byId[id]));
    const meta = { date: new Date().toISOString(), argv: process.argv.slice(2).join(' '), secs: o.secs, unmuted: o.unmuted, browser: browser.version(), sr: (results.find(r => r.sampleRate) || {}).sampleRate };
    fs.writeFileSync(jf, JSON.stringify({ meta, calibration: calib || prev.calibration || null, games: byId }, null, 1));
    printTable(all);
    const up = all.find(r => r.id === 'uptempo' && r.sync && r.sync.heard);
    if (up) {
      const s = up.sync, h = s.pooled ? s.pooled.heard : s.heard;
      console.log('\nUPTEMPO kick vs sim beat (heard clock' + (s.pooled ? ', ' + s.pooled.sessions + ' sessions pooled' : '') + '): mean ' + h.mean + ' ms, median ' + h.median + ' ms, p95|' + h.p95abs + '| ms, n=' + h.n +
        (s.sessions ? '; per-session medians ' + s.sessions.map(z => z.medianHeardMs).join(' / ') + ' ms; drift ms/min ' + s.sessions.map(z => z.driftMsPerMin).join(' / ') + ' (skew-predicted ' + s.sessions.map(z => z.skewPredictsMsPerMin).join(' / ') + ')' : ''));
    }
    writeMarkdown(meta, all, calib || prev.calibration);
    console.log('\nwrote lab/results/audio.json, lab/results/audio.md, lab/results/audio/*.wav|png');
  } finally {
    await browser.close(); srv.close();
  }
}

module.exports = { newTapContext, makeStore, drainInto, assemble, mixContexts, beatSync, calibrate };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
