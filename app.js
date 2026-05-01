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

// ─── State ─────────────────────────────────────────────────────────
let currentUser = null;

const chatDiv = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// ─── Set Username ──────────────────────────────────────────────────
function setUsername() {
  const input = document.getElementById("username");
  const name = input.value.trim();
  if (!name) return;

  currentUser = name;

  // Hide name bar, show label
  document.getElementById("name-bar").classList.add("hidden");
  const label = document.getElementById("user-label");
  label.textContent = "You are chatting as " + name;
  label.classList.remove("hidden");

  // Enable message input
  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.focus();
}

// Allow pressing Enter on username input
document.getElementById("username").addEventListener("keydown", e => {
  if (e.key === "Enter") setUsername();
});

// ─── Send Message ──────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  db.collection("messages").add({
    text: text,
    user: currentUser,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    showError("Failed to send message. Check Firestore rules.");
    console.error(err);
  });

  messageInput.value = "";
}

// Allow pressing Enter to send
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ─── Listen for Messages (Real-time) ──────────────────────────────
const renderedIds = new Set();

db.collection("messages")
  .orderBy("timestamp")
  .onSnapshot({ includeMetadataChanges: true }, snapshot => {
    // Remove welcome message once real messages arrive
    const welcome = chatDiv.querySelector(".welcome-msg");
    if (welcome && snapshot.size > 0) welcome.remove();

    snapshot.docChanges().forEach(change => {
      const doc = change.doc;
      const data = doc.data();
      const id = doc.id;

      if (change.type === "added" && !renderedIds.has(id)) {
        renderedIds.add(id);
        // Use local pending timestamp if server timestamp not yet resolved
        const time = data.timestamp
          ? new Date(data.timestamp.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        renderMessage(data, id, time);
      }

      // When server timestamp resolves, update the time on the bubble
      if (change.type === "modified" && data.timestamp) {
        const existing = chatDiv.querySelector(`[data-id="${id}"] .msg-time`);
        if (existing) {
          existing.textContent = new Date(data.timestamp.toMillis())
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
      }
    });

    // Auto scroll to bottom
    chatDiv.scrollTop = chatDiv.scrollHeight;

  }, err => {
    console.error("Firestore error:", err);
    showError("⚠️ Could not connect. Make sure Firestore is enabled in your Firebase console and rules allow read/write.");
  });

// ─── Render a Single Message ───────────────────────────────────────
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
