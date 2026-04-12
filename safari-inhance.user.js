// ==UserScript==
// @name         ImgInHance
// @namespace    lucdesign.at
// @version      1.1.1
// @description  Inline image enhancement via auto-levels — applies canvas-based histogram correction to all images on a page whose histogram is suboptimal. Toggle via floating button.
// @author       lucdesign
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const MIN_QUALITY   = 0.9;
  const CLIP_PERCENT  = 0.05;
  const MIN_DIMENSION = 32;
  const STORAGE_KEY   = 'inhance_enabled';

  const imageMap = new Map();
  const inFlight = new Set();
  let   enabled  = (localStorage.getItem(STORAGE_KEY) !== 'false');

  // ─── ORIGIN CHECK ─────────────────────────────────────────────────────────────

  function isCrossOrigin(img) {
    const src = img.src;
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
    try { return new URL(src).origin !== window.location.origin; }
    catch (e) { return false; }
  }

  // ─── CANVAS → BLOB URL ────────────────────────────────────────────────────────
  // Safari: toBlob() (callback), Chrome/FF: convertToBlob() (Promise).
  // Wrap both in a unified Promise returning an object URL.

  function canvasToObjectURL(canvas) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.convertToBlob === 'function') {
        // Chrome / Firefox
        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
          .then(function (blob) { resolve(URL.createObjectURL(blob)); })
          .catch(reject);
      } else if (typeof canvas.toBlob === 'function') {
        // Safari
        canvas.toBlob(function (blob) {
          if (blob) { resolve(URL.createObjectURL(blob)); }
          else { reject(new Error('toBlob returned null')); }
        }, 'image/jpeg', 0.92);
      } else {
        // ultimate fallback — synchronous, blocks main thread
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      }
    });
  }

  // ─── HISTOGRAM / AUTO-LEVELS CORE (ported from CenterImages v7) ───────────────
  //
  // v1.1.x optimizations vs v1.0.0:
  // 1. histData: plain JS arrays → three Int32Array(256)
  // 2. lut: nested arrays → flat Uint8ClampedArray(768), lut[ch*256+v]
  // 3. canvas export: async (toBlob/convertToBlob) instead of blocking toDataURL

  function analyzeHistogram(pixData) {
    const h0 = new Int32Array(256);
    const h1 = new Int32Array(256);
    const h2 = new Int32Array(256);

    let pointer = pixData.length;
    while (pointer--) {
      h2[pixData[--pointer]]++;
      h1[pixData[--pointer]]++;
      h0[pixData[--pointer]]++;
    }

    const maxClipping = Math.floor((pixData.length / 400) * CLIP_PERCENT);
    const clipping = [];
    for (let ch = 0; ch < 3; ch++) {
      const h = ch === 0 ? h0 : ch === 1 ? h1 : h2;
      let dark = 0, light = 0, minimum = 0, maximum = 255;
      while (dark  <= maxClipping) { dark  += h[minimum++]; }
      while (light <= maxClipping) { light += h[maximum--]; }
      clipping[ch] = { lower: minimum, upper: maximum };
    }

    let quality = 1;
    const factor = [];
    for (let ch = 0; ch < 3; ch++) {
      const range = clipping[ch].upper - clipping[ch].lower + 1;
      factor[ch]  = 256 / range;
      quality    /= factor[ch];
    }

    return { isDull: quality < MIN_QUALITY, clipping, factor };
  }

  function colorCorrect(imageData, clipping, factor) {
    const lut  = new Uint8ClampedArray(768);
    const data = imageData.data;

    for (let ch = 0; ch < 3; ch++) {
      const base = ch * 256;
      const lo   = clipping[ch].lower;
      const f    = factor[ch];
      for (let v = 0; v < 256; v++) {
        lut[base + v] = (v - lo) * f;
      }
    }

    let pointer = data.length;
    while (pointer--) {
      data[--pointer] = lut[512 + data[pointer--]]; // ch2
      data[pointer]   = lut[256 + data[pointer--]]; // ch1
      data[pointer]   = lut[       data[pointer]];  // ch0
    }

    return imageData;
  }

  // ─── CANVAS PROCESSING ────────────────────────────────────────────────────────

  async function processImageData(img, sourceImg) {
    const w = sourceImg.naturalWidth  || sourceImg.width;
    const h = sourceImg.naturalHeight || sourceImg.height;
    if (!w || !h || w < MIN_DIMENSION || h < MIN_DIMENSION) return;

    let canvas, ctx, imageData;
    try {
      canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      ctx = canvas.getContext('2d');
      ctx.drawImage(sourceImg, 0, 0);
      imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) { return; }

    const { isDull, clipping, factor } = analyzeHistogram(imageData.data);
    if (!isDull) return;

    colorCorrect(imageData, clipping, factor);
    ctx.putImageData(imageData, 0, 0);

    let enhancedSrc;
    try {
      enhancedSrc = await canvasToObjectURL(canvas);
    } catch (e) { return; }

    imageMap.set(img, {
      originalSrc:    img.src,
      originalSrcset: img.srcset || '',
      enhancedSrc,
      enhanced: false
    });
    if (enabled) applyEnhancement(img, true);
  }

  // ─── GM_xmlhttpRequest FETCH (bypasses CORS) ──────────────────────────────────

  function fetchViaTampermonkey(img) {
    const url = img.src;
    inFlight.add(img);
    GM_xmlhttpRequest({
      method:       'GET',
      url:          url,
      responseType: 'arraybuffer',
      onload: function (res) {
        inFlight.delete(img);
        if (res.status < 200 || res.status >= 300) return;
        const currentSrc = img.src;
        if (currentSrc !== url &&
            !currentSrc.startsWith('data:') &&
            !currentSrc.startsWith('blob:')) return;
        const blob    = new Blob([res.response]);
        const blobUrl = URL.createObjectURL(blob);
        const probe   = new Image();
        probe.onload  = function () {
          processImageData(img, probe);
          URL.revokeObjectURL(blobUrl);
        };
        probe.onerror = function () { URL.revokeObjectURL(blobUrl); };
        probe.src     = blobUrl;
      },
      onerror: function () { inFlight.delete(img); }
    });
  }

  function processImage(img) {
    if (imageMap.has(img) || inFlight.has(img)) return;
    if (img.src.startsWith('data:') || img.src.startsWith('blob:')) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h || w < MIN_DIMENSION || h < MIN_DIMENSION) return;
    if (!isCrossOrigin(img)) {
      processImageData(img, img);
    } else {
      fetchViaTampermonkey(img);
    }
  }

  function tryProcessImage(img) {
    if (img.complete && img.naturalWidth > 0) {
      processImage(img);
    } else {
      img.addEventListener('load', () => processImage(img), { once: true });
    }
  }

  // ─── APPLY / REVERT ───────────────────────────────────────────────────────────

  function applyEnhancement(img, on) {
    const entry = imageMap.get(img);
    if (!entry) return;
    observer.disconnect();
    if (on && !entry.enhanced) {
      img.srcset   = '';
      img.src      = entry.enhancedSrc;
      entry.enhanced = true;
    } else if (!on && entry.enhanced) {
      img.src      = entry.originalSrc;
      img.srcset   = entry.originalSrcset;
      entry.enhanced = false;
    }
    observer.observe(document.body, observerConfig);
  }

  function processAll() {
    document.querySelectorAll('img').forEach(tryProcessImage);
  }

  function setEnabled(value) {
    enabled = value;
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    imageMap.forEach((entry, img) => applyEnhancement(img, value));
    updateButton();
  }

  // ─── MUTATION OBSERVER ────────────────────────────────────────────────────────

  const observerConfig = {
    childList:       true,
    subtree:         true,
    attributes:      true,
    attributeFilter: ['src', 'srcset']
  };

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.target.tagName === 'IMG') {
        const img = m.target;
        if (imageMap.has(img)) {
          const entry = imageMap.get(img);
          if (enabled) {
            entry.enhanced = false;
            requestAnimationFrame(() => applyEnhancement(img, true));
          }
        } else {
          tryProcessImage(img);
        }
      } else if (m.type === 'childList') {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const imgs = node.tagName === 'IMG' ? [node] : [...node.querySelectorAll('img')];
          imgs.forEach(tryProcessImage);
        });
      }
    });
  });

  observer.observe(document.body, observerConfig);

  // ─── FLOATING BUTTON ──────────────────────────────────────────────────────────

  const btn = document.createElement('div');
  btn.id = 'inhance-toggle';
  Object.assign(btn.style, {
    position:       'fixed',
    top:            '14px',
    right:          '14px',
    zIndex:         '2147483647',
    width:          '44px',
    height:         '44px',
    borderRadius:   '50%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    cursor:         'pointer',
    fontSize:       '20px',
    boxShadow:      '0 2px 8px rgba(0,0,0,0.35)',
    userSelect:     'none',
    transition:     'background 0.2s, opacity 0.2s',
    fontFamily:     'system-ui, sans-serif',
    lineHeight:     '1'
  });

  function updateButton() {
    btn.title       = enabled ? 'ImgInHance: ON — click to disable' : 'ImgInHance: OFF — click to enable';
    btn.textContent = '✦';
    btn.style.background = enabled ? '#1a73e8' : '#888';
    btn.style.color      = '#fff';
    btn.style.opacity    = enabled ? '1' : '0.7';
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    setEnabled(!enabled);
  });

  updateButton();
  document.body.appendChild(btn);

  processAll();

}());
