/* emailSystem.js
   Handles email generation logic and inbox system
   Exports functions to main.js
*/

import { addToHistory, updateHistoryUI } from "./historySystem.js";

/**
 * Reusable fetch with retries to mitigate random JSON errors
 */
async function fetchJsonWithRetry(url, options = {}, tries = 3, delayMs = 1000) {
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

/* =========================
   GENERATE TEMPORARY EMAIL
   ========================= */

export async function generateEmail(modes) {
  try {
    const domainData = await fetchJsonWithRetry("https://api.mail.tm/domains");
    if (!domainData["hydra:member"] || domainData["hydra:member"].length === 0) {
      throw new Error("No available domains.");
    }

    const domain = domainData["hydra:member"][0].domain;
    const randomUsername = `user${Math.floor(Math.random() * 100000)}`;
    const email = `${randomUsername}@${domain}`;
    const password = "SecureTempPass123";

    const createResponse = await fetchJsonWithRetry("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password }),
    });
    if (!createResponse.id) {
      throw new Error("failed to create temp email. try generating another email.");
    }

    const authResponse = await fetchJsonWithRetry("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password }),
    });
    if (!authResponse.token) {
      throw new Error("failed to authenticate new email.");
    }

    const output = document.getElementById("password-output");
    output.value = email;

    if (modes.autoCopy) {
      await navigator.clipboard.writeText(email);
      window.showNotification("auto-copied!", "success");
    }

    addToHistory("email", { email, token: authResponse.token }, modes);
    updateHistoryUI();

    addMailAccount(email, authResponse.token);
    await refreshInbox();
  } catch (error) {
    window.showNotification(
      error.message || "error generating temporary email.",
      "error"
    );
  }
}

/* =========================
   INBOX SYSTEM
   ========================= */

let mailAccounts = [];

function loadMailAccountsFromStorage() {
  const saved = localStorage.getItem("mailAccounts");
  if (saved) {
    mailAccounts = JSON.parse(saved);
  }
}

function saveMailAccountsToStorage() {
  localStorage.setItem("mailAccounts", JSON.stringify(mailAccounts));
}

export function initInboxSystem() {
  loadMailAccountsFromStorage();
  updateInboxUI();
}

function addMailAccount(address, token) {
  const existing = mailAccounts.find((acc) => acc.address === address);
  if (!existing) {
    mailAccounts.push({
      address,
      token,
      messages: [],
    });
    saveMailAccountsToStorage();
  }
}

export async function refreshInbox() {
  for (const account of mailAccounts) {
    account.messages = await fetchMessages(account);
  }
  saveMailAccountsToStorage();
  updateInboxUI();
  /* NEW notification for refreshing */
  window.showNotification("inbox refreshed!", "success");
}

async function fetchMessages(account) {
  try {
    const response = await fetch("https://api.mail.tm/messages?limit=100", {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch messages");
    const data = await response.json();
    if (!data["hydra:member"]) return [];
    return data["hydra:member"].map((msg) => ({ ...msg, expanded: false }));
  } catch {
    return [];
  }
}

async function fetchMessageDetails(account, messageId) {
  const response = await fetch(`https://api.mail.tm/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${account.token}` },
  });
  if (!response.ok) return null;
  return await response.json();
}

async function deleteMessage(account, messageId) {
  await fetch(`https://api.mail.tm/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${account.token}` },
  });
}

export async function trashAllMail() {
  for (const account of mailAccounts) {
    account.messages = await fetchMessages(account);
    await Promise.all(
      account.messages.map((msg) => deleteMessage(account, msg.id))
    );
    account.messages = [];
  }
  saveMailAccountsToStorage();
  updateInboxUI();
  /* NEW notification for trashing all mail */
  window.showNotification("trashed all mail.", "success");
  await refreshInbox();
}

function updateInboxUI() {
  const inboxList = document.getElementById("inbox-list");
  if (!inboxList) return;

  if (!mailAccounts.length) {
    inboxList.textContent = "no new mails.";
    return;
  }

  inboxList.innerHTML = "";

  mailAccounts.forEach((account) => {
    const accountDiv = document.createElement("div");
    accountDiv.style.marginBottom = "1rem";

    const heading = document.createElement("div");
    heading.style.fontWeight = "bold";
    heading.style.marginBottom = "5px";
    heading.textContent = account.address;
    accountDiv.appendChild(heading);

    if (!account.messages || account.messages.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "no messages.";
      accountDiv.appendChild(emptyMsg);
    } else {
      account.messages.forEach((msg) => {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("project-card");

        const infoLine = document.createElement("div");
        infoLine.textContent = `from: ${msg.from?.[0]?.address || "unknown"} | subject: ${
          msg.subject || "(no subject)"
        }`;
        msgDiv.appendChild(infoLine);

        const contentDiv = document.createElement("div");
        contentDiv.style.marginTop = "5px";
        contentDiv.style.display = msg.expanded ? "block" : "none";
        msgDiv.appendChild(contentDiv);

        const btnContainer = document.createElement("div");
        btnContainer.style.marginTop = "5px";
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        const viewBtn = document.createElement("button");
        viewBtn.style.cursor = "pointer";
        updateViewButtonText(viewBtn, msg.expanded);

        viewBtn.onclick = async () => {
          if (!msg.expanded) {
            const details = await fetchMessageDetails(account, msg.id);
            if (details) {
              contentDiv.innerHTML = "";

              const textBlock = document.createElement("div");
              textBlock.style.whiteSpace = "pre-wrap";
              textBlock.style.marginBottom = "8px";
              textBlock.textContent = details.text || "[no text content]";
              contentDiv.appendChild(textBlock);

              if (details.html) {
                const iframe = document.createElement("iframe");
                iframe.sandbox = "allow-same-origin allow-popups allow-forms";
                iframe.style.width = "100%";
                iframe.style.height = "300px";
                iframe.srcdoc = details.html;
                contentDiv.appendChild(iframe);
              }

              contentDiv.style.display = "block";
              msg.expanded = true;
              updateViewButtonText(viewBtn, true);
            }
          } else {
            contentDiv.style.display = "none";
            msg.expanded = false;
            updateViewButtonText(viewBtn, false);
          }
        };
        btnContainer.appendChild(viewBtn);

        const trashBtn = document.createElement("button");
        trashBtn.textContent = "trash";
        trashBtn.style.cursor = "pointer";
        trashBtn.onclick = async () => {
          await deleteMessage(account, msg.id);
          account.messages = account.messages.filter((m) => m.id !== msg.id);
          updateInboxUI();
          /* NEW notification for single-message trash */
          window.showNotification("trashed!", "success");
          await refreshInbox();
        };
        btnContainer.appendChild(trashBtn);

        msgDiv.appendChild(btnContainer);
        accountDiv.appendChild(msgDiv);
      });
    }

    inboxList.appendChild(accountDiv);
  });
}

function updateViewButtonText(button, expanded) {
  button.textContent = expanded ? "hide" : "view";
}