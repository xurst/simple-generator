/* main.js
   Single point of initialization and event wiring.
   Loads modes.json, sets up event listeners, calls sub-modules.
*/

import { showNotification } from "./src/js/notificationSystem.js";
import {
  initHistory,
  loadHistoryData,
  cleanupHistoryData,
  updateHistoryUI,
  saveHistoryData,
} from "./src/js/historySystem.js";
import {
  generatePassword,
  applyGenerationSettings,
} from "./src/js/generation.js";
import {
  generateEmail,
  initInboxSystem,
  refreshInbox,
  trashAllMail,
} from "./src/js/emailSystem.js";

document.addEventListener("DOMContentLoaded", async () => {
  let modes = {};
  try {
    const res = await fetch("/modes.json");
    modes = await res.json();
  } catch {
    modes = {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      autoCopy: false,
    };
  }

  const localModes = localStorage.getItem("modes");
  if (localModes) {
    const userModes = JSON.parse(localModes);
    Object.assign(modes, userModes);
  }

  const generatePasswordButton = document.getElementById(
    "generate-password-button"
  );
  const generateEmailButton = document.getElementById("generate-email-button");
  const copyButton = document.getElementById("copy-button");
  const resetButton = document.getElementById("reset-button");
  const passwordOutput = document.getElementById("password-output");

  const includeUppercase = document.getElementById("include-uppercase");
  const includeLowercase = document.getElementById("include-lowercase");
  const includeNumbers = document.getElementById("include-numbers");
  const includeSymbols = document.getElementById("include-symbols");
  const autoCopyCheckbox = document.getElementById("auto-copy");

  const expiryValueInput = document.getElementById("expiry-value");
  const expiryUnitSelect = document.getElementById("expiry-unit");

  includeUppercase.checked = modes.uppercase;
  includeLowercase.checked = modes.lowercase;
  includeNumbers.checked = modes.numbers;
  includeSymbols.checked = modes.symbols;
  autoCopyCheckbox.checked = modes.autoCopy;

  if (typeof modes.expiryValue === "number") {
    expiryValueInput.value = modes.expiryValue;
  } else {
    modes.expiryValue = parseInt(expiryValueInput.value, 10) || 24;
  }
  if (typeof modes.expiryUnit === "string") {
    expiryUnitSelect.value = modes.expiryUnit;
  } else {
    modes.expiryUnit = expiryUnitSelect.value;
  }

  function saveModes(m) {
    localStorage.setItem("modes", JSON.stringify(m));
  }

  includeUppercase.addEventListener("change", () => {
    modes.uppercase = includeUppercase.checked;
    saveModes(modes);
  });
  includeLowercase.addEventListener("change", () => {
    modes.lowercase = includeLowercase.checked;
    saveModes(modes);
  });
  includeNumbers.addEventListener("change", () => {
    modes.numbers = includeNumbers.checked;
    saveModes(modes);
  });
  includeSymbols.addEventListener("change", () => {
    modes.symbols = includeSymbols.checked;
    saveModes(modes);
  });
  autoCopyCheckbox.addEventListener("change", () => {
    modes.autoCopy = autoCopyCheckbox.checked;
    saveModes(modes);
  });
  expiryValueInput.addEventListener("input", () => {
    modes.expiryValue = parseInt(expiryValueInput.value, 10) || 1;
    saveModes(modes);
  });
  expiryUnitSelect.addEventListener("change", () => {
    modes.expiryUnit = expiryUnitSelect.value;
    saveModes(modes);
  });

  saveModes(modes);
  applyGenerationSettings(modes);

  const passwordLengthInput = document.getElementById("password-length");
  passwordLengthInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });
  passwordLengthInput.addEventListener("blur", (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 12) {
      e.target.value = 12;
    } else if (val > 500) {
      e.target.value = 500;
    }
  });

  initHistory(passwordOutput);
  loadHistoryData();
  cleanupHistoryData();
  updateHistoryUI(); 

  initInboxSystem();

  generatePasswordButton.addEventListener("click", () => {
    generatePassword(modes);
  });
  generateEmailButton.addEventListener("click", () => {
    generateEmail(modes);
  });

  const trashAllMailBtn = document.getElementById("trash-all-mail");
  trashAllMailBtn.addEventListener("click", () => {
    trashAllMail();
  });

  const refreshMailBtn = document.getElementById("refresh-mail");
  refreshMailBtn.addEventListener("click", () => {
    refreshInbox();
  });

  copyButton.addEventListener("click", () => {
    if (!passwordOutput.value.trim()) {
      showNotification("nothing to copy!", "error");
      return;
    }
    navigator.clipboard
      .writeText(passwordOutput.value.trim())
      .then(() => {
        showNotification("copied to clipboard!", "success");
      })
      .catch(() => {
        showNotification("error copying to clipboard!", "error");
      });
  });

  resetButton.addEventListener("click", () => {
    passwordOutput.value = "";
    showNotification("fields reset.", "info", 1000)
  });

  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarPanel = document.getElementById("sidebar-panel");
  sidebarToggle.addEventListener("click", () => {
    sidebarPanel.classList.toggle("active");
    localStorage.setItem(
      "leftSidebarOpen",
      sidebarPanel.classList.contains("active") ? "true" : "false"
    );
  });

  const emailToggle = document.getElementById("email-toggle");
  const emailPanel = document.getElementById("email-panel");
  emailToggle.addEventListener("click", () => {
    emailPanel.classList.toggle("active");
    localStorage.setItem(
      "rightSidebarOpen",
      emailPanel.classList.contains("active") ? "true" : "false"
    );
  });

  const leftSidebarOpen = localStorage.getItem("leftSidebarOpen");
  if (leftSidebarOpen === "true") {
    sidebarPanel.classList.add("active");
  }

  const rightSidebarOpen = localStorage.getItem("rightSidebarOpen");
  if (rightSidebarOpen === "true") {
    emailPanel.classList.add("active");
  }

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === passwordOutput) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== 60) {
            localStorage.setItem("textareaHeight", newHeight + "px");
          }
        }
      }
    });
    ro.observe(passwordOutput);
  }
  const savedHeight = localStorage.getItem("textareaHeight");
  if (savedHeight) {
    passwordOutput.style.height = savedHeight;
  }
});