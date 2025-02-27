/* historySystem.js
   Manages history records, storage, cleanup, UI
   Exports functions to main.js and generation.js/emailSystem.js
*/

export let historyRecords = [];
let outputRef = null;
let expiryCheckInterval = null;

/**
 * Attach a reference to the output element
 * and start an interval to handle expiring items.
 */
export function initHistory(passwordOutput) {
  outputRef = passwordOutput;

  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
  }
  // Clean every 5s to remove expired entries
  expiryCheckInterval = setInterval(() => {
    cleanupHistoryData();
    saveHistoryData();
    updateHistoryUI();
  }, 5000);
}

export function loadHistoryData() {
  const saved = localStorage.getItem('historyRecords');
  if (saved) {
    historyRecords = JSON.parse(saved);
  }
}

export function saveHistoryData() {
  localStorage.setItem('historyRecords', JSON.stringify(historyRecords));
}

/**
 * Remove items whose expiresAt is in the past.
 */
export function cleanupHistoryData() {
  const nowMs = Date.now();
  historyRecords = historyRecords.filter(record => {
    const expMs = new Date(record.expiresAt).getTime();
    return nowMs < expMs;
  });
}

export function updateHistoryUI() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  historyList.innerHTML = '';
  const nowMs = Date.now();

  historyRecords.forEach(record => {
    const expiresMs = new Date(record.expiresAt).getTime();
    const timeLeftMs = expiresMs - nowMs;
    if (timeLeftMs <= 0) {
      return;
    }

    let secondsLeft = Math.floor(timeLeftMs / 1000);
    const days = Math.floor(secondsLeft / 86400);
    secondsLeft %= 86400;
    const hours = Math.floor(secondsLeft / 3600);
    secondsLeft %= 3600;
    const minutes = Math.floor(secondsLeft / 60);

    let timeLeftString = '';
    if (days > 0) timeLeftString += `${days}d `;
    if (days > 0 || hours > 0) timeLeftString += `${hours}h `;
    timeLeftString += `${minutes}m`;

    const card = document.createElement('div');
    card.className = 'project-card';
    if (record.isNew) {
      card.classList.add('added');
      record.isNew = false;
    }

    const displayValue =
      typeof record.value === 'object' && record.value.email
        ? record.value.email
        : record.value;

    card.addEventListener('click', () => {
      const textToCopy =
        typeof record.value === 'object' && record.value.email
          ? record.value.email
          : record.value;
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          record.lastCopied = new Date().toISOString();
          saveHistoryData();
          showNotification('copied to clipboard!', 'success');
        })
        .catch(() => {
          showNotification('error copying to clipboard!', 'error');
        });
    });

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = `${record.type}: ${displayValue}`;
    card.appendChild(link);

    const lastUpdated = document.createElement('div');
    lastUpdated.className = 'last-updated';
    lastUpdated.textContent = `${record.dateDisplay} (${timeLeftString} left)`;
    card.appendChild(lastUpdated);

    historyList.appendChild(card);
  });
}

/**
 * Add a new history record with an expiration based on modes.
 */
export function addToHistory(type, value, modes) {
  const now = new Date();

  let expiryMs = 0;
  const val = parseInt(modes.expiryValue, 10) || 1;
  const unit = modes.expiryUnit || 'hours';
  if (unit === 'minutes') {
    expiryMs = val * 60 * 1000;
  } else if (unit === 'hours') {
    expiryMs = val * 60 * 60 * 1000;
  } else if (unit === 'days') {
    expiryMs = val * 24 * 60 * 60 * 1000;
  } else {
    expiryMs = 24 * 60 * 60 * 1000;
  }

  const record = {
    type,
    value,
    dateDisplay: now.toLocaleString(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryMs).toISOString(),
    lastCopied: null,
    isNew: true
  };

  historyRecords.unshift(record);
  saveHistoryData();
}