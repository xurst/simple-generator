// notificationSystem.js

// Class
class NotificationManager {
  constructor() {
    this.stack = document.getElementById("notifications-stack");
    if (!this.stack) {
      this.stack = document.createElement("div");
      this.stack.id = "notifications-stack";
      this.stack.className = "notification-stack";
      document.body.appendChild(this.stack);
    }
  }

  createNotificationElement(type = "default", message) {
    const notification = document.createElement("div");
    notification.className = `notification-container notification-${type}`;

    let extraErrorHtml = "";
    if (type === "error") {
      extraErrorHtml = `
          <div style="cursor:pointer; color:#F44336; margin-top:4px; font-size:12px;">
            (click me to copy error message)
          </div>
        `;
    }

    const icons = {
      success: '<i class="fa-solid fa-check-circle"></i>',
      error: '<i class="fa-solid fa-times-circle"></i>',
      warning: '<i class="fa-solid fa-exclamation-triangle"></i>',
      info: '<i class="fa-solid fa-info-circle"></i>',
      default: '<i class="fa-solid fa-bell"></i>',
    };

    notification.innerHTML = `
          <div class="notification-type-indicator">
            ${icons[type] || icons["default"]}
          </div>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <p class="notification-message">${message}</p>
            ${extraErrorHtml}
          </div>
          <button class="close-notification">
            <i class="fa-solid fa-times"></i>
          </button>
          <div class="notification-progress-bar"></div>
        `;

    return notification;
  }

  showNotification(
    message,
    type = "default",
    duration = 3000,
    errorCallback = null
  ) {
    try {
      const notificationElement = this.createNotificationElement(type, message);
      // Append new notification to the stack
      this.stack.insertBefore(notificationElement, this.stack.firstChild);

      // Trigger popup animation
      requestAnimationFrame(() => {
        notificationElement.classList.add("show-notification");
      });

      const progressBar = notificationElement.querySelector(".notification-progress-bar");

      // Function to remove notification with exit animation
      const removeNotification = () => {
        notificationElement.classList.remove("show-notification");
        setTimeout(() => {
          if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
          }
        }, 300);
      };

      // Animate progress bar and remove notification after transition ends
      if (progressBar) {
        requestAnimationFrame(() => {
          progressBar.style.transition = `width ${duration}ms linear`;
          progressBar.style.width = "100%";
          progressBar.addEventListener(
            "transitionend",
            function (e) {
              if (e.propertyName === "width") {
                removeNotification();
              }
            },
            { once: true }
          );
        });
      } else {
        setTimeout(removeNotification, duration);
      }

      // Close button click handler
      const closeBtn = notificationElement.querySelector(".close-notification");
      closeBtn.addEventListener("click", removeNotification);

      // Error-specific behavior: copy error message on click
      if (type === "error") {
        const copyError = notificationElement.querySelector(
          'div[style*="cursor:pointer"]'
        );
        if (copyError) {
          copyError.addEventListener("click", (event) => {
            navigator.clipboard
              .writeText(message)
              .then(() =>
                this.showNotification("error message copied!", "success", 3000)
              )
              .catch(() =>
                this.showNotification(
                  "failed to copy error message.",
                  "error",
                  3000
                )
              );
            event.stopPropagation();
          });
        }
      }
    } catch (err) {
      if (typeof errorCallback === "function") {
        errorCallback(err);
      } else {
        console.error("An error occurred in showNotification:", err);
      }
    }
  }
}

const notificationManager = new NotificationManager();

function showNotification(
  message,
  type = "default",
  duration = 3000,
  errorCallback = null
) {
  notificationManager.showNotification(message, type, duration, errorCallback);
}

// Page reload notification
document.addEventListener("DOMContentLoaded", () => {
  showNotification("page reload!", "info", 1000);
});

export { showNotification, NotificationManager };

window.showNotification = showNotification;
window.NotificationManager = NotificationManager;