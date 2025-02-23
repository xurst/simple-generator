/* emailSystem.js
   Handles email generation logic and inbox system
   Exports functions to main.js
*/

import { addToHistory } from "./historySystem.js";

/* =========================
   GENERATE TEMPORARY EMAIL
   ========================= */
export async function generateEmail(modes) {
  try {
    let domainResponse = await fetch("https://api.mail.tm/domains");
    let domainData = await domainResponse.json();
    if (!domainData["hydra:member"] || domainData["hydra:member"].length === 0) {
      throw new Error("No available domains.");
    }

    let domain = domainData["hydra:member"][0].domain;
    let randomUsername = `user${Math.floor(Math.random() * 100000)}`;
    let email = `${randomUsername}@${domain}`;
    let password = "SecureTempPass123";

    let createResponse = await fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password }),
    });
    let account = await createResponse.json();
    if (!account.id) throw new Error("failed to create temp email.");

    let authResponse = await fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: email, password: password }),
    });
    let auth = await authResponse.json();
    if (!auth.token) throw new Error("failed to authenticate new email.");

    const output = document.getElementById("password-output");
    output.value = email;

    if (modes.autoCopy) {
      await navigator.clipboard.writeText(email);
      window.showNotification("auto-copied!", "success");
    }

    addToHistory("email", { email, token: auth.token }, modes);

    addMailAccount(email, auth.token);
    await refreshInbox();
  } catch (error) {
    window.showNotification(error.message || "error generating temporary email.", "error");
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
    for (const msg of account.messages) {
      await deleteMessage(account, msg.id);
    }
    account.messages = [];
  }
  saveMailAccountsToStorage();
  updateInboxUI();
  await refreshInbox();
  window.showNotification("all mail has been trashed.", "success");
}

/**
 * Renders the inbox UI in the #inbox-list element.
 * Uses .project-card so it matches the history sidebar's look.
 */
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
        // Use the same 'project-card' class as the history sidebar
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("project-card");

        // Basic info line
        const infoLine = document.createElement("div");
        infoLine.textContent = `From: ${msg.from?.[0]?.address || "unknown"} | Subject: ${
          msg.subject || "(no subject)"
        }`;
        msgDiv.appendChild(infoLine);

        // Expandable content container
        const contentDiv = document.createElement("div");
        contentDiv.style.marginTop = "5px";
        contentDiv.style.display = msg.expanded ? "block" : "none";
        msgDiv.appendChild(contentDiv);

        // Button container
        const btnContainer = document.createElement("div");
        btnContainer.style.marginTop = "5px";
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        // View/Hide button
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

        // Trash button
        const trashBtn = document.createElement("button");
        trashBtn.textContent = "trash";
        trashBtn.style.cursor = "pointer";
        trashBtn.onclick = async () => {
          await deleteMessage(account, msg.id);
          account.messages = account.messages.filter((m) => m.id !== msg.id);
          updateInboxUI();
          await refreshInbox();
          window.showNotification("trashed!", "success");
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