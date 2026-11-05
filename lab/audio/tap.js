// In-page audio tap for the audio lab. Installed with Playwright's addInitScript, so it runs before any game script.
//
// What it does:
//  * Wraps window.AudioContext / webkitAudioContext in a subclass, so every real-time context is registered when it is
//    created (games create theirs lazily on the first keydown/pointerdown).
//  * Patches AudioNode.prototype.connect: any connection to an AudioContext's destination is ALSO teed into a
//    recorder inside that same context. disconnect() is patched to drop the tee when the game drops the destination link.
//  * Recorder graph per context:  [game node] -> tap(Gain 1) -> DelayNode(D s) -> AudioWorkletNode('lab-rec', 0 outputs)
//                                                                  \-> Gain 0 -> destination   (keeps the delay line pulled)
//    The AudioWorklet module comes from a Blob URL and loads asynchronously (~15 ms). The DelayNode pre-buffers the first
//    D seconds, so nothing the game plays before the worklet is ready is lost. The worklet sees graph frame F at its own
//    frame F + D*sr, and the analysis subtracts D exactly (D*sr is an integer number of frames).
//  * The worklet downmixes to mono ((L+R)/2 of the 2-channel "speakers" mix that the destination would receive), stamps
//    every chunk with its AudioWorkletGlobalScope currentFrame, and posts it to the main thread. Render quanta with no
//    active input are recorded as zeros, so the timeline has no holes.
//  * Fallback: if the worklet cannot load, a ScriptProcessorNode does the same job (timestamps from playbackTime).
//  * Also logs: keydown times, and (per animation frame, after the game's own rAF callback) the audio clocks
//    (currentTime, getOutputTimestamp) and, for UPTEMPO, the sim's beat/BPM/time/carry so beats can be mapped to audio time.
module.exports = function installAudioTap(opt) {
  if (window.__audioLab) return;
  const D = opt.delay, CHUNK = opt.chunk;
  const LAB = window.__audioLab = { ctxs: [], keys: [], frames: [], errors: [], game: opt.game, delay: D, installedAt: performance.now() };
  const AC0 = window.AudioContext || window.webkitAudioContext;
  const AN = window.AudioNode;
  if (!AC0 || !AN) { LAB.errors.push('no WebAudio in this browser'); return; }
  const origConnect = AN.prototype.connect, origDisconnect = AN.prototype.disconnect;
  const recs = new WeakMap();
  const err = (where, e) => { if (LAB.errors.length < 50) LAB.errors.push(where + ': ' + (e && e.message || e)); };

  const WSRC = 'class LabRec extends AudioWorkletProcessor {\n' +
    '  constructor(o) { super(); this.n = o.processorOptions.chunk; this.buf = new Float32Array(this.n); this.i = 0; this.f0 = -1; this.q = 128;\n' +
    '    this.port.onmessage = e => { if (e.data === "flush") this.flush(); }; }\n' +
    '  flush() { if (this.i > 0) { const d = this.buf.slice(0, this.i); this.port.postMessage({ f0: this.f0, d }, [d.buffer]); this.f0 += this.i; this.i = 0; } }\n' +
    '  process(inputs) {\n' +
    '    if (!this.warm) { this.warm = true; return true; }   // first call: currentFrame can still read 0 here, skip it\n' +
    '    const inp = inputs[0], L = inp && inp[0], R = inp && inp[1];\n' +
    '    const n = L ? L.length : this.q; this.q = n;\n' +
    '    if (this.f0 < 0) this.f0 = currentFrame;\n' +
    '    else if (this.f0 + this.i !== currentFrame) { this.flush(); this.f0 = currentFrame; }\n' +
    '    for (let k = 0; k < n; k++) {\n' +
    '      this.buf[this.i++] = L ? (R ? (L[k] + R[k]) * 0.5 : L[k]) : 0;\n' +
    '      if (this.i === this.n) { this.port.postMessage({ f0: this.f0, d: this.buf }, [this.buf.buffer]); this.buf = new Float32Array(this.n); this.f0 += this.n; this.i = 0; }\n' +
    '    }\n' +
    '    return true;\n' +
    '  }\n' +
    '}\nregisterProcessor("lab-rec", LabRec);\n';
  let wurl = null;
  try { wurl = URL.createObjectURL(new Blob([WSRC], { type: 'application/javascript' })); } catch (e) { err('blob', e); }

  function ensure(ctx) {
    let r = recs.get(ctx);
    if (r) return r;
    r = { id: LAB.ctxs.length, ctx, sr: ctx.sampleRate, mode: 'pending', chunks: [], teed: 0, frames: 0, createdPerf: performance.now(), createdCtx: ctx.currentTime, node: null };
    recs.set(ctx, r);
    LAB.ctxs.push(r);
    try {
      r.tap = ctx.createGain();
      r.delayNode = ctx.createDelay(D + 0.5); r.delayNode.delayTime.value = D;
      r.sink = ctx.createGain(); r.sink.gain.value = 0;
      origConnect.call(r.tap, r.delayNode);
      origConnect.call(r.delayNode, r.sink);
      origConnect.call(r.sink, ctx.destination);
    } catch (e) { err('tap graph', e); r.mode = 'failed'; return r; }
    const onChunk = m => { const d = m.d; r.chunks.push({ f0: m.f0, d }); r.frames += d.length; };
    const fallback = why => {
      try {
        const N = 4096, sp = ctx.createScriptProcessor(N, 2, 1);
        sp.onaudioprocess = e => {
          const b = e.inputBuffer, L = b.getChannelData(0), R = b.numberOfChannels > 1 ? b.getChannelData(1) : null, d = new Float32Array(L.length);
          for (let i = 0; i < L.length; i++) d[i] = R ? (L[i] + R[i]) * 0.5 : L[i];
          // approximate stamp: Chromium hands a ScriptProcessor the input block that ended ~one buffer before playbackTime
          onChunk({ f0: Math.round(e.playbackTime * ctx.sampleRate) - 2 * N, d });
        };
        const z = ctx.createGain(); z.gain.value = 0;
        origConnect.call(r.delayNode, sp); origConnect.call(sp, z); origConnect.call(z, ctx.destination);
        r.node = sp; r.mode = 'scriptprocessor'; r.fallbackWhy = String(why && why.message || why);
      } catch (e) { err('scriptprocessor', e); r.mode = 'failed'; }
    };
    try {
      if (!ctx.audioWorklet || !wurl) throw new Error('no audioWorklet');
      ctx.audioWorklet.addModule(wurl).then(() => {
        const n = new AudioWorkletNode(ctx, 'lab-rec', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers', processorOptions: { chunk: CHUNK } });
        n.port.onmessage = e => onChunk(e.data);
        origConnect.call(r.delayNode, n);
        r.node = n; r.mode = 'worklet'; r.readyPerf = performance.now(); r.readyCtx = ctx.currentTime;
      }).catch(fallback);
    } catch (e) { fallback(e); }
    return r;
  }

  // 1) register every real-time context at construction
  function wrap(C) {
    class LabAudioContext extends C { constructor(...a) { super(...a); try { ensure(this); } catch (e) { err('ensure', e); } } }
    return LabAudioContext;
  }
  try {
    const W = wrap(AC0);
    window.AudioContext = W;
    if (window.webkitAudioContext) window.webkitAudioContext = W;
  } catch (e) { err('wrap ctor', e); }

  // 2) tee every connection to a destination
  AN.prototype.connect = function (dest, output, input) {
    const res = origConnect.apply(this, arguments);
    try {
      if (dest && typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && dest.context instanceof AC0) {
        const r = ensure(dest.context);
        if (r.tap && this !== r.sink && this !== r.node) { origConnect.call(this, r.tap, output || 0); r.teed++; }
      }
    } catch (e) { err('tee', e); }
    return res;
  };
  AN.prototype.disconnect = function (dest) {
    const res = origDisconnect.apply(this, arguments);
    try {
      if (dest && typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && dest.context instanceof AC0) {
        const r = recs.get(dest.context);
        if (r && r.tap) { try { origDisconnect.call(this, r.tap); } catch (_) {} }
      }
    } catch (e) { err('untee', e); }
    return res;
  };

  // 3) input log (capture phase, before the game's own listeners)
  const keyLog = e => {
    const c = LAB.ctxs[0];
    LAB.keys.push([performance.now(), e.type === 'keydown' ? 1 : 0, e.code, c ? c.ctx.currentTime : null]);
  };
  addEventListener('keydown', keyLog, true);
  addEventListener('keyup', keyLog, true);

  // 4) per-frame clock + sim log, sampled right after the game's own rAF callback
  const origRAF = window.requestAnimationFrame.bind(window);
  let lastTs = -1;
  LAB.sampleFrame = function (ts) {
    if (ts === lastTs) return; lastTs = ts;
    const c = LAB.ctxs[0];
    const pnow = performance.now();
    let ct = null, oc = null, op = null;
    if (c) { ct = c.ctx.currentTime; try { const o = c.ctx.getOutputTimestamp(); oc = o.contextTime; op = o.performanceTime; } catch (_) {} }
    const row = [ts, pnow, ct, oc, op];
    if (LAB.game === 'uptempo' && window.__game) {
      try {
        const sn = window.__game.snapshot(), S = sn.S;
        row.push(S.t, sn.carry, S.beat, S.bpm, S.freeze, S.over ? 1 : 0, S.hp);
      } catch (_) {}
    }
    if (LAB.frames.length < 200000) LAB.frames.push(row);
  };
  window.requestAnimationFrame = function (cb) {
    return origRAF(function (ts) { try { cb(ts); } finally { try { LAB.sampleFrame(ts); } catch (_) {} } });
  };

  // 5) drain: hand captured audio to Node (base64 Float32 per context)
  function b64(u8) { let s = ''; const B = 0x8000; for (let i = 0; i < u8.length; i += B) s += String.fromCharCode.apply(null, u8.subarray(i, i + B)); return btoa(s); }
  LAB.flush = function () { for (const r of LAB.ctxs) if (r.node && r.mode === 'worklet') try { r.node.port.postMessage('flush'); } catch (_) {} };
  LAB.drain = function () {
    const out = [];
    for (const r of LAB.ctxs) {
      const ch = r.chunks; r.chunks = [];
      const parts = [];
      for (const c of ch) {
        const last = parts[parts.length - 1];
        if (last && last.f0 + last.n === c.f0) { last.list.push(c.d); last.n += c.d.length; } else parts.push({ f0: c.f0, n: c.d.length, list: [c.d] });
      }
      for (const p of parts) {
        const a = new Float32Array(p.n); let o = 0; for (const d of p.list) { a.set(d, o); o += d.length; }
        out.push({ ctx: r.id, f0: p.f0, n: p.n, b64: b64(new Uint8Array(a.buffer)) });
      }
    }
    return out;
  };
  LAB.info = function () {
    return LAB.ctxs.map(r => ({ id: r.id, sr: r.sr, mode: r.mode, teed: r.teed, frames: r.frames, state: r.ctx.state, createdPerf: r.createdPerf, createdCtx: r.createdCtx,
      readyPerf: r.readyPerf || null, readyCtx: r.readyCtx || null, outputLatency: r.ctx.outputLatency || 0, baseLatency: r.ctx.baseLatency || 0, fallbackWhy: r.fallbackWhy || null }));
  };
};
