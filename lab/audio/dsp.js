// DSP helpers for the audio lab: metrics, onset detection, resampling, WAV, spectrogram. No dependencies.
'use strict';

const db = v => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const round = (v, d = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : v);

// ---------- FFT (in-place, radix-2) ----------
const twiddles = new Map();
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  let tw = twiddles.get(n);
  if (!tw) { tw = { c: new Float64Array(n / 2), s: new Float64Array(n / 2) }; for (let i = 0; i < n / 2; i++) { tw.c[i] = Math.cos(-2 * Math.PI * i / n); tw.s[i] = Math.sin(-2 * Math.PI * i / n); } twiddles.set(n, tw); }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = tw.c[k * step], wi = tw.s[k * step];
        const a = i + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
  }
}
function hann(n) { const w = new Float64Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); return w; }

// magnitude spectra, frames centred at (hop*i), normalised so a full-scale sine peaks near 1
function stft(x, N, hop, cb) {
  const w = hann(N), re = new Float64Array(N), im = new Float64Array(N), norm = 4 / N;
  const frames = Math.max(1, Math.floor(x.length / hop));
  const mag = new Float32Array(N / 2 + 1);
  for (let f = 0; f < frames; f++) {
    const c = f * hop - N / 2;
    for (let i = 0; i < N; i++) { const j = c + i; re[i] = (j >= 0 && j < x.length ? x[j] : 0) * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k <= N / 2; k++) mag[k] = Math.hypot(re[k], im[k]) * norm;
    cb(f, mag);
  }
  return frames;
}

// ---------- biquad (RBJ cookbook) + zero-phase filtering ----------
function biquad(type, f0, sr, Q = Math.SQRT1_2) {
  const w = 2 * Math.PI * f0 / sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * Q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  const a0 = 1 + a;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * c / a0, a2: (1 - a) / a0 };
}
function runBiquad(x, q, rev) {
  const n = x.length, y = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let k = 0; k < n; k++) {
    const i = rev ? n - 1 - k : k, v = x[i];
    const o = q.b0 * v + q.b1 * x1 + q.b2 * x2 - q.a1 * y1 - q.a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o;
  }
  return y;
}
function filtfilt(x, q) { return runBiquad(runBiquad(x, q, false), q, true); }

// ---------- metrics ----------
// x: mono Float32 at sr. opts.activeFrom: sample index from which the player is acting (first key press).
function metrics(x, sr, opts = {}) {
  const n = x.length;
  let peak = 0, sumSq = 0, sum = 0, clip = 0, over1 = 0, nan = 0, inf = 0;
  for (let i = 0; i < n; i++) {
    const v = x[i];
    if (v !== v) { nan++; continue; }
    if (v === Infinity || v === -Infinity) { inf++; continue; }
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    if (a >= 0.999) clip++;
    if (a > 1) over1++;
    sumSq += v * v; sum += v;
  }
  const good = Math.max(1, n - nan - inf);
  const rms = Math.sqrt(sumSq / good), dc = sum / good;
  // 50 ms windows: silence below -60 dBFS
  const W = Math.round(sr * 0.05), from = Math.max(0, Math.min(n, opts.activeFrom || 0));
  const win = [];
  for (let s = from; s + W <= n; s += W) {
    let e = 0; for (let i = s; i < s + W; i++) { const v = x[i]; if (v === v && Number.isFinite(v)) e += v * v; }
    win.push(Math.sqrt(e / W));
  }
  const thr = Math.pow(10, -60 / 20);
  let silent = 0, run = 0, longest = 0, actSq = 0, actN = 0;
  for (const r of win) {
    if (r < thr) { silent++; run++; if (run > longest) longest = run; } else { run = 0; actSq += r * r; actN++; }
  }
  // DC per 1 s window (catches a transient offset that the global mean averages away)
  let dcMax = 0; const S1 = sr;
  for (let s = 0; s + S1 <= n; s += S1) { let m = 0; for (let i = s; i < s + S1; i++) { const v = x[i]; if (v === v && Number.isFinite(v)) m += v; } dcMax = Math.max(dcMax, Math.abs(m / S1)); }
  const activeRms = actN ? Math.sqrt(actSq / actN) : 0;
  return {
    samples: n, peak, peakDb: db(peak), rms, rmsDb: db(rms), activeRmsDb: db(activeRms),
    clipPct: 100 * clip / Math.max(1, n), over1, crestDb: rms > 0 ? db(peak / rms) : null, activeCrestDb: activeRms > 0 ? db(peak / activeRms) : null,
    dc, dcMax1s: dcMax, nan, inf,
    windows: win.length, silencePct: win.length ? 100 * silent / win.length : 100, longestSilenceS: longest * 0.05,
  };
}

// ---------- onset detection (spectral flux, for counting discrete sound events) ----------
// Log-compressed magnitude flux (half-wave rectified), adaptive median threshold, peak picking with a 60 ms refractory gap.
// Frames whose level is below -60 dBFS cannot fire (keeps reverb tails and the noise floor from counting).
function fluxOnsets(x, sr, opts = {}) {
  const N = 1024, hop = 256, gamma = 1000;
  const prev = new Float32Array(N / 2 + 1);
  const flux = [], lvl = [];
  const kLo = Math.max(1, Math.floor(40 * N / sr));
  let first = true;
  stft(x, N, hop, (f, mag) => {
    let fl = 0, e = 0;
    for (let k = kLo; k <= N / 2; k++) {
      const v = Math.log1p(gamma * mag[k]);
      const d = v - prev[k]; if (d > 0 && !first) fl += d;
      prev[k] = v; e += mag[k] * mag[k];
    }
    first = false;
    flux.push(fl); lvl.push(Math.sqrt(e / 2));   // ~RMS-ish level of the frame
  });
  const n = flux.length, half = Math.round(0.25 * sr / hop);   // ±250 ms median window
  const out = [], gap = Math.round((opts.minGapS || 0.06) * sr / hop), lvlThr = Math.pow(10, -60 / 20);
  // global scale: the flux of a "real" event; median of the top 5 % of nonzero frames
  const nz = flux.filter(v => v > 0).sort((a, b) => a - b);
  const ref = nz.length ? nz[Math.floor(nz.length * 0.95)] : 0;
  const delta = Math.max(ref * 0.08, 2);
  let last = -1e9;
  const buf = [];
  for (let i = 1; i < n - 1; i++) {
    if (!(flux[i] >= flux[i - 1] && flux[i] > flux[i + 1])) continue;
    if (lvl[i + 1] < lvlThr && lvl[i] < lvlThr) continue;
    buf.length = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) buf.push(flux[j]);
    buf.sort((a, b) => a - b);
    const med = buf[buf.length >> 1];
    if (flux[i] < med * 1.5 + delta) continue;
    if (i - last < gap) { if (out.length && flux[i] > out[out.length - 1].s) { out[out.length - 1] = { t: i * hop / sr, s: flux[i] }; last = i; } continue; }
    out.push({ t: i * hop / sr, s: flux[i] }); last = i;
  }
  return { onsets: out, hop, flux };
}

// ---------- low-frequency onset detector (the UPTEMPO kick) ----------
// Stage 1, detection: zero-phase 4th-order Butterworth lowpass at 110 Hz (removes hats, snares, leads, most bass
// harmonics), RMS envelope over an 8 ms centred window on a 1 ms grid; a kick is a rise of >= riseDb within 15 ms that
// reaches minDb (70 ms refractory).
// Stage 2, timing: the 110 Hz band is too smeared (the kick starts at 165 Hz and sweeps down) to time the attack, so
// the onset is re-timed on a mild 400 Hz lowpass of the raw signal: the first sample whose |y| exceeds
// floor + 30 % of (peak - floor), searching from 25 ms before the stage-1 hit. For the game's kick (a sine that starts
// at full gain, phase 0) that lands ~0.3 ms after the true start. The lab's calibration pass measures the residual bias.
function lowOnsets(x, sr, opts = {}) {
  const fc = opts.fc || 110;
  const q = biquad('lowpass', fc, sr, 0.5412), q2 = biquad('lowpass', fc, sr, 1.3066);
  const y = filtfilt(filtfilt(x, q), q2);
  const yw = filtfilt(x, biquad('lowpass', 400, sr));
  const ps = new Float64Array(y.length + 1);
  for (let i = 0; i < y.length; i++) ps[i + 1] = ps[i] + y[i] * y[i];
  const half = Math.round(sr * 0.004);
  const pw = i => { const a = Math.max(0, i - half), b = Math.min(y.length, i + half); return (ps[b] - ps[a]) / Math.max(1, b - a); };
  const hop = Math.max(1, Math.round(sr * 0.001)), m = Math.floor(y.length / hop);
  const env = new Float32Array(m); for (let k = 0; k < m; k++) env[k] = Math.sqrt(pw(k * hop));
  const riseDb = opts.riseDb || 10, minAmp = Math.pow(10, (opts.minDb || -30) / 20), look = 15;
  const ms = v => Math.round(v * sr / 1000);
  const out = [];
  let k = look;
  while (k < m - 40) {
    const lo = env[k - look] + 1e-9;
    if (env[k] >= minAmp && db(env[k] / lo) >= riseDb) {
      let pk = 0; for (let j = k; j <= Math.min(m - 1, k + 40); j++) pk = Math.max(pk, env[j]);
      let fl = Infinity; for (let j = Math.max(0, k - look - 15); j <= k - look + 2; j++) fl = Math.min(fl, env[j]);
      const c = k * hop;
      // stage 2 on the wide band
      const a0 = Math.max(0, c - ms(45)), a1 = Math.max(0, c - ms(25));
      const pre = []; for (let i = a0; i < a1; i++) pre.push(Math.abs(yw[i]));
      pre.sort((u, v) => u - v);
      const floor = pre.length ? pre[Math.floor(pre.length * 0.95)] : 0;
      let P = 0; for (let i = a1; i < Math.min(yw.length, c + ms(25)); i++) P = Math.max(P, Math.abs(yw[i]));
      const thr = floor + 0.3 * (P - floor);
      let s = a1; while (s < c + ms(25) && s < yw.length - 1 && Math.abs(yw[s]) < thr) s++;
      out.push({ t: s / sr, peakDb: db(pk), riseDb: db(pk / (fl + 1e-9)) });
      k = Math.max(k + 1, Math.round((s / sr + 0.07) * sr / hop));
      continue;
    }
    k++;
  }
  return { onsets: out, env, hop };
}

// ---------- resampling (windowed sinc) ----------
function resample(x, srIn, srOut) {
  if (srIn === srOut) return Float32Array.from(x);
  const ratio = srOut / srIn, n = Math.floor(x.length * ratio), y = new Float32Array(n);
  const cut = Math.min(1, ratio) * 0.95, taps = 24;
  for (let i = 0; i < n; i++) {
    const t = i / ratio, c = Math.floor(t);
    let acc = 0, ws = 0;
    for (let k = c - taps + 1; k <= c + taps; k++) {
      if (k < 0 || k >= x.length) continue;
      const d = t - k, a = Math.PI * d * cut;
      const sinc = d === 0 ? 1 : Math.sin(a) / a;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * d / (taps + 1));
      const v = x[k]; if (v !== v || !Number.isFinite(v)) continue;
      acc += v * sinc * w; ws += sinc * w;
    }
    y[i] = ws ? acc / ws : 0;
  }
  return y;
}

function wav16(x, sr) {
  const n = x.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { let v = x[i]; if (v !== v) v = 0; v = Math.max(-1, Math.min(1, v)); buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2); }
  return buf;
}

// ---------- plot data ----------
function envelope(x, cols) {
  const per = x.length / cols, mn = new Float32Array(cols), mx = new Float32Array(cols), rms = new Float32Array(cols);
  for (let c = 0; c < cols; c++) {
    const a = Math.floor(c * per), b = Math.max(a + 1, Math.floor((c + 1) * per));
    let lo = 0, hi = 0, e = 0, k = 0;
    for (let i = a; i < b && i < x.length; i++) { const v = x[i]; if (v !== v || !Number.isFinite(v)) continue; if (v < lo) lo = v; if (v > hi) hi = v; e += v * v; k++; }
    mn[c] = lo; mx[c] = hi; rms[c] = k ? Math.sqrt(e / k) : 0;
  }
  return { mn: Array.from(mn), mx: Array.from(mx), rms: Array.from(rms) };
}
// log-frequency spectrogram as a rows x cols byte image (row 0 = top = highest frequency), dB range [-90, 0]
function spectrogram(x, sr, cols, rows, fmin = 40, fmax = 11000) {
  const N = 2048, hop = Math.max(1, Math.floor(x.length / cols));
  const img = new Uint8Array(rows * cols);
  fmax = Math.min(fmax, sr / 2 * 0.98);
  const binOf = f => f * N / sr;
  const edges = []; for (let r = 0; r <= rows; r++) edges.push(binOf(fmin * Math.pow(fmax / fmin, r / rows)));
  stft(x, N, hop, (f, mag) => {
    if (f >= cols) return;
    for (let r = 0; r < rows; r++) {
      const a = edges[r], b = edges[r + 1];
      let v = 0;
      if (b - a < 1) { const k = Math.floor(a), fr = a - k; v = mag[k] * (1 - fr) + mag[Math.min(mag.length - 1, k + 1)] * fr; }
      else { for (let k = Math.floor(a); k <= Math.ceil(b) && k < mag.length; k++) v = Math.max(v, mag[k]); }
      const d = db(v + 1e-12), u = Math.max(0, Math.min(1, (d + 90) / 90));
      img[(rows - 1 - r) * cols + f] = Math.round(u * 255);
    }
  });
  return { img: Buffer.from(img).toString('base64'), rows, cols, fmin, fmax };
}

function quantile(a, p) { const s = a.slice().sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
function linfit(xs, ys) {
  const n = xs.length; if (n < 2) return { a: ys[0] || 0, b: 0, r2: 0 };
  let sx = 0, sy = 0; for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n; let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const b = sxx ? sxy / sxx : 0;
  return { a: my - b * mx, b, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0 };
}

module.exports = { db, round, fft, stft, biquad, filtfilt, metrics, fluxOnsets, lowOnsets, resample, wav16, envelope, spectrogram, quantile, linfit };
