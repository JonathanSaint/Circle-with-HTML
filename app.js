// ─── Firebase Config ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDUSCi_iVm6ZBeT97slFcPUc0mWfsDcqhY",
  authDomain: "chatrr-5fbc7.firebaseapp.com",
  databaseURL: "https://chatrr-5fbc7-default-rtdb.firebaseio.com",
  projectId: "chatrr-5fbc7",
  storageBucket: "chatrr-5fbc7.firebasestorage.app",
  messagingSenderId: "610089433520",
  appId: "1:610089433520:web:6d1cdb55911d046a327e75",
  measurementId: "G-YMKVN2EXLX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─── DOM refs ──────────────────────────────────────────────────────
const chatDiv      = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const nameBar      = document.getElementById("name-bar");
const userLabel    = document.getElementById("user-label");
const userLabelTxt = document.getElementById("user-label-text");

// ─── State ─────────────────────────────────────────────────────────
let currentUser = localStorage.getItem("circle_username") || null;
const renderedIds = new Set();

// ─── On load: restore username if saved ───────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    activateUser(currentUser);
  } else {
    nameBar.classList.remove("hidden");
    document.getElementById("username").focus();
  }
});

// ─── Set username ──────────────────────────────────────────────────
function setUsername() {
  const input = document.getElementById("username");
  const name  = input.value.trim();
  if (!name) return;

  localStorage.setItem("circle_username", name);
  currentUser = name;
  activateUser(name);
}

document.getElementById("username").addEventListener("keydown", e => {
  if (e.key === "Enter") setUsername();
});

// ─── Change name ───────────────────────────────────────────────────
function changeName() {
  const newName = prompt("Enter a new display name:", currentUser || "");
  if (!newName || !newName.trim()) return;
  localStorage.setItem("circle_username", newName.trim());
  currentUser = newName.trim();
  userLabelTxt.textContent = "Chatting as " + currentUser;
}

// ─── Activate chat UI ──────────────────────────────────────────────
function activateUser(name) {
  currentUser = name;
  nameBar.classList.add("hidden");
  userLabel.classList.remove("hidden");
  userLabelTxt.textContent = "Chatting as " + name;

  messageInput.disabled = false;
  sendBtn.disabled = false;

  startMessageListener();
}

// ─── Send Message ──────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  db.collection("messages").add({
    text,
    user: currentUser,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    showError("Failed to send. Check Firestore rules.");
    console.error(err);
  });

  messageInput.value = "";
}

messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ─── Real-time Message Listener ────────────────────────────────────
function startMessageListener() {
  db.collection("messages")
    .orderBy("timestamp")
    .onSnapshot({ includeMetadataChanges: true }, snapshot => {
      const welcome = chatDiv.querySelector(".welcome-msg");
      if (welcome && snapshot.size > 0) welcome.remove();

      snapshot.docChanges().forEach(change => {
        const doc  = change.doc;
        const data = doc.data();
        const id   = doc.id;

        if (change.type === "added" && !renderedIds.has(id)) {
          renderedIds.add(id);
          const time = data.timestamp
            ? new Date(data.timestamp.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          renderMessage(data, id, time);
        }

        if (change.type === "modified" && data.timestamp) {
          const timeEl = chatDiv.querySelector(`[data-id="${id}"] .msg-time`);
          if (timeEl) {
            timeEl.textContent = new Date(data.timestamp.toMillis())
              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          }
        }
      });

      chatDiv.scrollTop = chatDiv.scrollHeight;

    }, err => {
      console.error("Firestore error:", err);
      showError("Could not connect. Check Firestore rules in your Firebase console.");
    });
}

// ─── Render a Message Bubble ───────────────────────────────────────
function renderMessage(data, id, time) {
  const isMine = data.user === currentUser;

  const wrapper = document.createElement("div");
  wrapper.classList.add("msg-wrapper", isMine ? "mine" : "theirs");
  wrapper.dataset.id = id;

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");

  bubble.innerHTML = `
    ${!isMine ? `<div class="msg-user">${escapeHtml(data.user)}</div>` : ""}
    <div class="msg-text">${escapeHtml(data.text)}</div>
    <div class="msg-time">${time}</div>
  `;

  wrapper.appendChild(bubble);
  chatDiv.appendChild(wrapper);
}

// ─── Clear Chat ────────────────────────────────────────────────────
async function clearChat() {
  const confirmed = confirm("Clear the entire chat for everyone? This cannot be undone.");
  if (!confirmed) return;

  try {
    const snapshot = await db.collection("messages").get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    chatDiv.innerHTML = '<div class="welcome-msg">👋 Say something to people nearby...</div>';
    renderedIds.clear();
  } catch (err) {
    showError("Could not clear chat. Check Firestore rules.");
    console.error(err);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showError(msg) {
  const err = document.createElement("div");
  err.className = "error-banner";
  err.textContent = msg;
  chatDiv.prepend(err);
}
