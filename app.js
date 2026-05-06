// ─── Firebase Config ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDUSCi_iVm6ZBeT97slFcPUc0mWfsDcqhY",
  authDomain: "chatrr-5fbc7.firebaseapp.com",
  projectId: "chatrr-5fbc7",
  storageBucket: "chatrr-5fbc7.firebasestorage.app",
  messagingSenderId: "610089433520",
  appId: "1:610089433520:web:6d1cdb55911d046a327e75"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─── State ─────────────────────────────────────────────────────────
let currentUser     = null;  // { uid, username }
let activeRoom      = null;  // 'global' | 'private:<roomId>'
let unsubMessages   = null;
let visitedRooms    = JSON.parse(localStorage.getItem("circle_rooms") || "[]");
const renderedIds   = new Set();

// ─── DOM helpers ───────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

// ─── Boot ──────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("circle_session");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      bootApp();
      return;
    } catch(e) { localStorage.removeItem("circle_session"); }
  }
  show("auth-screen");
});

// ─── AUTH TABS ─────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b, i) =>
    b.classList.toggle("active", (i === 0) === (tab === "login"))
  );
  tab === "login" ? (show("login-form"), hide("register-form"))
                  : (hide("login-form"), show("register-form"));
}

// ─── REGISTER ──────────────────────────────────────────────────────
async function registerUser() {
  const username  = $("reg-username").value.trim().toLowerCase();
  const password  = $("reg-password").value;
  const password2 = $("reg-password2").value;
  const errEl     = $("reg-error");

  hide("reg-error");

  if (!username || username.length < 3)
    return showFormError(errEl, "Username must be at least 3 characters.");
  if (!/^[a-z0-9_]+$/.test(username))
    return showFormError(errEl, "Username can only contain letters, numbers, underscores.");
  if (!password || password.length < 6)
    return showFormError(errEl, "Password must be at least 6 characters.");
  if (password !== password2)
    return showFormError(errEl, "Passwords don't match.");

  try {
    // Check username taken
    const existing = await db.collection("users").doc(username).get();
    if (existing.exists) return showFormError(errEl, "Username already taken.");

    // Hash password (simple SHA-256 via Web Crypto)
    const hash = await hashPassword(password);
    const uid  = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

    await db.collection("users").doc(username).set({
      uid, username, passwordHash: hash, createdAt: Date.now()
    });

    currentUser = { uid, username };
    localStorage.setItem("circle_session", JSON.stringify(currentUser));
    bootApp();
  } catch(err) {
    showFormError(errEl, "Could not create account. Check Firestore rules.");
    console.error(err);
  }
}

// ─── SIGN IN ───────────────────────────────────────────────────────
async function signIn() {
  const username = $("login-username").value.trim().toLowerCase();
  const password = $("login-password").value;
  const errEl    = $("login-error");

  hide("login-error");

  if (!username || !password)
    return showFormError(errEl, "Please enter username and password.");

  try {
    const doc = await db.collection("users").doc(username).get();
    if (!doc.exists) return showFormError(errEl, "Account not found.");

    const data = doc.data();
    const hash = await hashPassword(password);

    if (hash !== data.passwordHash)
      return showFormError(errEl, "Incorrect password.");

    currentUser = { uid: data.uid, username: data.username };
    localStorage.setItem("circle_session", JSON.stringify(currentUser));
    bootApp();
  } catch(err) {
    showFormError(errEl, "Sign in failed. Try again.");
    console.error(err);
  }
}

// ─── SIGN OUT ──────────────────────────────────────────────────────
function signOutUser() {
  if (!confirm("Sign out?")) return;
  localStorage.removeItem("circle_session");
  currentUser = null;
  activeRoom  = null;
  if (unsubMessages) { unsubMessages(); unsubMessages = null; }
  renderedIds.clear();
  hide("app-screen");
  $("login-username").value = "";
  $("login-password").value = "";
  show("auth-screen");
}

// ─── DELETE ACCOUNT ────────────────────────────────────────────────
async function deleteAccount() {
  if (!confirm("Delete your account permanently? This cannot be undone.")) return;
  try {
    await db.collection("users").doc(currentUser.username).delete();
    localStorage.removeItem("circle_session");
    localStorage.removeItem("circle_rooms");
    currentUser = null;
    if (unsubMessages) { unsubMessages(); unsubMessages = null; }
    renderedIds.clear();
    hide("app-screen");
    show("auth-screen");
  } catch(err) {
    alert("Could not delete account. Check Firestore rules.");
    console.error(err);
  }
}

// ─── BOOT APP ──────────────────────────────────────────────────────
function bootApp() {
  hide("auth-screen");
  show("app-screen");

  $("sidebar-username").textContent = currentUser.username;
  $("sidebar-avatar").textContent   = currentUser.username[0].toUpperCase();

  renderRoomsList();
  openGlobalChat();
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function toggleSidebar() {
  $("sidebar").classList.toggle("open");
  $("sidebar-overlay").classList.toggle("hidden");
}

// ─── GLOBAL CHAT ───────────────────────────────────────────────────
function openGlobalChat() {
  activeRoom = "global";
  $("chat-title").textContent    = "Global Chat";
  $("chat-subtitle").textContent = "Everyone online";
  $("nav-global").classList.add("active");
  $("nav-rooms").classList.remove("active");
  hide("rooms-panel");
  show("chat");
  show("input-area");
  closeSidebarOnMobile();
  resetChat();
  startMessageListener("messages");
}

// ─── ROOMS PANEL ───────────────────────────────────────────────────
function showRoomsPanel() {
  $("nav-rooms").classList.add("active");
  $("nav-global").classList.remove("active");
  $("chat-title").textContent    = "Private Rooms";
  $("chat-subtitle").textContent = "";
  hide("chat");
  hide("input-area");
  show("rooms-panel");
  closeSidebarOnMobile();
  renderRoomsList();
}

async function openPrivateRoom() {
  const target = $("room-username-input").value.trim().toLowerCase();
  const errEl  = $("room-error");
  hide("room-error");

  if (!target) return;
  if (target === currentUser.username)
    return showFormError(errEl, "You can't chat with yourself.");

  // Verify user exists
  try {
    const doc = await db.collection("users").doc(target).get();
    if (!doc.exists) return showFormError(errEl, `User "${target}" not found.`);
  } catch(err) {
    return showFormError(errEl, "Could not verify user. Try again.");
  }

  $("room-username-input").value = "";

  // Room ID is deterministic: sorted pair joined by '_'
  const roomId = [currentUser.username, target].sort().join("_");

  // Save to visited rooms
  if (!visitedRooms.find(r => r.id === roomId)) {
    visitedRooms.push({ id: roomId, with: target });
    localStorage.setItem("circle_rooms", JSON.stringify(visitedRooms));
  }

  enterPrivateRoom(roomId, target);
}

function enterPrivateRoom(roomId, withUser) {
  activeRoom = "private:" + roomId;
  $("chat-title").textContent    = withUser;
  $("chat-subtitle").textContent = "Private room";
  $("nav-rooms").classList.add("active");
  $("nav-global").classList.remove("active");
  hide("rooms-panel");
  show("chat");
  show("input-area");
  closeSidebarOnMobile();
  resetChat();
  startMessageListener("privateRooms/" + roomId + "/messages");
}

function renderRoomsList() {
  const list = $("rooms-list");
  list.innerHTML = "";
  if (visitedRooms.length === 0) {
    list.innerHTML = '<p class="rooms-empty">No rooms yet. Start one above.</p>';
    return;
  }
  visitedRooms.forEach(room => {
    const btn = document.createElement("button");
    btn.className = "room-item";
    btn.innerHTML = `
      <div class="room-avatar">${room.with[0].toUpperCase()}</div>
      <div class="room-info">
        <div class="room-name">${room.with}</div>
        <div class="room-sub">Private · Tap to open</div>
      </div>
    `;
    btn.onclick = () => enterPrivateRoom(room.id, room.with);
    list.appendChild(btn);
  });
}

// ─── SEND MESSAGE ──────────────────────────────────────────────────
function sendMessage() {
  const text = $("messageInput").value.trim();
  if (!text || !currentUser || !activeRoom) return;

  const collection = activeRoom === "global"
    ? "messages"
    : "privateRooms/" + activeRoom.replace("private:", "") + "/messages";

  db.collection(collection).add({
    text,
    user: currentUser.username,
    uid:  currentUser.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    showChatError("Failed to send. Check Firestore rules.");
    console.error(err);
  });

  $("messageInput").value = "";
}

$("messageInput").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ─── MESSAGE LISTENER ──────────────────────────────────────────────
function startMessageListener(collectionPath) {
  if (unsubMessages) { unsubMessages(); unsubMessages = null; }

  unsubMessages = db.collection(collectionPath)
    .orderBy("timestamp")
    .onSnapshot({ includeMetadataChanges: true }, snapshot => {
      const welcome = $("chat").querySelector(".welcome-msg");
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
          const timeEl = $("chat").querySelector(`[data-id="${id}"] .msg-time`);
          if (timeEl) timeEl.textContent = new Date(data.timestamp.toMillis())
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
      });

      $("chat").scrollTop = $("chat").scrollHeight;

    }, err => {
      console.error("Firestore error:", err);
      showChatError("Could not connect. Check Firestore rules.");
    });
}

// ─── RENDER BUBBLE ─────────────────────────────────────────────────
function renderMessage(data, id, time) {
  const isMine = data.uid === currentUser.uid || data.user === currentUser.username;

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
  $("chat").appendChild(wrapper);
}

// ─── CLEAR CHAT ────────────────────────────────────────────────────
async function clearChat() {
  if (!confirm("Delete all your messages in this chat?")) return;

  const collectionPath = activeRoom === "global"
    ? "messages"
    : "privateRooms/" + activeRoom.replace("private:", "") + "/messages";

  try {
    // Only fetch messages belonging to the signed-in user
    const snapshot = await db.collection(collectionPath)
      .where("user", "==", currentUser.username)
      .get();

    if (snapshot.empty) {
      showChatError("You have no messages to delete here.");
      return;
    }

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Remove only the deleted user's bubbles from the UI
    snapshot.forEach(doc => {
      const el = $("chat").querySelector(`[data-id="${doc.id}"]`);
      if (el) el.remove();
      renderedIds.delete(doc.id);
    });

  } catch(err) {
    showChatError("Could not delete your messages. Check Firestore rules.");
    console.error(err);
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────
function resetChat() {
  if (unsubMessages) { unsubMessages(); unsubMessages = null; }
  renderedIds.clear();
  $("chat").innerHTML = '<div class="welcome-msg">👋 Say something...</div>';
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 700) {
    $("sidebar").classList.remove("open");
    $("sidebar-overlay").classList.add("hidden");
  }
}

function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function showChatError(msg) {
  const err = document.createElement("div");
  err.className = "error-banner";
  err.textContent = msg;
  $("chat").prepend(err);
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function hashPassword(password) {
  const enc  = new TextEncoder().encode(password);
  const buf  = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
