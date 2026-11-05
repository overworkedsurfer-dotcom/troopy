// Draws the per-game audio picture on a <canvas> inside a Playwright page and returns a PNG data URL.
// Top: waveform (min/max per pixel column) with the 50 ms RMS envelope; marker strips; bottom: log-frequency spectrogram.
// The function is stringified and evaluated in the page, so it must stay self-contained.
module.exports = function drawAudioPlot(d) {
  const Wd = 1200, Ht = 300, L = 46, R = 8, PW = Wd - L - R;
  const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht;
  const g = cv.getContext('2d');
  g.fillStyle = '#0d0f14'; g.fillRect(0, 0, Wd, Ht);
  const T = d.duration, X = t => L + (t / T) * PW;
  g.font = '11px "DejaVu Sans", Arial, sans-serif'; g.textBaseline = 'middle';
  // title
  g.fillStyle = '#e8ecf4'; g.font = 'bold 12px "DejaVu Sans", Arial, sans-serif'; g.fillText(d.title, L, 9);
  g.font = '11px "DejaVu Sans", Arial, sans-serif';
  g.fillStyle = d.flags.length ? '#ff8a7a' : '#7fd4a0'; g.textAlign = 'right';
  g.fillText(d.flags.length ? 'FLAGS: ' + d.flags.join(', ') : 'no flags', Wd - R, 9); g.textAlign = 'left';

  // ---- level panel: waveform peak per pixel column and 50 ms RMS, on a dBFS scale (-66..0) so quiet games stay visible ----
  const wy0 = 20, wh = 92, DBMIN = -66;
  const Y = v => { const d = v > 0 ? 20 * Math.log10(v) : DBMIN; return wy0 + wh - (Math.max(DBMIN, Math.min(0, d)) - DBMIN) / -DBMIN * wh; };
  g.fillStyle = '#141820'; g.fillRect(L, wy0, PW, wh);
  g.lineWidth = 1; g.font = '10px "DejaVu Sans", Arial, sans-serif';
  for (const dB of [0, -12, -24, -36, -48, -60]) {
    const y = Math.round(wy0 + wh - (dB - DBMIN) / -DBMIN * wh) + 0.5;
    g.strokeStyle = dB === -60 ? '#3d4a63' : '#252c3a'; g.setLineDash(dB === -60 ? [4, 3] : []);
    g.beginPath(); g.moveTo(L, y); g.lineTo(L + PW, y); g.stroke();
    g.fillStyle = '#8b93a7'; g.textAlign = 'right'; g.fillText(String(dB), L - 4, y);
  }
  g.setLineDash([]); g.textAlign = 'left';
  // UPTEMPO: scheduled beats as faint cyan lines through the level panel
  if (d.beats) { g.strokeStyle = 'rgba(77,227,255,0.35)'; for (const t of d.beats) if (t >= 0 && t <= T) { g.beginPath(); g.moveTo(Math.round(X(t)) + 0.5, wy0); g.lineTo(Math.round(X(t)) + 0.5, wy0 + wh); g.stroke(); } }
  const n = d.env.mn.length;
  g.fillStyle = '#4f7fe0';
  for (let i = 0; i < n; i++) {
    const pk = Math.max(Math.abs(d.env.mn[i]), Math.abs(d.env.mx[i])), y = Y(pk);
    g.fillRect(L + i * PW / n, y, Math.max(1, PW / n), wy0 + wh - y);
  }
  // clipped columns in red
  g.fillStyle = '#ff4d4d';
  for (let i = 0; i < n; i++) if (d.env.mx[i] >= 0.999 || d.env.mn[i] <= -0.999) g.fillRect(L + i * PW / n, wy0, Math.max(1, PW / n), 4);
  // RMS envelope
  g.strokeStyle = '#ffb347'; g.lineWidth = 1.3; g.beginPath();
  for (let i = 0; i < n; i++) { const x = L + (i + 0.5) * PW / n, y = Y(d.env.rms[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  g.fillStyle = '#7f9ff0'; g.fillText('peak', 4, wy0 + 8); g.fillStyle = '#ffb347'; g.fillText('rms', 4, wy0 + 20); g.fillStyle = '#8b93a7'; g.fillText('dBFS', 4, wy0 + 32);

  // ---- marker strips: key presses, onsets, (UPTEMPO) beats + kicks ----
  const strips = [['keys', 'rgba(200,200,210,0.75)', d.keys], ['onsets', '#ffe14d', d.onsets]];
  if (d.beats) strips.push(['beats', '#4de3ff', d.beats], ['kicks', '#ff5ad9', d.kicks]);
  let sy = wy0 + wh + 3; const SH = 9;
  for (const [name, col, list] of strips) {
    g.fillStyle = '#141820'; g.fillRect(L, sy, PW, SH);
    g.fillStyle = col; for (const t of list) if (t >= 0 && t <= T) g.fillRect(Math.round(X(t)), sy + 1, 1, SH - 2);
    g.font = '9px "DejaVu Sans", Arial, sans-serif'; g.fillText(name, 4, sy + SH / 2 + 0.5);
    sy += SH + 1;
  }
  g.font = '10px "DejaVu Sans", Arial, sans-serif';
  const specTop = sy + 2;

  // ---- spectrogram ----
  const sh = Ht - 16 - specTop, sp = d.spec;
  const raw = atob(sp.img), img = g.createImageData(sp.cols, sp.rows);
  // compact "inferno"-like ramp
  const stops = [[0, 0, 0, 4], [0.25, 60, 12, 100], [0.5, 170, 40, 90], [0.75, 245, 125, 20], [1, 252, 250, 170]];
  const lut = [];
  for (let i = 0; i < 256; i++) {
    const u = i / 255; let k = 0; while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1], f = (u - a[0]) / (b[0] - a[0]);
    lut.push([a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]);
  }
  for (let i = 0; i < raw.length; i++) { const c = lut[raw.charCodeAt(i)], o = i * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
  const tmp = document.createElement('canvas'); tmp.width = sp.cols; tmp.height = sp.rows; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(tmp, 0, 0, sp.cols, sp.rows, L, specTop, PW * (sp.cols * sp.hopS / T), sh);
  // onset ticks at the top edge of the spectrogram
  g.fillStyle = 'rgba(255,225,77,0.9)'; for (const t of d.onsets) g.fillRect(X(t), specTop, 1, 4);
  // frequency labels (log axis)
  g.fillStyle = '#8b93a7'; g.textAlign = 'right'; g.strokeStyle = 'rgba(255,255,255,0.12)';
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) {
    if (f < sp.fmin || f > sp.fmax) continue;
    const y = specTop + sh - (Math.log(f / sp.fmin) / Math.log(sp.fmax / sp.fmin)) * sh;
    g.fillText(f >= 1000 ? (f / 1000) + 'k' : String(f), L - 4, y);
    g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(L + 6, y + 0.5); g.stroke();
  }
  g.textAlign = 'left'; g.fillText('Hz', 4, specTop + sh / 2);
  // time axis
  const ay = Ht - 8; g.fillStyle = '#8b93a7'; g.textAlign = 'center';
  const stepS = T > 30 ? 5 : T > 12 ? 2 : 1;
  for (let t = 0; t <= T + 1e-6; t += stepS) { const x = X(t); g.fillRect(x, ay - 7, 1, 3); g.fillText(t + 's', x, ay); }
  g.textAlign = 'left';
  return cv.toDataURL('image/png');
};
