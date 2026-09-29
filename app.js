// 4K Studio web app: AI image upscaling (Real-ESRGAN) and text removal (text detector + LaMa),
// all running in the visitor's browser with onnxruntime-web. Nothing is uploaded anywhere.

const ORT_VERSION = '1.20.1';
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

const MODELS = {
  // Best quality: the same Real-ESRGAN models as the PC app (split into <25 MB parts for GitHub).
  hq_photo: { url: [0, 1, 2, 3, 4, 5, 6].map(i => `models/hq_photo.p${i}`), gpu: true },
  hq_anime: { url: [0, 1].map(i => `models/hq_anime.p${i}`), gpu: true },
  // Fast: compact Real-ESRGAN models.
  photo: { url: 'models/upscale_photo.onnx', gpu: true },
  anime: { url: 'models/upscale_anime.onnx', gpu: true },
  det:   { url: 'models/text_det.onnx', gpu: false },
  lama:  { url: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx', gpu: false },  // ~200 MB
};
const TARGET_LONG_SIDE = 3840;

const $ = id => document.getElementById(id);
const sleep = () => new Promise(r => setTimeout(r, 0));

// ---------- model loading (with download progress + browser cache) ----------
async function fetchModel(url, onProgress) {
  const urls = Array.isArray(url) ? url : [url];  // big models are split into parts
  const key = new URL(urls[0], location.href).href;
  let cache = null;
  try { cache = await caches.open('4k-studio-models-v1'); } catch { /* private mode etc. */ }
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  }
  const chunks = [];
  let loaded = 0;
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    if (!res.ok) throw new Error(`Could not download the AI model (${res.status})`);
    const total = +res.headers.get('content-length') || 0;
    const reader = res.body.getReader();
    let partLoaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      partLoaded += value.length;
      if (total) onProgress?.((i + partLoaded / total) / urls.length);
    }
  }
  const bytes = new Uint8Array(loaded);
  let pos = 0;
  for (const c of chunks) { bytes.set(c, pos); pos += c.length; }
  if (cache) cache.put(key, new Response(bytes)).catch(() => {});
  return bytes;
}

const sessions = {};
async function getSession(key, onProgress, forceWasm = false) {
  const id = key + (forceWasm ? ':wasm' : '');
  if (sessions[id]) return sessions[id];
  const { url, gpu } = MODELS[key];
  const bytes = await fetchModel(url, onProgress);
  const eps = gpu && !forceWasm && 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm'];
  sessions[id] = await ort.InferenceSession.create(bytes, { executionProviders: eps, graphOptimizationLevel: 'all' });
  return sessions[id];
}

// ---------- helpers ----------
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTensor(data, w, h, mean = [0, 0, 0], scale = 1 / 255) {
  // RGBA bytes -> planar float32 [1,3,h,w]
  const n = w * h, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = (data[i * 4] - mean[0]) * scale;
    out[n + i] = (data[i * 4 + 1] - mean[1]) * scale;
    out[2 * n + i] = (data[i * 4 + 2] - mean[2]) * scale;
  }
  return new ort.Tensor('float32', out, [1, 3, h, w]);
}

function tensorToCanvas(t, mul) {
  // planar float32 [1,3,h,w] -> canvas
  const [, , h, w] = t.dims, n = w * h, d = t.data;
  const c = canvasOf(w, h), img = c.getContext('2d').createImageData(w, h);
  for (let i = 0; i < n; i++) {
    img.data[i * 4] = d[i] * mul;
    img.data[i * 4 + 1] = d[n + i] * mul;
    img.data[i * 4 + 2] = d[2 * n + i] * mul;
    img.data[i * 4 + 3] = 255;
  }
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file is not an image the browser can open'));
    img.src = URL.createObjectURL(file);
  });
}

// ---------- AI upscale to 4K ----------
async function upscale(img, modelKey, report, size) {
  // img: <img> or any canvas image source; size: optional exact output [w, h] (used for video frames)
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const scale = size ? size[0] / W : Math.max(W, H) >= TARGET_LONG_SIDE ? 1 : TARGET_LONG_SIDE / Math.max(W, H);
  const OW = size ? size[0] : Math.round(W * scale), OH = size ? size[1] : Math.round(H * scale);
  const out = canvasOf(OW, OH), octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  if (scale === 1) { octx.drawImage(img, 0, 0); return out; }

  report('Loading AI model…', 0);
  let sess = await getSession(modelKey, p => report('Downloading AI model…', p * 100));
  const src = canvasOf(W, H), sctx = src.getContext('2d');
  sctx.drawImage(img, 0, 0);

  const T = 128, PAD = 10;  // tile core + overlap, so tiles blend without seams
  const tiles = [];
  for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) tiles.push([x, y]);
  const started = performance.now();
  for (let i = 0; i < tiles.length; i++) {
    const [x0, y0] = tiles[i];
    const x1 = Math.min(x0 + T, W), y1 = Math.min(y0 + T, H);
    const px0 = Math.max(0, x0 - PAD), py0 = Math.max(0, y0 - PAD);
    const px1 = Math.min(W, x1 + PAD), py1 = Math.min(H, y1 + PAD);
    const tw = px1 - px0, th = py1 - py0;
    const input = toTensor(sctx.getImageData(px0, py0, tw, th).data, tw, th);
    let result;
    try {
      result = (await sess.run({ [sess.inputNames[0]]: input }))[sess.outputNames[0]];
    } catch (e) {
      if (sess === sessions[modelKey]) {  // GPU trouble: retry this tile on the CPU
        sess = await getSession(modelKey, null, true);
        result = (await sess.run({ [sess.inputNames[0]]: input }))[sess.outputNames[0]];
      } else throw e;
    }
    const tile = tensorToCanvas(result, 255);
    const dx = Math.round(x0 * scale), dy = Math.round(y0 * scale);
    octx.drawImage(tile, (x0 - px0) * 4, (y0 - py0) * 4, (x1 - x0) * 4, (y1 - y0) * 4,
                   dx, dy, Math.round(x1 * scale) - dx, Math.round(y1 * scale) - dy);
    const done = i + 1, secs = (performance.now() - started) / 1000;
    report('Enhancing with AI…', done / tiles.length * 100, done < tiles.length ? secs / done * (tiles.length - done) : 0);
    await sleep();
  }
  return out;
}

// ---------- video to 4K (WebCodecs via Mediabunny) ----------
const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.61.0/dist/bundles/mediabunny.min.mjs';

async function videoTo4K(file, mode, report, { res = 2160, fps60 = false } = {}) {
  if (!('VideoEncoder' in window)) throw new Error('This browser can\'t encode video. Use Chrome or Edge on a computer, or the PC app.');
  const MB = await import(MEDIABUNNY_URL);
  const input = new MB.Input({ source: new MB.BlobSource(file), formats: MB.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('No video found in this file');
  const W = track.displayWidth, H = track.displayHeight;
  const long = res === 2160 ? 3840 : 1920;  // 4K: 3840x2160, 1080p: 1920x1080 (portrait videos are turned around)
  const fit = Math.min((W >= H ? long : res) / W, (W >= H ? res : long) / H);
  const OW = Math.round(W * fit / 2) * 2, OH = Math.round(H * fit / 2) * 2;
  if (!(await MB.canEncodeVideo('avc', { width: OW, height: OH }))) {
    throw new Error(`Your browser/graphics card can't encode ${res === 2160 ? '4K' : '1080p'} H.264. Try Chrome or Edge, or use the PC app.`);
  }
  const srcFps = Math.round((await track.computePacketStats(120)).averagePacketRate) || 30;
  const fps = fps60 ? 60 : Math.min(60, srcFps);
  const duration = await input.computeDuration();
  const mbps = (res === 2160 ? 40e6 : 12e6) * fps / 30;
  if (duration * mbps / 8 > 3e9) throw new Error('This video is too long to convert in the browser (it would be over 3 GB). Use the PC app for long videos.');

  // Fast: resize is done by the encoder pipeline on the GPU. AI: every frame through Real-ESRGAN (compact).
  let frameCanvas = null;
  if (mode !== 'fast') {
    report('Loading AI model…', 0);
    await getSession(mode, p => report('Downloading AI model…', p * 100));
  }
  const started = performance.now();
  const aiProcess = async sample => {
    frameCanvas ??= document.createElement('canvas');
    frameCanvas.width = sample.displayWidth; frameCanvas.height = sample.displayHeight;
    sample.draw(frameCanvas.getContext('2d'), 0, 0);
    return upscale(frameCanvas, mode, () => {}, [OW, OH]);
  };

  const output = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
  const conversion = await MB.Conversion.init({
    input, output,
    video: { codec: 'avc', quality: MB.QUALITY_HIGH, frameRate: fps, keyFrameInterval: 1, forceTranscode: true,
             hardwareAcceleration: 'prefer-hardware',
             ...(mode === 'fast' ? { width: OW, height: OH, fit: 'fill' }
                                 : { process: aiProcess, processedWidth: OW, processedHeight: OH }) },
    audio: { codec: 'aac', quality: MB.QUALITY_HIGH, sampleRate: 48000 },
    showWarnings: false,
  });
  if (!conversion.isValid) throw new Error('This video format isn\'t supported in the browser. Try an MP4 file, or use the PC app.');
  conversion.onProgress = p => {
    const secs = (performance.now() - started) / 1000;
    report(mode === 'fast' ? `Converting to ${res === 2160 ? '4K' : '1080p'}…` : 'Enhancing every frame with AI…', p * 100, p > 0.01 ? secs / p * (1 - p) : 0);
  };
  videoTo4K.cancel = () => conversion.cancel();
  await conversion.execute();
  return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), width: OW, height: OH };
}

// ---------- text detection (PP-OCRv3 DB detector) ----------
async function detectText(img) {
  const sess = await getSession('det');
  const W = img.naturalWidth, H = img.naturalHeight;
  const s = Math.min(1, 1280 / Math.max(W, H));
  const iw = Math.max(32, Math.round(W * s / 32) * 32), ih = Math.max(32, Math.round(H * s / 32) * 32);
  const c = canvasOf(iw, ih), ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, iw, ih);
  const input = toTensor(ctx.getImageData(0, 0, iw, ih).data, iw, ih, [122.67891434, 116.66876762, 104.00698793]);
  const prob = (await sess.run({ [sess.inputNames[0]]: input }))[sess.outputNames[0]].data;

  const seen = new Uint8Array(iw * ih), boxes = [], stack = [];
  for (let start = 0; start < iw * ih; start++) {
    if (seen[start] || prob[start] < 0.3) continue;
    let minx = iw, miny = ih, maxx = 0, maxy = 0, count = 0, sum = 0;
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % iw, y = (p / iw) | 0;
      count++; sum += prob[p];
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const q of [p - 1, p + 1, p - iw, p + iw]) {
        if (q < 0 || q >= iw * ih || seen[q] || prob[q] < 0.3) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === iw - 1)) continue;
        seen[q] = 1; stack.push(q);
      }
    }
    if (count < 10 || sum / count < 0.5) continue;
    const w = maxx - minx + 1, h = maxy - miny + 1, d = (w * h * 2.0) / (2 * (w + h));  // "unclip" like DB
    const sx = W / iw, sy = H / ih;
    boxes.push([Math.max(0, (minx - d) * sx), Math.max(0, (miny - d) * sy),
                (w + 2 * d) * sx, (h + 2 * d) * sy].map(Math.round));
  }
  return boxes;
}

// ---------- text removal (LaMa inpainting) ----------
function groupBoxes(boxes, gap) {
  // merge boxes that touch (within `gap` px) into regions [x0,y0,x1,y1]
  let regions = boxes.map(([x, y, w, h]) => [x, y, x + w, y + h]);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i], b = regions[j];
      if (a[0] - gap <= b[2] && b[0] - gap <= a[2] && a[1] - gap <= b[3] && b[1] - gap <= a[3]) {
        regions[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
        regions.splice(j, 1); merged = true; break outer;
      }
    }
  }
  return regions;
}

async function removeText(img, boxes, report) {
  const W = img.naturalWidth, H = img.naturalHeight;
  report('Loading AI model (first time ~200 MB)…', 0);
  const sess = await getSession('lama', p => report('Downloading AI model (first time only)…', p * 100));
  const out = canvasOf(W, H), ctx = out.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const mask = canvasOf(W, H), mctx = mask.getContext('2d');
  mctx.fillStyle = '#fff';
  for (const [x, y, w, h] of boxes) mctx.fillRect(x - 4, y - 4, w + 8, h + 8);

  const regions = groupBoxes(boxes, 8);
  for (let i = 0; i < regions.length; i++) {
    report(`Removing text with AI… (area ${i + 1} of ${regions.length})`, i / regions.length * 100);
    await sleep();
    const [rx0, ry0, rx1, ry1] = regions[i];
    const pad = Math.max(Math.min(rx1 - rx0, ry1 - ry0), 48);
    const x0 = Math.max(0, Math.floor(rx0 - pad)), y0 = Math.max(0, Math.floor(ry0 - pad));
    const x1 = Math.min(W, Math.ceil(rx1 + pad)), y1 = Math.min(H, Math.ceil(ry1 + pad));
    const cw = x1 - x0, ch = y1 - y0;

    const im = canvasOf(512, 512), ictx = im.getContext('2d');
    ictx.drawImage(out, x0, y0, cw, ch, 0, 0, 512, 512);
    const mk = canvasOf(512, 512), kctx = mk.getContext('2d');
    kctx.imageSmoothingEnabled = false;
    kctx.drawImage(mask, x0, y0, cw, ch, 0, 0, 512, 512);
    const md = kctx.getImageData(0, 0, 512, 512).data, m = new Float32Array(512 * 512);
    for (let p = 0; p < m.length; p++) if (md[p * 4 + 3] > 0) {  // mark + 1px dilation
      const x = p % 512, y = (p / 512) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < 512 && yy < 512) m[yy * 512 + xx] = 1;
      }
    }
    const feeds = {
      [sess.inputNames[0]]: toTensor(ictx.getImageData(0, 0, 512, 512).data, 512, 512),
      [sess.inputNames[1]]: new ort.Tensor('float32', m, [1, 1, 512, 512]),
    };
    const result = (await sess.run(feeds))[sess.outputNames[0]];
    const filled = canvasOf(cw, ch), fctx = filled.getContext('2d');
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(tensorToCanvas(result, 1), 0, 0, 512, 512, 0, 0, cw, ch);

    // paste only the masked pixels back
    const orig = ctx.getImageData(x0, y0, cw, ch), fill = fctx.getImageData(0, 0, cw, ch).data;
    const mm = mctx.getImageData(x0, y0, cw, ch).data;
    for (let p = 0; p < cw * ch; p++) if (mm[p * 4 + 3] > 0) {
      orig.data[p * 4] = fill[p * 4]; orig.data[p * 4 + 1] = fill[p * 4 + 1]; orig.data[p * 4 + 2] = fill[p * 4 + 2];
    }
    ctx.putImageData(orig, x0, y0);
  }
  return out;
}

// ---------- UI ----------
function progressUI(el) {
  el.hidden = false;
  el.innerHTML = `<div class="bar"><i></i></div><div class="line"><span class="ph"></span><span class="pc"></span></div>`;
  return (label, pct, eta) => {
    el.querySelector('.bar i').style.width = pct + '%';
    el.querySelector('.ph').textContent = label + (eta > 3 ? ` · about ${Math.ceil(eta)}s left` : '');
    el.querySelector('.pc').textContent = pct.toFixed(0) + '%';
  };
}

function showResult(el, canvas, name, beforeImg) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    el.hidden = false;
    el.innerHTML = `
      <div class="compare">
        <img class="after" src="${url}" alt="Result">
        <div class="before-wrap"><img class="before" src="${beforeImg.src}" alt="Original"></div>
        <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
        <span class="tag l">Before</span><span class="tag r">After</span>
      </div>
      <div class="line" style="margin-top:10px"><span>✅ ${canvas.width}×${canvas.height} · ${(blob.size / 1e6).toFixed(1)} MB</span></div>
      <div class="actions"><a class="btn" download="${name}" href="${url}">⬇ Download PNG</a>
        <button class="btn ghost" type="button" onclick="location.reload()">Another image</button></div>`;
    const range = el.querySelector('input'), wrap = el.querySelector('.before-wrap');
    const set = () => { wrap.style.width = range.value + '%'; };
    range.oninput = set; set();
  }, 'image/png');
}

function dropZone(zone, input, onFile) {
  zone.onclick = () => input.click();
  input.onchange = () => input.files[0] && onFile(input.files[0]);
  ['dragover', 'dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('over'); }));
  zone.addEventListener('drop', e => e.dataTransfer.files[0] && onFile(e.dataTransfer.files[0]));
}

function fail(el, err) {
  el.hidden = false;
  el.innerHTML = `<p class="err"></p><button class="btn ghost" type="button" onclick="location.reload()">Try again</button>`;
  el.querySelector('.err').textContent = '⚠️ ' + (err.message || err);
}

const baseName = f => f.name.replace(/\.[^.]+$/, '');

// Tabs
document.querySelectorAll('.apptabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.apptabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-' + b.dataset.tab);
});

$('gpu-note').textContent = 'gpu' in navigator ? '⚡ GPU acceleration available' : 'Running on CPU (slower). Chrome or Edge is fastest.';

// Image to 4K
dropZone($('up-drop'), $('up-file'), async file => {
  const report = progressUI($('up-progress'));
  $('up-start').hidden = true;
  try {
    const img = await loadImage(file);
    const type = document.querySelector('input[name=upmodel]:checked').value;
    const best = document.querySelector('input[name=upquality]:checked').value === 'best';
    const model = best ? 'hq_' + type : type;
    const canvas = await upscale(img, model, report);
    $('up-progress').hidden = true;
    showResult($('up-result'), canvas, baseName(file) + '_4K.png', img);
  } catch (e) { $('up-progress').hidden = true; fail($('up-result'), e); }
});

// Video to 4K
let vidFile = null;
dropZone($('vd-drop'), $('vd-file'), file => {
  vidFile = file;
  $('vd-drop').innerHTML = `<b>🎬 ${file.name.replace(/[<>&]/g, '')}</b>${(file.size / 1e6).toFixed(1)} MB · click to choose another`;
  $('vd-go').disabled = false;
});
$('vd-go').onclick = async () => {
  if (!vidFile) return;
  $('vd-start').hidden = true;
  const report = progressUI($('vd-progress'));
  const cancel = document.createElement('button');
  cancel.className = 'btn ghost'; cancel.type = 'button'; cancel.textContent = 'Cancel';
  cancel.onclick = () => { videoTo4K.cancel?.(); location.reload(); };
  $('vd-progress').appendChild(cancel);
  try {
    const mode = document.querySelector('input[name=vdmode]:checked').value;
    const res = +document.querySelector('input[name=vdres]:checked').value;
    const fps60 = document.querySelector('input[name=vdfps]:checked').value === '60';
    const { blob, width, height } = await videoTo4K(vidFile, mode, report, { res, fps60 });
    $('vd-progress').hidden = true;
    const url = URL.createObjectURL(blob);
    const el = $('vd-result');
    el.hidden = false;
    el.innerHTML = `<video src="${url}" controls style="width:100%;border-radius:10px;background:#000"></video>
      <div class="line" style="margin-top:10px"><span>✅ ${width}×${height} · H.264 MP4 · ${(blob.size / 1e6).toFixed(1)} MB</span></div>
      <div class="actions"><a class="btn" download="${baseName(vidFile)}_${res === 2160 ? '4K' : '1080p'}${fps60 ? '60' : ''}.mp4" href="${url}">⬇ Download video</a>
        <button class="btn ghost" type="button" onclick="location.reload()">Another video</button></div>`;
  } catch (e) { $('vd-progress').hidden = true; fail($('vd-result'), e); }
};

// Remove text
let txImg = null, txFile = null, boxes = [];
dropZone($('tx-drop'), $('tx-file'), async file => {
  try {
    txImg = await loadImage(file); txFile = file;
  } catch (e) { return fail($('tx-result'), e); }
  $('tx-drop').hidden = true;
  $('tx-edit').hidden = false;
  $('stage-img').src = txImg.src;
  boxes = []; drawBoxes();
});

function drawBoxes() {
  const W = txImg.naturalWidth, H = txImg.naturalHeight;
  document.querySelectorAll('#stage .box').forEach(b => b.remove());
  boxes.forEach((b, i) => {
    const d = document.createElement('div');
    d.className = 'box';
    Object.assign(d.style, { left: b[0] / W * 100 + '%', top: b[1] / H * 100 + '%', width: b[2] / W * 100 + '%', height: b[3] / H * 100 + '%' });
    d.title = 'Click to remove this mark';
    d.onpointerdown = e => e.stopPropagation();
    d.onclick = () => { boxes.splice(i, 1); drawBoxes(); };
    $('stage').appendChild(d);
  });
  $('box-count').textContent = boxes.length + (boxes.length === 1 ? ' mark' : ' marks');
}

(() => {
  const stage = $('stage');
  let start = null, ghost = null;
  const pt = e => {
    const r = $('stage-img').getBoundingClientRect(), W = txImg.naturalWidth, H = txImg.naturalHeight;
    return [Math.max(0, Math.min(r.width, e.clientX - r.left)) * W / r.width, Math.max(0, Math.min(r.height, e.clientY - r.top)) * H / r.height];
  };
  const pct = (v, total) => v / total * 100 + '%';
  stage.onpointerdown = e => {
    if (!txImg) return;
    stage.setPointerCapture(e.pointerId);
    start = pt(e);
    ghost = document.createElement('div'); ghost.className = 'box'; stage.appendChild(ghost);
  };
  stage.onpointermove = e => {
    if (!start) return;
    const [x, y] = pt(e), W = txImg.naturalWidth, H = txImg.naturalHeight;
    Object.assign(ghost.style, { left: pct(Math.min(x, start[0]), W), top: pct(Math.min(y, start[1]), H),
      width: pct(Math.abs(x - start[0]), W), height: pct(Math.abs(y - start[1]), H) });
  };
  stage.onpointerup = e => {
    if (!start) return;
    const [x, y] = pt(e);
    const b = [Math.min(x, start[0]), Math.min(y, start[1]), Math.abs(x - start[0]), Math.abs(y - start[1])].map(Math.round);
    start = null; ghost.remove();
    if (b[2] > 3 && b[3] > 3) boxes.push(b);
    drawBoxes();
  };
})();

$('auto-detect').onclick = async () => {
  const btn = $('auto-detect');
  btn.disabled = true; btn.textContent = '🔍 Detecting…';
  try {
    const found = await detectText(txImg);
    if (!found.length) alert('No text found. You can mark it manually by dragging over it.');
    boxes = boxes.concat(found); drawBoxes();
  } catch (e) { alert(e.message || e); }
  btn.disabled = false; btn.textContent = '🔍 Auto-detect text';
};
$('clear-boxes').onclick = () => { boxes = []; drawBoxes(); };
$('tx-go').onclick = async () => {
  if (!boxes.length) return alert('Mark the text first (drag over it, or click Auto-detect)');
  $('tx-edit').hidden = true;
  const report = progressUI($('tx-progress'));
  try {
    const canvas = await removeText(txImg, boxes, report);
    $('tx-progress').hidden = true;
    showResult($('tx-result'), canvas, baseName(txFile) + '_clean.png', txImg);
  } catch (e) { $('tx-progress').hidden = true; fail($('tx-result'), e); }
};
