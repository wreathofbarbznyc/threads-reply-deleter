// content.js — Threads Reply Deleter v8

let shouldStop = false;
let isRunning = false;

function sendLog(text, level = 'info') {
  try { chrome.runtime.sendMessage({ type: 'log', text, level }); } catch(e) {}
}

function sendProgress(deleted, errors) {
  try { chrome.runtime.sendMessage({ type: 'progress', deleted, errors, total: 0 }); } catch(e) {}
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectUsername() {
  for (const a of document.querySelectorAll('a[href]')) {
    const m = (a.getAttribute('href') || '').match(/^\/@([^/]+)\/replies$/);
    if (m) return m[1];
  }
  const urlMatch = location.pathname.match(/^\/@([^/]+)/);
  return urlMatch ? urlMatch[1] : null;
}

function getYourMoreButtons(username) {
  return [...document.querySelectorAll('div[aria-haspopup="menu"][role="button"]')].filter(btn => {
    if (btn.dataset.trdProcessed) return false;
    let container = btn;
    for (let i = 0; i < 4; i++) {
      container = container.parentElement;
      if (!container) return false;
    }
    const links = [...container.querySelectorAll('a[href]')];
    return links.some(a => a.getAttribute('href') === `/@${username}`)
        && links.some(a => (a.getAttribute('href') || '').startsWith(`/@${username}/post/`));
  });
}

async function clickDeleteInMenu() {
  await sleep(900);
  const menu = document.querySelector('[role="menu"]');
  if (!menu) {
    sendLog('Menu did not open', 'error');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  let deleteEl = null;
  for (const el of menu.querySelectorAll('*')) {
    if (el.children.length === 0 && el.textContent.trim() === 'Delete') {
      deleteEl = el; break;
    }
  }
  if (!deleteEl) {
    sendLog('No Delete option in menu', 'error');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(400);
    return false;
  }

  const clickable = deleteEl.closest('[role="button"]') || deleteEl.closest('button') || deleteEl.parentElement;
  clickable.click();
  await sleep(1000);

  for (const btn of document.querySelectorAll('[role="button"], button')) {
    const text = btn.textContent.trim();
    if (text === 'Delete' || text === 'Yes, delete') {
      btn.click();
      return true;
    }
  }

  sendLog('Confirmation button not found', 'error');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return false;
}

async function doReload(username, deleted, errors, delay) {
  sendLog(`🔄 Reloading page...`, 'info');
  await chrome.storage.local.set({ deleted, errors, pendingResume: true, resumeDelay: delay });
  try { chrome.runtime.sendMessage({ type: 'reloading', delay, deleted, errors }); } catch(e) {}
  await sleep(800);
  location.href = `/@${username}/replies`;
}

async function runBulkDelete(delay, startDeleted = 0, startErrors = 0, overrideUsername = '') {
  let deleted = startDeleted;
  let errors = startErrors;
  let errorsSinceReload = 0;

  const username = overrideUsername || detectUsername();
  if (!username) {
    sendLog('❌ Could not detect username. Enter it in the extension popup.', 'error');
    chrome.runtime.sendMessage({ type: 'done', deleted: 0, errors: 1 });
    isRunning = false;
    return;
  }

  sendLog(`✓ Username: @${username}`, 'success');
  if (startDeleted > 0) sendLog(`↩️ Resumed — ${startDeleted} deleted, ${startErrors} errors so far.`, 'info');

  // Step 1: scroll down 3 times
  sendLog('Scrolling down 3 times to load replies...', 'info');
  for (let i = 1; i <= 3; i++) {
    if (shouldStop) break;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(2000);
  }

  if (shouldStop) {
    chrome.runtime.sendMessage({ type: 'stopped' });
    isRunning = false;
    return;
  }

  // Step 2: scroll back to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(1500);

  // Step 3: check if "No replies yet" shown
  if (document.body.innerText.includes('No replies yet')) {
    sendLog('\u{1F389} "No replies yet" detected - fully nuked!', 'success');
    await chrome.storage.local.set({ running: false, pendingResume: false });
    chrome.runtime.sendMessage({ type: 'allDone', deleted, errors });
    isRunning = false;
    return;
  }

  // Step 3b: collect all your reply buttons
  const btns = getYourMoreButtons(username);
  sendLog(`Found ${btns.length} of your replies. Nuking them...`, 'info');

  if (btns.length === 0) {
    sendLog('No replies found.', 'info');
    await chrome.storage.local.set({ running: false, pendingResume: false });
    chrome.runtime.sendMessage({ type: 'done', deleted, errors });
    isRunning = false;
    return;
  }

  // Step 4: delete top to bottom
  for (const btn of btns) {
    if (shouldStop) break;

    btn.dataset.trdProcessed = '1';
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    btn.click();

    const success = await clickDeleteInMenu();
    if (success) {
      deleted++;
      errorsSinceReload = 0;
      sendLog(`💥 Zapped reply #${deleted}`, 'success');
      sendProgress(deleted, errors);
      await chrome.storage.local.set({ deleted, errors });
      await sleep(delay);
    } else {
      errors++;
      errorsSinceReload++;
      sendProgress(deleted, errors);
      await sleep(600);

      // Reload after 5 consecutive errors
      if (errorsSinceReload >= 5) {
        sendLog(`⚠️ 5 errors in a row — reloading to fix...`, 'error');
        await doReload(username, deleted, errors, delay);
        return;
      }
    }
  }

  if (shouldStop) {
    await chrome.storage.local.set({ running: false, pendingResume: false });
    chrome.runtime.sendMessage({ type: 'stopped' });
    isRunning = false;
    return;
  }

  // Step 5: reload for next round
  sendLog(`✅ Batch done! ${deleted} zapped total. Reloading for next round...`, 'info');
  await doReload(username, deleted, errors, delay);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START_DELETE') {
    if (isRunning) { sendResponse({ ok: false }); return; }
    shouldStop = false;
    isRunning = true;
    sendResponse({ ok: true });
    runBulkDelete(msg.delay || 1500, msg.deleted || 0, msg.errors || 0, msg.username || '');
  }
  if (msg.action === 'STOP_DELETE') {
    shouldStop = true;
    isRunning = false;
    sendResponse({ ok: true });
    chrome.runtime.sendMessage({ type: 'stopped' });
  }
  if (msg.action === 'PING') {
    sendResponse({ ok: true });
  }
});
