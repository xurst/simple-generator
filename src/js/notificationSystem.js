/* notificationSystem.js
   Displays stacked notifications
   Exports init and helper functions
*/

// We'll attach showNotification to window so other modules can call it easily
export function initNotifications() {
    window.showNotification = (message, type = 'success') => {
      createNotification(message, type);
    };
  }
  
  function createNotification(message, type) {
    const stack = document.getElementById('notifications-stack');
    if (!stack) return;
  
    const nEl = document.createElement('div');
    nEl.className = `notification-container notification-${type}`;
  
    let extraErrorHtml = '';
    if (type === 'error') {
      extraErrorHtml = `
        <div style="cursor:pointer; color:#F44336; margin-top:4px; font-size:12px;">
          (click me to copy error message)
        </div>
      `;
    }
  
    nEl.innerHTML = `
      <div class="notification-type-indicator">
        ${
          type === "error"
            ? '<i class="fa-solid fa-circle-exclamation"></i>'
            : '<i class="fa-solid fa-check"></i>'
        }
      </div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        <p class="notification-message">${message}</p>
        ${extraErrorHtml}
      </div>
      <button class="close-notification">
        <i class="fa-solid fa-times"></i>
      </button>
    `;
  
    stack.appendChild(nEl);
  
    requestAnimationFrame(() => {
      nEl.classList.add('show-notification');
    });
  
    // close button
    nEl.querySelector('.close-notification').addEventListener('click', () => {
      removeNotification(nEl);
    });
  
    // if error => add copy to clipboard
    if (type === 'error') {
      const copyError = nEl.querySelector('div[style*="cursor:pointer"]');
      if (copyError) {
        copyError.addEventListener('click', (event) => {
          navigator.clipboard.writeText(message)
            .then(() => window.showNotification('error message copied!', 'success'))
            .catch(() => window.showNotification('failed to copy error message.', 'error'));
          event.stopPropagation();
        });
      }
    }
  
    // auto-hide
    setTimeout(() => {
      removeNotification(nEl);
    }, 3000);
  }
  
  function removeNotification(el) {
    el.classList.remove('show-notification');
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 300);
  }  