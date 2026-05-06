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
let currentUser   = null;  // string username
let activeRoom    = null;  // 'global' | 'private:<roomId>'
let unsubMessages = null;
let visitedRooms  = JSON.parse(localStorage.getItem("circle_rooms") || "[]");
const renderedIds = new Set();

// ─── DOM helpers ───────────────────────────────────────────────────
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

// ─── Boot ──────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("circle_username");
  if (saved) {
    activateUser(saved);
  }
  // name-screen is visible by default (no hidden class in HTML)
});

// ─── SET USERNAME ──────────────────────────────────────────────────
function setUsername() {
  const input = $("username-input");
  const name  = input.value.trim();
  const errEl = $("name-error");
  hide("name-error");

  if (!name || name.length < 2)
    return showFormError(errEl, "Username must be at least 2 characters.");
  if (!/^[a-zA-Z0-9_ ]+$/.test(name))
    return showFormError(errEl, "Only letters, numbers, spaces and underscores allowed.");

  localStorage.setItem("circle_username", name);
  activateUser(name);
}

$("username-input").addEventListener("keydown", e => {
  if (e.key === "Enter") setUsername();
});

// ─── CHANGE USERNAME ───────────────────────────────────────────────
function changeUsername() {
  const newName = prompt("Enter a new display name:", currentUser || "");
  if (!newName || !newName.trim()) return;
  const name = newName.trim();
  localStorage.setItem("circle_username", name);
  currentUser = name;
  $("sidebar-username").textContent = name;
  $("sidebar-avatar").textContent   = name[0].toUpperCase();
  closeSidebarOnMobile();
}

// ─── ACTIVATE USER ─────────────────────────────────────────────────
function activateUser(name) {
  currentUser = name;
  hide("name-screen");
  $("sidebar-username").textContent = name;
  $("sidebar-avatar").textContent   = name[0].toUpperCase();
  $("messageInput").disabled = false;
  $("sendBtn").disabled      = false;
  show("clearBtn");
  renderRoomsList();
  openGlobalChat();
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function toggleSidebar() {
  $("sidebar").classList.toggle("open");
  $("sidebar-overlay").classList.toggle("hidden");
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 700) {
    $("sidebar").classList.remove("open");
    $("sidebar-overlay").classList.add("hidden");
  }
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

// ─── PRIVATE ROOMS ─────────────────────────────────────────────────
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

function openPrivateRoom() {
  const target = $("room-username-input").value.trim();
  const errEl  = $("room-error");
  hide("room-error");

  if (!target) return;
  if (target.toLowerCase() === currentUser.toLowerCase())
    return showFormError(errEl, "You can't chat with yourself.");

  $("room-username-input").value = "";

  // Room ID: sorted pair so it's the same from both sides
  const roomId = [currentUser.toLowerCase(), target.toLowerCase()].sort().join("_");

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
        <div class="room-name">${escapeHtml(room.with)}</div>
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

  const collectionPath = activeRoom === "global"
    ? "messages"
    : "privateRooms/" + activeRoom.replace("private:", "") + "/messages";

  db.collection(collectionPath).add({
    text,
    user: currentUser,
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
  $("chat").appendChild(wrapper);
}

// ─── CLEAR MY MESSAGES ─────────────────────────────────────────────
async function clearChat() {
  if (!confirm("Delete all your messages in this chat?")) return;

  const collectionPath = activeRoom === "global"
    ? "messages"
    : "privateRooms/" + activeRoom.replace("private:", "") + "/messages";

  try {
    const snapshot = await db.collection(collectionPath)
      .where("user", "==", currentUser)
      .get();

    if (snapshot.empty) {
      showChatError("You have no messages to delete here.");
      return;
    }

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

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
