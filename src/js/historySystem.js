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

  // Unchanged
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
  }
  expiryCheckInterval = setInterval(() => {
    cleanupHistoryData();
    saveHistoryData();
    updateHistoryUI();
  }, 1000); // 1-second interval
}

export function loadHistoryData() {
  // Unchanged
  const saved = localStorage.getItem('historyRecords');
  if (saved) {
    historyRecords = JSON.parse(saved);
  }
}

export function saveHistoryData() {
  // Unchanged
  localStorage.setItem('historyRecords', JSON.stringify(historyRecords));
}

/**
 * Remove items whose expiresAt is in the past.
 */
export function cleanupHistoryData() {
  // Unchanged
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
      return; // Skip expired
    }

    // Convert milliseconds into days/hours/minutes
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

    // Create card
    const card = document.createElement('div');
    card.className = 'project-card';
    if (record.isNew) {
      card.classList.add('added');
      record.isNew = false;
    }

    // Determine display text for link
    // If record.value is an object with an 'email' field, show that
    const displayValue =
      typeof record.value === 'object' && record.value.email
        ? record.value.email
        : record.value;

    // On click, copy just the email if it's an object
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
          window.showNotification('copied to clipboard!', 'success');
        })
        .catch(() => {
          window.showNotification('error copying to clipboard!', 'error');
        });
    });

    // Link text
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = `${record.type}: ${displayValue}`;
    card.appendChild(link);

    // Last updated info
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

  // Unchanged
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