// popup.js v6

const statusPill    = document.getElementById('status-pill');
const deletedCount  = document.getElementById('deleted-count');
const errorCount    = document.getElementById('error-count');
const progressWrap  = document.getElementById('progress-wrap');
const progressFill  = document.getElementById('progress-fill');
const logBox        = document.getElementById('log-box');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnClearLog   = document.getElementById('btn-clear-log');
const btnReset      = document.getElementById('btn-reset');
const delayInput    = document.getElementById('delay-input');
const usernameInput = document.getElementById('username-input');

let isRunning = false;
let currentTab = null;
let resumeInterval = null;

function log(msg, type = 'info') {
  logBox.classList.add('visible');
  btnClearLog.style.display = 'block';
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  entry.textContent = `[${time}] ${msg}`;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

function setStatus(text, cls = '') {
  statusPill.textContent = text;
  statusPill.className = 'status-pill' + (cls ? ` ${cls}` : '');
}

function popStat(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function setIdle() {
  isRunning = false;
  setStatus('Idle', '');
  btnStart.disabled = false;
  btnStop.disabled = true;
  stopResumeWatcher();
}

function setRunning() {
  isRunning = true;
  setStatus('Running', 'running');
  btnStart.disabled = true;
  btnStop.disabled = false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function injectAndStart(tabId, delay, deleted, errors, username) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch(e) {}
  await sleep(400);
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, {
      action: 'START_DELETE', delay, deleted, errors, username
    }, resp => resolve(chrome.runtime.lastError ? null : resp));
  });
}

function startResumeWatcher(delay, deleted, errors) {
  stopResumeWatcher();
  log('⏳ Waiting for page to reload...', 'info');
  resumeInterval = setInterval(() => {
    chrome.tabs.get(currentTab.id, async (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab.status === 'complete' && tab.url && tab.url.includes('threads')) {
        stopResumeWatcher();
        currentTab = tab;
        log(`↩️ Page loaded! Resuming... (${deleted} nuked so far)`, 'info');
        await sleep(2500);
        const u = await chrome.storage.local.get(['savedUsername']);
        const resp = await injectAndStart(tab.id, delay, deleted, errors, u.savedUsername || '');
        if (!resp) {
          log('❌ Could not resume. Hit Start again.', 'error');
          setIdle();
        }
      }
    });
  }, 1000);
}

function stopResumeWatcher() {
  if (resumeInterval) { clearInterval(resumeInterval); resumeInterval = null; }
}


function launchGraffiti(deleted) {
  const overlay = document.getElementById('graffiti-overlay');
  const canvas  = document.getElementById('graffiti-canvas');
  const msg     = document.getElementById('graffiti-msg');

  msg.innerHTML = `🎨 FULLY<br>NUKED!!<br>💣 ${deleted} REPLIES 💥`;
  overlay.classList.add('active');

  // Spray paint dots on canvas
  const ctx = canvas.getContext('2d');
  canvas.width  = 340;
  canvas.height = 500;

  const colors = ['#ff6b35','#f7c59f','#efefd0','#1a936f','#c84b31','#ffbe0b','#fb5607','#ff006e','#8338ec','#3a86ff'];
  let frame = 0;

  function drawSpray() {
    if (frame > 80) return;
    frame++;

    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 340;
      const y = Math.random() * 500;
      const r = Math.random() * 18 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const alpha = Math.random() * 0.7 + 0.3;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;

      // Spray blob
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Drip
      if (Math.random() > 0.6) {
        const dripLen = Math.random() * 40 + 10;
        ctx.fillRect(x - r * 0.3, y, r * 0.6, dripLen);
      }
    }

    // Random graffiti letters
    if (Math.random() > 0.7) {
      const words = ['NUKED','GONE','BYE','💀','🔥','DONE','ZAP','💣','✌️','POOF'];
      const word = words[Math.floor(Math.random() * words.length)];
      ctx.globalAlpha = Math.random() * 0.6 + 0.4;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.font = `bold ${Math.random() * 20 + 14}px sans-serif`;
      ctx.save();
      ctx.translate(Math.random() * 300 + 20, Math.random() * 450 + 25);
      ctx.rotate((Math.random() - 0.5) * 0.8);
      ctx.fillText(word, 0, 0);
      ctx.restore();
    }

    requestAnimationFrame(drawSpray);
  }

  drawSpray();

  // Auto dismiss after 4s
  setTimeout(() => overlay.classList.remove('active'), 4000);
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Load saved username
  const saved = await chrome.storage.local.get(['savedUsername', 'deleted', 'errors', 'pendingResume', 'resumeDelay']);
  if (saved.savedUsername) usernameInput.value = saved.savedUsername;

  // Always show running totals — never reset on popup open
  deletedCount.textContent = saved.deleted || 0;
  errorCount.textContent   = saved.errors  || 0;

  usernameInput.addEventListener('input', () => {
    chrome.storage.local.set({ savedUsername: usernameInput.value.trim().replace(/^@/, '') });
  });

  if (saved.pendingResume) {
    setRunning();
    log(`↩️ Resuming after reload... (${saved.deleted || 0} nuked so far)`, 'info');
    startResumeWatcher(saved.resumeDelay || 1500, saved.deleted || 0, saved.errors || 0);
  } else {
    setIdle();
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'log') log(msg.text, msg.level || 'info');

  if (msg.type === 'progress') {
    deletedCount.textContent = msg.deleted;
    errorCount.textContent   = msg.errors;
    popStat(deletedCount);
    if (msg.errors > 0) popStat(errorCount);
    progressWrap.classList.add('visible');
    progressFill.style.width = `${Math.min(100, (msg.deleted % 20) * 5)}%`;
    chrome.storage.local.set({ deleted: msg.deleted, errors: msg.errors });
  }

  if (msg.type === 'reloading') {
    chrome.storage.local.set({ pendingResume: true, resumeDelay: msg.delay, deleted: msg.deleted, errors: msg.errors });
    startResumeWatcher(msg.delay, msg.deleted, msg.errors);
  }

  if (msg.type === 'allDone') {
    stopResumeWatcher();
    setStatus('NUKED! 🎉', 'done');
    btnStart.disabled = false;
    btnStop.disabled = true;
    isRunning = false;
    log(`🎉 FULLY NUKED! ${msg.deleted} replies gone. Errors: ${msg.errors}`, 'success');
    chrome.storage.local.set({ running: false, pendingResume: false });
    launchGraffiti(msg.deleted);
  }

  if (msg.type === 'done') {
    stopResumeWatcher();
    setStatus('Done! 🎉', 'done');
    btnStart.disabled = false;
    btnStop.disabled = true;
    isRunning = false;
    log(`🎉 All done! Nuked ${msg.deleted} replies total. Errors: ${msg.errors}`, 'success');
    chrome.storage.local.set({ running: false, pendingResume: false });
  }

  if (msg.type === 'stopped') {
    stopResumeWatcher();
    setIdle();
    log('⏹ Stopped.', 'info');
    chrome.storage.local.set({ running: false, pendingResume: false });
  }
});

btnStart.addEventListener('click', async () => {
  if (isRunning) return;
  const delay    = parseInt(delayInput.value) || 1500;
  const username = usernameInput.value.trim().replace(/^@/, '');

  if (!username) {
    log('❌ Enter your Threads username first!', 'error');
    usernameInput.focus();
    return;
  }

  // Keep existing totals — never reset on start
  const stored = await chrome.storage.local.get(['deleted', 'errors']);
  const deleted = stored.deleted || 0;
  const errors  = stored.errors  || 0;

  await chrome.storage.local.set({ savedUsername: username, running: true, pendingResume: false });
  setRunning();
  log(`🚀 Launching nuke sequence for @${username}...`, 'info');

  const resp = await injectAndStart(currentTab.id, delay, deleted, errors, username);
  if (!resp) {
    log('❌ Could not connect. Make sure you\'re on threads.net.', 'error');
    setIdle();
  }
});

btnStop.addEventListener('click', async () => {
  if (!isRunning) return;
  stopResumeWatcher();
  btnStop.disabled = true;
  log('⏹ Stopping...', 'info');
  chrome.tabs.sendMessage(currentTab.id, { action: 'STOP_DELETE' }, () => {});
  await sleep(1000);
  setIdle();
  chrome.storage.local.set({ running: false, pendingResume: false });
});

btnReset.addEventListener('click', async () => {
  stopResumeWatcher();
  await chrome.storage.local.clear();
  setIdle();
  deletedCount.textContent = '0';
  errorCount.textContent   = '0';
  progressFill.style.width = '0%';
  log('↺ Stats reset.', 'info');
});

btnClearLog.addEventListener('click', () => {
  logBox.innerHTML = '';
  logBox.classList.remove('visible');
  btnClearLog.style.display = 'none';
});

init();
