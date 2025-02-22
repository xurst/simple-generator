document.addEventListener("DOMContentLoaded", () => {
    const generatePasswordButton = document.getElementById("generate-password-button");
    const generateEmailButton = document.getElementById("generate-email-button");
    const copyButton = document.getElementById("copy-button");
    const resetButton = document.getElementById("reset-button");
    const passwordOutput = document.getElementById("password-output");
    const passwordLength = document.getElementById("password-length");
    const includeUppercase = document.getElementById("include-uppercase");
    const includeLowercase = document.getElementById("include-lowercase");
    const includeNumbers = document.getElementById("include-numbers");
    const includeSymbols = document.getElementById("include-symbols");
  
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebarPanel = document.getElementById("sidebar-panel");
    const historyList = document.getElementById("history-list");
  
    const emailToggle = document.getElementById("email-toggle");
    const emailPanel = document.getElementById("email-panel");
    const trashAllMailBtn = document.getElementById("trash-all-mail");
  
    const notificationsStack = document.getElementById("notifications-stack");
  
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
    let historyRecords = [];
  
    // ----------------------------------------
    // NOTIFICATION SYSTEM
    // ----------------------------------------
    function showNotification(message, type = "success") {
      const nEl = document.createElement("div");
      nEl.className = `notification-container notification-${type}`;
  
      let extraErrorHtml = "";
      if (type === "error") {
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
  
      notificationsStack.appendChild(nEl);
  
      requestAnimationFrame(() => {
        nEl.classList.add("show-notification");
      });
  
      nEl.querySelector(".close-notification").addEventListener("click", () => {
        removeNotification(nEl);
      });
  
      // if error => copy error text
      if (type === "error") {
        const copyError = nEl.querySelector('div[style*="cursor:pointer"]');
        if (copyError) {
          copyError.addEventListener("click", (event) => {
            navigator.clipboard
              .writeText(message)
              .then(() => {
                showNotification("error message copied!", "success");
              })
              .catch(() => {
                showNotification("failed to copy error message.", "error");
              });
            event.stopPropagation();
          });
        }
      }
  
      setTimeout(() => {
        removeNotification(nEl);
      }, 3000);
    }
  
    function removeNotification(notificationEl) {
      notificationEl.classList.remove("show-notification");
      setTimeout(() => {
        if (notificationEl.parentNode) {
          notificationEl.parentNode.removeChild(notificationEl);
        }
      }, 300);
    }
  
    // ----------------------------------------
    // LOAD & SAVE SETTINGS
    // ----------------------------------------
    function loadSettings() {
      const savedLength = localStorage.getItem("passwordLength");
      if (savedLength) {
        passwordLength.value = savedLength;
      }
      const savedSettings = JSON.parse(localStorage.getItem("includeSettings")) || {};
      includeUppercase.checked = savedSettings.uppercase !== false;
      includeLowercase.checked = savedSettings.lowercase !== false;
      includeNumbers.checked = savedSettings.numbers !== false;
      includeSymbols.checked = savedSettings.symbols !== false;
    }
  
    function saveSettings() {
      localStorage.setItem("passwordLength", passwordLength.value);
      localStorage.setItem(
        "includeSettings",
        JSON.stringify({
          uppercase: includeUppercase.checked,
          lowercase: includeLowercase.checked,
          numbers: includeNumbers.checked,
          symbols: includeSymbols.checked,
        })
      );
    }
  
    // ----------------------------------------
    // HISTORY LOGIC
    // ----------------------------------------
    function loadHistory() {
      const savedHistory = JSON.parse(localStorage.getItem("historyRecords"));
      if (savedHistory) {
        historyRecords = savedHistory;
        cleanupHistory();
        updateHistoryList();
      }
    }
  
    function saveHistory() {
      localStorage.setItem("historyRecords", JSON.stringify(historyRecords));
    }
  
    function cleanupHistory() {
      const now = new Date();
      historyRecords = historyRecords.filter((record) => {
        const refDate = record.lastCopied
          ? new Date(record.lastCopied)
          : new Date(record.createdAt);
        const diffDays = (now - refDate) / (1000 * 60 * 60 * 24);
        return diffDays < 30;
      });
    }
  
    function addToHistory(type, value) {
      const now = new Date();
      const record = {
        type,
        value,
        dateDisplay: now.toLocaleString(),
        createdAt: now.toISOString(),
        lastCopied: null,
        isNew: true,
      };
      historyRecords.unshift(record);
      cleanupHistory();
      saveHistory();
      updateHistoryList();
    }
  
    function updateHistoryList() {
      historyList.innerHTML = "";
      historyRecords.forEach((record) => {
        const card = document.createElement("div");
        card.className = "project-card";
        if (record.isNew) {
          card.classList.add("added");
          record.isNew = false;
        }
  
        card.addEventListener("click", () => {
          navigator.clipboard
            .writeText(record.value)
            .then(() => {
              record.lastCopied = new Date().toISOString();
              cleanupHistory();
              saveHistory();
              updateHistoryList();
              showNotification("copied to clipboard!", "success");
            })
            .catch(() => {
              showNotification("error copying to clipboard!", "error");
            });
        });
  
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = `${record.type}: ${record.value}`;
        card.appendChild(link);
  
        const lastUpdated = document.createElement("div");
        lastUpdated.className = "last-updated";
        lastUpdated.textContent = `${record.dateDisplay} (click to copy)`;
        card.appendChild(lastUpdated);
  
        historyList.appendChild(card);
      });
    }
  
    // ----------------------------------------
    // GENERATE PASSWORD / EMAIL
    // ----------------------------------------
    function generatePassword() {
      // clamp length
      let lengthVal = parseInt(passwordLength.value, 10);
      if (isNaN(lengthVal)) {
        lengthVal = 10;
        passwordLength.value = 10;
      }
      if (lengthVal < 10) {
        lengthVal = 10;
        passwordLength.value = 10;
      }
      if (lengthVal > 500) {
        lengthVal = 500;
        passwordLength.value = 500;
      }
  
      let chars = "";
      if (includeUppercase.checked) chars += uppercaseChars;
      if (includeLowercase.checked) chars += lowercaseChars;
      if (includeNumbers.checked) chars += numberChars;
      if (includeSymbols.checked) chars += symbolChars;
  
      if (chars === "") {
        showNotification("please select at least one character type.", "error");
        return;
      }
  
      let password = "";
      for (let i = 0; i < lengthVal; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
      }
      passwordOutput.value = password;
      saveSettings();
      addToHistory("password", password);
    }
  
    function generateEmail() {
      // fetch from GuerrillaMail
      fetch("https://www.guerrillamail.com/ajax.php?f=get_email_address&lang=en&site=guerrillamail")
        .then((res) => res.json())
        .then((data) => {
          if (!data.email_addr) {
            throw new Error("No email returned");
          }
          passwordOutput.value = data.email_addr;
          addToHistory("email", data.email_addr);
        })
        .catch(() => {
          showNotification("error fetching email from GuerrillaMail.", "error");
        });
    }
  
    // ----------------------------------------
    // COPY & RESET
    // ----------------------------------------
    function copyCurrentOutput() {
      const textToCopy = passwordOutput.value.trim();
      if (!textToCopy) {
        showNotification("nothing to copy!", "error");
        return;
      }
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          showNotification("copied to clipboard!", "success");
        })
        .catch(() => {
          showNotification("error copying to clipboard!", "error");
        });
    }
  
    function resetOutput() {
      passwordOutput.value = "";
    }
  
    // ----------------------------------------
    // SIDEBAR TOGGLE + LOCAL STORAGE
    // ----------------------------------------
    function loadSidebarStates() {
      const leftSidebarOpen = localStorage.getItem("leftSidebarOpen");
      if (leftSidebarOpen === "true") {
        sidebarPanel.classList.add("active");
      }
      const rightSidebarOpen = localStorage.getItem("rightSidebarOpen");
      if (rightSidebarOpen === "true") {
        emailPanel.classList.add("active");
      }
    }
  
    function toggleLeftSidebar() {
      sidebarPanel.classList.toggle("active");
      const isOpen = sidebarPanel.classList.contains("active");
      localStorage.setItem("leftSidebarOpen", isOpen ? "true" : "false");
    }
  
    function toggleRightSidebar() {
      emailPanel.classList.toggle("active");
      const isOpen = emailPanel.classList.contains("active");
      localStorage.setItem("rightSidebarOpen", isOpen ? "true" : "false");
    }
  
    // ----------------------------------------
    // FIX TEXTAREA AUTO-GROW BUG
    // ----------------------------------------
    // Use a ResizeObserver so we only store the new size if user manually resizes
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === passwordOutput) {
            const newHeight = entry.contentRect.height;
            // Only store if user actually dragged the resize handle
            // (We assume a manual resize if it's bigger than 60 or changed from a prior manual action)
            if (newHeight !== 60) {
              localStorage.setItem("textareaHeight", newHeight + "px");
            }
          }
        }
      });
      ro.observe(passwordOutput);
    }
  
    // Load any saved height once
    function loadTextareaSize() {
      const savedHeight = localStorage.getItem("textareaHeight");
      if (savedHeight) {
        passwordOutput.style.height = savedHeight;
      }
    }
  
    // ----------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------
    passwordLength.addEventListener("input", () => {
      // numeric only
      passwordLength.value = passwordLength.value.replace(/\D/g, "");
      if (passwordLength.value === "") {
        passwordLength.value = 10;
      }
      const val = parseInt(passwordLength.value, 10);
      if (val < 10) {
        passwordLength.value = 10;
      }
      if (val > 500) {
        passwordLength.value = 500;
      }
      saveSettings();
    });
  
    generatePasswordButton.addEventListener("click", generatePassword);
    generateEmailButton.addEventListener("click", generateEmail);
    copyButton.addEventListener("click", copyCurrentOutput);
    resetButton.addEventListener("click", resetOutput);
  
    [includeUppercase, includeLowercase, includeNumbers, includeSymbols].forEach((checkbox) => {
      checkbox.addEventListener("change", saveSettings);
    });
  
    sidebarToggle.addEventListener("click", toggleLeftSidebar);
    emailToggle.addEventListener("click", toggleRightSidebar);
  
    trashAllMailBtn.addEventListener("click", () => {
      document.getElementById("inbox-list").textContent = "all mail trashed.";
      showNotification("all mail has been trashed.", "success");
    });
  
    // ----------------------------------------
    // INITIAL LOAD
    // ----------------------------------------
    loadSettings();
    loadHistory();
    loadSidebarStates();
    loadTextareaSize();
  });  