const FILTERS = [
  { id:'none', label:'なし', css:'none' },
  { id:'soft', label:'ふんわり', css:'brightness(1.04) saturate(.98) contrast(.98)' },
  { id:'sparkle', label:'きらきら', css:'brightness(1.06) saturate(1.14) contrast(1.02)' },
  { id:'film', label:'フィルム', css:'sepia(.18) contrast(.96) saturate(.92) brightness(1.02)' },
  { id:'sunset', label:'ゆうやけ', css:'sepia(.16) saturate(1.12) brightness(1.04) hue-rotate(-10deg)' },
  { id:'sky', label:'そらいろ', css:'brightness(1.02) saturate(.96) hue-rotate(4deg)' },
  { id:'milk', label:'ミルク', css:'brightness(1.1) contrast(.86) saturate(.88)' },
  { id:'clear', label:'はっきり', css:'brightness(1.04) contrast(1.08) saturate(1.03)' },
];
const PASTELS = ['#F9B7D1','#FFC6A8','#FFD96A','#FFF3B4','#D6F5B0','#B7F0D0','#BDEBFF','#BFCBFF','#DCC8FF','#F4C8FF','#FFFFFF','#F4EEE7'];
const STICKERS = ['💗','✨','🎀','🌼','☁️','🍓','🎂','⭐','🐰','🧸','🌙','💌'];

const els = {
  video: document.getElementById('video'),
  previewImage: document.getElementById('previewImage'),
  overlayLayer: document.getElementById('overlayLayer'),
  scratchCanvas: document.getElementById('scratchCanvas'),
  scratchLabel: document.getElementById('scratchLabel'),
  placeholder: document.getElementById('placeholder'),
  stage: document.getElementById('stage'),
  modeBtns: [...document.querySelectorAll('[data-mode-btn]')],
  titleInput: document.getElementById('titleInput'),
  captureBtn: document.getElementById('captureBtn'),
  pickImageBtn: document.getElementById('pickImageBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveSceneBtn: document.getElementById('saveSceneBtn'),
  shareBtn: document.getElementById('shareBtn'),
  openBtn: document.getElementById('openBtn'),
  resetBtn: document.getElementById('resetBtn'),
  imageInput: document.getElementById('imageInput'),
  sceneInput: document.getElementById('sceneInput'),
  cameraError: document.getElementById('cameraError'),
  shareMessage: document.getElementById('shareMessage'),
  textDraft: document.getElementById('textDraft'),
  textSize: document.getElementById('textSize'),
  textMotion: document.getElementById('textMotion'),
  colorChips: document.getElementById('colorChips'),
  addTextBtn: document.getElementById('addTextBtn'),
  stickerChips: document.getElementById('stickerChips'),
  stickerSize: document.getElementById('stickerSize'),
  stickerMotion: document.getElementById('stickerMotion'),
  addStickerBtn: document.getElementById('addStickerBtn'),
  filterChips: document.getElementById('filterChips'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  selectedEmpty: document.getElementById('selectedEmpty'),
  selectedEditor: document.getElementById('selectedEditor'),
  selectedSize: document.getElementById('selectedSize'),
  selectedMotion: document.getElementById('selectedMotion'),
  selectedTextFields: document.getElementById('selectedTextFields'),
  selectedTextValue: document.getElementById('selectedTextValue'),
  selectedColorChips: document.getElementById('selectedColorChips'),
  openPanel: document.getElementById('openPanel'),
  resetScratchBtn: document.getElementById('resetScratchBtn'),
  installBtn: document.getElementById('installBtn'),
  rearCameraBtn: document.getElementById('rearCameraBtn'),
  frontCameraBtn: document.getElementById('frontCameraBtn'),
};

const state = {
  mode: 'capture',
  stream: null,
  capturedImage: '',
  filterId: 'none',
  title: '放課後CAMERA',
  overlays: [],
  selectedId: null,
  selectedColor: PASTELS[0],
  selectedSticker: STICKERS[0],
  openScene: null,
  drag: null,
  deferredInstallPrompt: null,
  scratching: false,
  cameraFacing: 'environment',
};

function uid(){ return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
function clamp(n,min,max){ return Math.min(max, Math.max(min, n)); }
function fileBaseName(title){ return (title || 'houkago-camera').trim().replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龯ー_-]+/g,'-').replace(/^-+|-+$/g,'') || 'houkago-camera'; }
function sceneFileName(title){ return `${fileBaseName(title)}.revecam`; }
function currentFilterCss(id){ return (FILTERS.find(f => f.id === id) || FILTERS[0]).css; }

function setNote(text, isError = false){
  const el = isError ? els.cameraError : els.shareMessage;
  if (!text) {
    el.classList.add('hidden');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
}
function buildScene(){
  if (!state.capturedImage) return null;
  return {
    version: 1,
    title: state.title,
    imageDataUrl: state.capturedImage,
    filter: state.filterId,
    overlays: state.overlays,
    createdAt: new Date().toISOString(),
  };
}
function updateModeButtons(){
  els.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.modeBtn === state.mode));
}
function updateCameraSwitch(){
  els.rearCameraBtn.classList.toggle('active', state.cameraFacing === 'environment');
  els.frontCameraBtn.classList.toggle('active', state.cameraFacing === 'user');
}
async function startCamera(){
  setNote('', true);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setNote('このブラウザではカメラに対応していません。下の「写真を選ぶ」を使ってください。', true);
    return;
  }
  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal: state.cameraFacing } }, audio:false });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    }
    stopCamera();
    state.stream = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track ? track.getSettings() : {};
    if (settings.facingMode === 'user' || state.cameraFacing === 'user') {
      state.cameraFacing = settings.facingMode === 'environment' ? 'environment' : 'user';
    } else {
      state.cameraFacing = settings.facingMode === 'user' ? 'user' : 'environment';
    }
    updateCameraSwitch();
    els.video.srcObject = stream;
    await els.video.play().catch(() => {});
  } catch {
    setNote('カメラが使えないため、写真を選んで試作できます。', true);
  }
}
function stopCamera(){
  if (state.stream) state.stream.getTracks().forEach(track => track.stop());
  state.stream = null;
  els.video.srcObject = null;
}
function captureFromCamera(){
  if (!els.video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = els.video.videoWidth;
  canvas.height = els.video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(els.video, 0, 0, canvas.width, canvas.height);
  state.capturedImage = canvas.toDataURL('image/jpeg', 0.92);
  stopCamera();
  state.mode = 'decorate';
  renderAll();
}
function readImageFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    state.capturedImage = String(reader.result || '');
    state.mode = 'decorate';
    stopCamera();
    renderAll();
  };
  reader.readAsDataURL(file);
}
function resetAll(){
  stopCamera();
  state.mode = 'capture';
  state.capturedImage = '';
  state.overlays = [];
  state.selectedId = null;
  state.openScene = null;
  state.title = '放課後CAMERA';
  state.filterId = 'none';
  els.titleInput.value = state.title;
  updateCameraSwitch();
  setNote('');
  setNote('', true);
  renderAll();
  startCamera();
}
function saveDataUrl(dataUrl, filename){
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function exportComposedImage(){
  const scene = buildScene();
  if (!scene) return;
  const baseImage = await loadImage(scene.imageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = baseImage.naturalWidth || 1080;
  canvas.height = baseImage.naturalHeight || 1440;
  const ctx = canvas.getContext('2d');
  const previewWidth = 320;
  const scale = canvas.width / previewWidth;
  ctx.filter = currentFilterCss(scene.filter);
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  scene.overlays.forEach(item => {
    const x = item.x * canvas.width;
    const y = item.y * canvas.height;
    const size = item.size * scale;
    if (item.kind === 'text') {
      ctx.save();
      ctx.font = `700 ${size}px Arial, sans-serif`;
      ctx.fillStyle = item.color;
      ctx.shadowColor = 'rgba(255,255,255,.72)';
      ctx.shadowBlur = Math.max(2, size * .08);
      ctx.fillText(item.value, x, y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = `${size}px Arial, sans-serif`;
      ctx.fillText(item.value, x, y);
      ctx.restore();
    }
  });
  saveDataUrl(canvas.toDataURL('image/png'), `${fileBaseName(scene.title)}.png`);
  setNote(`画像で保存しました: ${fileBaseName(scene.title)}.png`);
}
function saveScene(){
  const scene = buildScene();
  if (!scene) return;
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sceneFileName(scene.title);
  a.click();
  URL.revokeObjectURL(url);
  setNote(`このアプリで開く用を保存しました: ${sceneFileName(scene.title)}`);
}
async function shareScene(){
  const scene = buildScene();
  if (!scene) return;
  const file = new File([JSON.stringify(scene, null, 2)], sceneFileName(scene.title), { type:'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files:[file] })) {
      await navigator.share({ title:scene.title, text:'このアプリで開く写真を送ります', files:[file] });
      setNote('このアプリで開く用を送る画面を開きました。');
    } else {
      setNote('この端末では送れないため、先に「このアプリで開く用に保存」を使ってください。');
    }
  } catch {
    setNote('送信はキャンセルされました。');
  }
}
function openSceneFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      if (!parsed.imageDataUrl || !Array.isArray(parsed.overlays)) throw new Error('invalid');
      state.openScene = parsed;
      state.mode = 'open';
      renderAll();
    } catch {
      setNote('このアプリ用データを読み込めませんでした。');
    }
  };
  reader.readAsText(file);
}
function renderColorChips(root, selectedColor, onSelect){
  root.innerHTML = '';
  PASTELS.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'color-chip' + (selectedColor === color ? ' active' : '');
    btn.style.background = color;
    btn.addEventListener('click', () => onSelect(color));
    root.appendChild(btn);
  });
}
function renderStickerChips(){
  els.stickerChips.innerHTML = '';
  STICKERS.forEach(sticker => {
    const btn = document.createElement('button');
    btn.className = 'sticker-chip' + (state.selectedSticker === sticker ? ' active' : '');
    btn.textContent = sticker;
    btn.style.fontSize = '26px';
    btn.addEventListener('click', () => {
      state.selectedSticker = sticker;
      renderStickerChips();
    });
    els.stickerChips.appendChild(btn);
  });
}
function renderFilterChips(){
  els.filterChips.innerHTML = '';
  FILTERS.forEach(filter => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (state.filterId === filter.id ? ' active' : '');
    btn.textContent = filter.label;
    btn.addEventListener('click', () => {
      state.filterId = filter.id;
      renderFilterChips();
      renderPreview();
    });
    els.filterChips.appendChild(btn);
  });
}
function addText(){
  if (!state.capturedImage || !els.textDraft.value.trim()) return;
  const item = {
    id: uid(), kind:'text', x:.5, y:.8,
    size:Number(els.textSize.value), color:state.selectedColor,
    motion:els.textMotion.value, value:els.textDraft.value.trim()
  };
  state.overlays.push(item);
  state.selectedId = item.id;
  renderAll();
}
function addSticker(){
  if (!state.capturedImage) return;
  const item = {
    id: uid(), kind:'sticker', x:.78, y:.2,
    size:Number(els.stickerSize.value), motion:els.stickerMotion.value,
    value:state.selectedSticker
  };
  state.overlays.push(item);
  state.selectedId = item.id;
  renderAll();
}
function getSelected(){ return state.overlays.find(item => item.id === state.selectedId) || null; }
function renderSelectedEditor(){
  const selected = getSelected();
  const has = !!selected;
  els.deleteSelectedBtn.disabled = !has;
  els.selectedEmpty.classList.toggle('hidden', has);
  els.selectedEditor.classList.toggle('hidden', !has);
  if (!selected) return;
  els.selectedSize.min = selected.kind === 'text' ? '18' : '26';
  els.selectedSize.max = selected.kind === 'text' ? '52' : '80';
  els.selectedSize.value = String(selected.size);
  els.selectedMotion.value = selected.motion;
  if (selected.kind === 'text') {
    els.selectedTextFields.classList.remove('hidden');
    els.selectedTextValue.value = selected.value;
    renderColorChips(els.selectedColorChips, selected.color, color => {
      selected.color = color;
      renderPreview();
      renderSelectedEditor();
    });
  } else {
    els.selectedTextFields.classList.add('hidden');
  }
}
function renderOverlayLayer(items, selectable){
  els.overlayLayer.innerHTML = '';
  els.overlayLayer.classList.remove('hidden');
  els.overlayLayer.style.pointerEvents = selectable ? 'auto' : 'none';
  items.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = `overlay ${item.kind} motion-${item.motion}` + (selectable && state.selectedId === item.id ? ' selected' : '');
    wrap.style.left = `${item.x * 100}%`;
    wrap.style.top = `${item.y * 100}%`;
    wrap.dataset.id = item.id;
    const span = document.createElement('span');
    span.textContent = item.value;
    span.style.fontSize = `${item.size}px`;
    if (item.kind === 'text') span.style.color = item.color;
    wrap.appendChild(span);

    if (selectable) {
      wrap.addEventListener('pointerdown', e => {
        e.preventDefault();
        state.selectedId = item.id;
        const rect = els.stage.getBoundingClientRect();
        state.drag = {
          id: item.id,
          startX: e.clientX,
          startY: e.clientY,
          baseX: item.x,
          baseY: item.y,
          width: rect.width,
          height: rect.height,
        };
        renderAll();
      });
    } else {
      wrap.style.pointerEvents = 'none';
    }
    els.overlayLayer.appendChild(wrap);
  });
}
function renderPreview(){
  const modeOpen = state.mode === 'open';
  const hasCaptured = !!state.capturedImage;
  const openScene = state.openScene;
  els.overlayLayer.classList.toggle('open-pass', modeOpen);

  els.video.classList.toggle('hidden', !(state.mode === 'capture' && !hasCaptured));
  els.previewImage.classList.toggle('hidden', state.mode === 'capture' && !hasCaptured);
  els.placeholder.classList.add('hidden');
  els.overlayLayer.classList.add('hidden');
  els.scratchCanvas.classList.add('hidden');
  els.scratchLabel.classList.add('hidden');
  els.openPanel.classList.toggle('hidden', !modeOpen || !openScene);

  if (state.mode === 'capture' && !hasCaptured) {
    els.previewImage.classList.add('hidden');
    els.overlayLayer.classList.add('hidden');
    if (!state.stream) startCamera();
    if (state.stream) {
      els.placeholder.classList.add('hidden');
    } else {
      els.placeholder.classList.remove('hidden');
      els.placeholder.textContent = '写真を撮るか、画像を読み込むとここにインスタント写真が出ます。';
    }
    return;
  }

  if (modeOpen) {
    if (!openScene) {
      els.previewImage.classList.add('hidden');
      els.overlayLayer.classList.add('hidden');
      els.placeholder.classList.remove('hidden');
      els.placeholder.textContent = 'このアプリ用データを選ぶと、ここで削って見られます。';
      return;
    }
    els.previewImage.src = openScene.imageDataUrl;
    els.previewImage.style.filter = currentFilterCss(openScene.filter);
    els.previewImage.classList.remove('hidden');
    renderOverlayLayer(openScene.overlays, false);
    els.scratchCanvas.classList.remove('hidden');
    els.scratchLabel.classList.remove('hidden');
    return;
  }

  if (hasCaptured) {
    els.previewImage.src = state.capturedImage;
    els.previewImage.style.filter = currentFilterCss(state.filterId);
    els.previewImage.classList.remove('hidden');
    renderOverlayLayer(state.overlays, true);
    return;
  }

  els.placeholder.classList.remove('hidden');
}
function renderButtons(){
  const canDecorate = !!state.capturedImage;
  els.saveBtn.disabled = !canDecorate;
  els.saveSceneBtn.disabled = !canDecorate;
  els.shareBtn.disabled = !canDecorate;
  els.addTextBtn.disabled = !canDecorate;
  els.addStickerBtn.disabled = !canDecorate;
}
function initScratch(){
  if (!state.openScene) return;
  const canvas = els.scratchCanvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,rect.width,rect.height);
  ctx.fillStyle = '#C8C3BC';
  ctx.fillRect(0,0,rect.width,rect.height);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.arc((rect.width / 8) * (i + 1), rect.height * .2, rect.width * .08, 0, Math.PI * 2);
    ctx.fill();
  }
}
function scratchAt(clientX, clientY){
  const canvas = els.scratchCanvas;
  const rect = canvas.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(34, rect.width * .075), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function renderAll(){
  state.title = els.titleInput.value;
  updateModeButtons();
  updateCameraSwitch();
  renderButtons();
  renderPreview();
  renderSelectedEditor();
  if (state.mode === 'open' && state.openScene) {
    requestAnimationFrame(() => requestAnimationFrame(initScratch));
  }
}
function refreshMainColors(){
  renderColorChips(els.colorChips, state.selectedColor, color => {
    state.selectedColor = color;
    refreshMainColors();
  });
}

async function registerServiceWorker(){
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch {}
  }
}
function setupInstallPrompt(){
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installBtn.classList.remove('hidden');
  });
  els.installBtn.addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice.catch(() => null);
    state.deferredInstallPrompt = null;
    els.installBtn.classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => {
    els.installBtn.classList.add('hidden');
    state.deferredInstallPrompt = null;
  });
}

els.rearCameraBtn.addEventListener('click', async () => {
  if (state.cameraFacing === 'environment') return;
  state.cameraFacing = 'environment';
  updateCameraSwitch();
  if (state.mode === 'capture' && !state.capturedImage) await startCamera();
});
els.frontCameraBtn.addEventListener('click', async () => {
  if (state.cameraFacing === 'user') return;
  state.cameraFacing = 'user';
  updateCameraSwitch();
  if (state.mode === 'capture' && !state.capturedImage) await startCamera();
});

els.modeBtns.forEach(btn => btn.addEventListener('click', () => {
  state.mode = btn.dataset.modeBtn;
  if (state.mode === 'capture' && !state.capturedImage) startCamera();
  renderAll();
}));
els.captureBtn.addEventListener('click', captureFromCamera);
els.pickImageBtn.addEventListener('click', () => els.imageInput.click());
els.openBtn.addEventListener('click', () => els.sceneInput.click());
els.resetBtn.addEventListener('click', resetAll);
els.saveBtn.addEventListener('click', exportComposedImage);
els.saveSceneBtn.addEventListener('click', saveScene);
els.shareBtn.addEventListener('click', shareScene);
els.addTextBtn.addEventListener('click', addText);
els.addStickerBtn.addEventListener('click', addSticker);
els.imageInput.addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (file) readImageFile(file);
  e.target.value = '';
});
els.sceneInput.addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (file) openSceneFile(file);
  e.target.value = '';
});
els.titleInput.addEventListener('input', () => {
  state.title = els.titleInput.value;
});
els.selectedSize.addEventListener('input', () => {
  const item = getSelected();
  if (!item) return;
  item.size = Number(els.selectedSize.value);
  renderPreview();
});
els.selectedMotion.addEventListener('change', () => {
  const item = getSelected();
  if (!item) return;
  item.motion = els.selectedMotion.value;
  renderPreview();
});
els.selectedTextValue.addEventListener('input', () => {
  const item = getSelected();
  if (!item || item.kind !== 'text') return;
  item.value = els.selectedTextValue.value;
  renderPreview();
});
els.deleteSelectedBtn.addEventListener('click', () => {
  if (!state.selectedId) return;
  state.overlays = state.overlays.filter(item => item.id !== state.selectedId);
  state.selectedId = null;
  renderAll();
});
els.resetScratchBtn.addEventListener('click', initScratch);

window.addEventListener('pointermove', e => {
  if (!state.drag) return;
  const item = state.overlays.find(it => it.id === state.drag.id);
  if (!item) return;
  const dx = (e.clientX - state.drag.startX) / state.drag.width;
  const dy = (e.clientY - state.drag.startY) / state.drag.height;
  item.x = clamp(state.drag.baseX + dx, .05, .95);
  item.y = clamp(state.drag.baseY + dy, .05, .95);
  renderPreview();
  renderSelectedEditor();
});
window.addEventListener('pointerup', () => { state.drag = null; state.scratching = false; });

function scratchStart(clientX, clientY){
  state.scratching = true;
  scratchAt(clientX, clientY);
}
function scratchMove(clientX, clientY){
  if (!state.scratching) return;
  scratchAt(clientX, clientY);
}
function scratchEnd(){
  state.scratching = false;
}

els.scratchCanvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { els.scratchCanvas.setPointerCapture(e.pointerId); } catch {}
  scratchStart(e.clientX, e.clientY);
});
els.scratchCanvas.addEventListener('pointermove', e => {
  e.preventDefault();
  scratchMove(e.clientX, e.clientY);
});
els.scratchCanvas.addEventListener('pointerup', e => {
  try { els.scratchCanvas.releasePointerCapture(e.pointerId); } catch {}
  scratchEnd();
});
els.scratchCanvas.addEventListener('pointercancel', e => {
  try { els.scratchCanvas.releasePointerCapture(e.pointerId); } catch {}
  scratchEnd();
});

els.scratchCanvas.addEventListener('mousedown', e => {
  e.preventDefault();
  scratchStart(e.clientX, e.clientY);
});
window.addEventListener('mousemove', e => {
  scratchMove(e.clientX, e.clientY);
});
window.addEventListener('mouseup', scratchEnd);

els.scratchCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  if (t) scratchStart(t.clientX, t.clientY);
}, { passive:false });
els.scratchCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  if (t) scratchMove(t.clientX, t.clientY);
}, { passive:false });
els.scratchCanvas.addEventListener('touchend', e => {
  e.preventDefault();
  scratchEnd();
}, { passive:false });
els.scratchCanvas.addEventListener('touchcancel', e => {
  e.preventDefault();
  scratchEnd();
}, { passive:false });
window.addEventListener('resize', () => {
  if (state.mode === 'open' && state.openScene) initScratch();
});

refreshMainColors();
renderStickerChips();
renderFilterChips();
renderAll();
startCamera();
registerServiceWorker();
setupInstallPrompt();