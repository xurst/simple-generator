/* generation.js
   Handles password generation logic
   Exports functions to main.js
*/

import { addToHistory } from './historySystem.js';

const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
const numberChars   = '0123456789';
const symbolChars   = '!@#$%^&*()_+-=[]{}|;:,.<>?';

let currentModes = {};

export function applyGenerationSettings(modes) {
  currentModes = modes;
}

export function generatePassword(modes) {
  const passwordLength = document.getElementById('password-length');
  let lengthVal = parseInt(passwordLength.value, 10) || 12;
  if (lengthVal < 12) lengthVal = 12;
  if (lengthVal > 500) lengthVal = 500;

  let chars = '';
  if (modes.uppercase) chars += uppercaseChars;
  if (modes.lowercase) chars += lowercaseChars;
  if (modes.numbers)   chars += numberChars;
  if (modes.symbols)   chars += symbolChars;

  if (!chars) {
    window.showNotification('please select at least one character type.', 'error');
    return;
  }

  let password = '';
  for (let i = 0; i < lengthVal; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  const output = document.getElementById('password-output');
  output.value = password;

  if (modes.autoCopy) {
    navigator.clipboard.writeText(password)
      .then(() => window.showNotification('auto-copied!', 'success'))
      .catch(() => window.showNotification('failed to auto-copy!', 'error'));
  }

  addToHistory('password', password, modes);
}