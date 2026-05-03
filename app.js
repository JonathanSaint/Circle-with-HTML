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
const auth = firebase.auth();
const db   = firebase.firestore();

// Firebase persists auth sessions in localStorage by default —
// so the user stays signed in across browser restarts automatically.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ─── DOM refs ──────────────────────────────────────────────────────
const chatDiv      = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const loadingBar   = document.getElementById("loading-bar");
const nameBar      = document.getElementById("name-bar");
const userLabel    = document.getElementById("user-label");
const userLabelTxt = document.getElementById("user-label-text");

// ─── State ─────────────────────────────────────────────────────────
let currentUser = null; // display name string
let currentUID  = null; // Firebase UID
let unsubMessages = null; // snapshot listener cleanup

// ─── Auth: sign in anonymously and restore session ─────────────────
auth.onAuthStateChanged(async firebaseUser => {
  if (firebaseUser) {
    // Already signed in (returning visitor or just signed in)
    currentUID = firebaseUser.uid;
    await restoreOrPromptName(firebaseUser.uid);
  } else {
    // First ever visit — sign in anonymously
    try {
      const result = await auth.signInAnonymously();
      currentUID = result.user.uid;
      await restoreOrPromptName(result.user.uid);
    } catch (err) {
      console.error("Auth failed:", err);
      showError("Could not sign you in. Please refresh.");
    }
  }
});

// ─── Restore saved name or ask for one ────────────────────────────
async function restoreOrPromptName(uid) {
  loadingBar.classList.add("hidden");

  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists && doc.data().name) {
      // Returning user — restore their name silently
      activateUser(doc.data().name);
    } else {
      // New user — show name input
      nameBar.classList.remove("hidden");
      document.getElementById("username").focus();
    }
  } catch (err) {
    console.error("Could not fetch user profile:", err);
    nameBar.classList.remove("hidden");
  }
}

// ─── Set username (new users) ──────────────────────────────────────
async function setUsername() {
  const input = document.getElementById("username");
  const name  = input.value.trim();
  if (!name || !currentUID) return;

  // Save name to Firestore under their UID
  try {
    await db.collection("users").doc(currentUID).set({ name }, { merge: true });
    activateUser(name);
  } catch (err) {
    showError("Could not save your name. Check Firestore rules.");
    console.error(err);
  }
}

document.getElementById("username").addEventListener("keydown", e => {
  if (e.key === "Enter") setUsername();
});

// ─── Change name ───────────────────────────────────────────────────
async function changeName() {
  const newName = prompt("Enter a new display name:", currentUser || "");
  if (!newName || !newName.trim() || !currentUID) return;

  try {
    await db.collection("users").doc(currentUID).set({ name: newName.trim() }, { merge: true });
    activateUser(newName.trim());
  } catch (err) {
    showError("Could not update your name.");
    console.error(err);
  }
}

// ─── Activate the chat UI once user is identified ─────────────────
function activateUser(name) {
  currentUser = name;

  nameBar.classList.add("hidden");
  userLabel.classList.remove("hidden");
  userLabelTxt.textContent = "Chatting as " + name;

  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.focus();

  // Start listening for messages now that we know who we are
  startMessageListener();
}

// ─── Send Message ──────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  db.collection("messages").add({
    text,
    user: currentUser,
    uid: currentUID,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    showError("Failed to send message. Check Firestore rules.");
    console.error(err);
  });

  messageInput.value = "";
}

messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ─── Real-time Message Listener ────────────────────────────────────
const renderedIds = new Set();

function startMessageListener() {
  if (unsubMessages) unsubMessages(); // clean up any old listener

  unsubMessages = db.collection("messages")
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
  // Match on UID if available, fallback to name
  const isMine = currentUID
    ? data.uid === currentUID
    : data.user === currentUser;

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

    // Clear UI
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
