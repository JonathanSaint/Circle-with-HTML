// ─── Firebase Config ───────────────────────────────────────────────
const firebaseConfig = {
apiKey: “AIzaSyDUSCi_iVm6ZBeT97slFcPUc0mWfsDcqhY”,
authDomain: “chatrr-5fbc7.firebaseapp.com”,
projectId: “chatrr-5fbc7”,
storageBucket: “chatrr-5fbc7.firebasestorage.app”,
messagingSenderId: “610089433520”,
appId: “1:610089433520:web:6d1cdb55911d046a327e75”
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─── State ─────────────────────────────────────────────────────────
let currentUser   = null; // { username, uid }
let activeRoom    = null;
let unsubMessages = null;
let visitedRooms  = [];
const renderedIds = new Set();
const unsubUnread = {};
let unreadCounts  = {};

// debounce timer for real-time username check
let usernameCheckTimer = null;

// ─── DOM helpers ───────────────────────────────────────────────────
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove(“hidden”);
const hide = id => $(id).classList.add(“hidden”);

function setError(id, msg) {
const el = $(id);
el.textContent = msg;
msg ? el.classList.remove(“hidden”) : el.classList.add(“hidden”);
}

// ─── BOOT ──────────────────────────────────────────────────────────
window.addEventListener(“DOMContentLoaded”, () => {
const session = localStorage.getItem(“nc_session”);
if (session) {
try {
const user = JSON.parse(session);
currentUser = user;
bootApp();
return;
} catch(e) { localStorage.removeItem(“nc_session”); }
}
showAuthScreen();

// Real-time username availability check on signup
$(“su-username”).addEventListener(“input”, () => {
clearTimeout(usernameCheckTimer);
const val = $(“su-username”).value.trim().toLowerCase();
const status = $(“su-username-status”);
setError(“su-username-error”, “”);

```
if (!val) { status.textContent = ""; status.className = "field-status"; return; }
if (val.length < 2) {
  status.textContent = "Too short";
  status.className = "field-status error";
  return;
}
if (!/^[a-zA-Z0-9_]+$/.test(val)) {
  status.textContent = "Letters, numbers, _ only";
  status.className = "field-status error";
  return;
}

status.textContent = "Checking…";
status.className = "field-status checking";

usernameCheckTimer = setTimeout(async () => {
  try {
    const doc = await db.collection("users").doc(val).get();
    if (doc.exists) {
      status.textContent = "✗ Taken";
      status.className = "field-status error";
    } else {
      status.textContent = "✓ Available";
      status.className = "field-status ok";
    }
  } catch(e) {
    status.textContent = "";
    status.className = "field-status";
  }
}, 400);
```

});

// Enter key support
[“si-username”, “si-password”].forEach(id => {
$(id).addEventListener(“keydown”, e => { if (e.key === “Enter”) signIn(); });
});
[“su-username”, “su-password”, “su-password2”].forEach(id => {
$(id).addEventListener(“keydown”, e => { if (e.key === “Enter”) signUp(); });
});
});

// ─── AUTH SCREEN ───────────────────────────────────────────────────
function showAuthScreen() {
$(“auth-screen”).classList.remove(“hidden”);
$(“sidebar”).classList.add(“app-hidden”);
$(“sidebar-overlay”).classList.add(“hidden”);
$(“main-panel”).classList.add(“app-hidden”);
}

function hideAuthScreen() {
$(“auth-screen”).classList.add(“hidden”);
$(“sidebar”).classList.remove(“app-hidden”);
$(“main-panel”).classList.remove(“app-hidden”);
}

function switchTab(tab) {
$(“tab-signin”).classList.toggle(“active”, tab === “signin”);
$(“tab-signup”).classList.toggle(“active”, tab === “signup”);
tab === “signin” ? (show(“form-signin”), hide(“form-signup”))
: (hide(“form-signin”), show(“form-signup”));
setError(“si-error”, “”);
setError(“su-error”, “”);
setError(“su-username-error”, “”);
}

function togglePw(inputId, btn) {
const input = $(inputId);
const isText = input.type === “text”;
input.type = isText ? “password” : “text”;
btn.textContent = isText ? “👁” : “🙈”;
}

// ─── SIGN IN ───────────────────────────────────────────────────────
async function signIn() {
const username = $(“si-username”).value.trim().toLowerCase();
const password = $(“si-password”).value;
setError(“si-error”, “”);

if (!username) return setError(“si-error”, “Enter your username.”);
if (!password) return setError(“si-error”, “Enter your password.”);

const btn = $(“si-btn”);
btn.disabled = true;
btn.textContent = “Signing in…”;

try {
const doc = await db.collection(“users”).doc(username).get();
if (!doc.exists) {
setError(“si-error”, “No account found with that username.”);
return;
}
const data = doc.data();
const hash = await sha256(password);
if (hash !== data.passwordHash) {
setError(“si-error”, “Incorrect password.”);
return;
}
currentUser = { username: data.username, uid: data.uid };
localStorage.setItem(“nc_session”, JSON.stringify(currentUser));
bootApp();
} catch(err) {
setError(“si-error”, “Sign in failed. Check your connection.”);
console.error(err);
} finally {
btn.disabled = false;
btn.textContent = “Sign In”;
}
}

// ─── SIGN UP ───────────────────────────────────────────────────────
async function signUp() {
const username  = $(“su-username”).value.trim().toLowerCase();
const password  = $(“su-password”).value;
const password2 = $(“su-password2”).value;
const status    = $(“su-username-status”);
setError(“su-error”, “”);

if (!username || username.length < 2)
return setError(“su-error”, “Username must be at least 2 characters.”);
if (!/^[a-zA-Z0-9_]+$/.test(username))
return setError(“su-error”, “Username: letters, numbers, underscores only.”);
if (!password)
return setError(“su-error”, “Enter a password.”);
if (password !== password2)
return setError(“su-error”, “Passwords don’t match.”);
if (status.classList.contains(“error”))
return setError(“su-error”, “Choose a different username.”);

const btn = $(“su-btn”);
btn.disabled = true;
btn.textContent = “Creating account…”;

try {
// Double-check username not taken (in case user bypassed debounce)
const existing = await db.collection(“users”).doc(username).get();
if (existing.exists) {
setError(“su-error”, “That username is already taken.”);
status.textContent = “✗ Taken”;
status.className = “field-status error”;
return;
}

```
const uid  = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
const hash = await sha256(password);

await db.collection("users").doc(username).set({
  username,
  uid,
  passwordHash: hash,
  createdAt: Date.now()
});

currentUser = { username, uid };
localStorage.setItem("nc_session", JSON.stringify(currentUser));
bootApp();
```

} catch(err) {
setError(“su-error”, “Could not create account. Check Firestore rules.”);
console.error(err);
} finally {
btn.disabled = false;
btn.textContent = “Create Account”;
}
}

// ─── SIGN OUT ──────────────────────────────────────────────────────
function signOut() {
if (!confirm(“Sign out?”)) return;
localStorage.removeItem(“nc_session”);
// clean up listeners
Object.values(unsubUnread).forEach(u => u && u());
if (unsubMessages) unsubMessages();
currentUser = null; activeRoom = null;
renderedIds.clear(); unreadCounts = {};
visitedRooms = [];
// reset UI
$(“si-username”).value = “”;
$(“si-password”).value = “”;
switchTab(“signin”);
showAuthScreen();
closeSidebarOnMobile();
}

// ─── DELETE ACCOUNT ────────────────────────────────────────────────
async function deleteAccount() {
if (!confirm(“Permanently delete your account? This cannot be undone.”)) return;
try {
await db.collection(“users”).doc(currentUser.username).delete();
localStorage.removeItem(“nc_session”);
localStorage.removeItem(“nc_rooms_” + currentUser.username);
Object.values(unsubUnread).forEach(u => u && u());
if (unsubMessages) unsubMessages();
currentUser = null; activeRoom = null;
renderedIds.clear(); unreadCounts = {};
visitedRooms = [];
switchTab(“signin”);
showAuthScreen();
} catch(err) {
alert(“Could not delete account. Check Firestore rules.”);
console.error(err);
}
}

// ─── BOOT APP ──────────────────────────────────────────────────────
function bootApp() {
visitedRooms = JSON.parse(
localStorage.getItem(“nc_rooms_” + currentUser.username) || “[]”
);
hideAuthScreen();
$(“sidebar-username”).textContent = currentUser.username;
$(“sidebar-avatar”).textContent   = currentUser.username[0].toUpperCase();
$(“messageInput”).disabled = false;
$(“sendBtn”).disabled      = false;
show(“clearBtn”);
renderRoomsList();
startUnreadListener(“global”, “messages”);
visitedRooms.forEach(r =>
startUnreadListener(r.id, “privateRooms/” + r.id + “/messages”)
);
openGlobalChat();
}

// ─── SIDEBAR ───────────────────────────────────────────────────────
function toggleSidebar() {
$(“sidebar”).classList.toggle(“open”);
$(“sidebar-overlay”).classList.toggle(“hidden”);
}

function closeSidebarOnMobile() {
if (window.innerWidth < 700) {
$(“sidebar”).classList.remove(“open”);
$(“sidebar-overlay”).classList.add(“hidden”);
}
}

// ─── GLOBAL CHAT ───────────────────────────────────────────────────
function openGlobalChat() {
activeRoom = “global”;
$(“chat-title”).textContent    = “Global Chat”;
$(“chat-subtitle”).textContent = “Everyone online”;
$(“nav-global”).classList.add(“active”);
$(“nav-rooms”).classList.remove(“active”);
hide(“rooms-panel”);
show(“chat”);
show(“input-area”);
closeSidebarOnMobile();
resetChat();
markRead(“global”);
startMessageListener(“messages”);
}

// ─── PRIVATE ROOMS ─────────────────────────────────────────────────
function showRoomsPanel() {
$(“nav-rooms”).classList.add(“active”);
$(“nav-global”).classList.remove(“active”);
$(“chat-title”).textContent    = “Private Rooms”;
$(“chat-subtitle”).textContent = “”;
hide(“chat”);
hide(“input-area”);
show(“rooms-panel”);
closeSidebarOnMobile();
renderRoomsList();
}

async function openPrivateRoom() {
const target = $(“room-username-input”).value.trim().toLowerCase();
const errEl  = $(“room-error”);
setError(“room-error”, “”);

if (!target) return;
if (target === currentUser.username)
return setError(“room-error”, “You can’t chat with yourself.”);

// Verify user exists in Firestore
try {
const doc = await db.collection(“users”).doc(target).get();
if (!doc.exists)
return setError(“room-error”, `No user found with username "${target}".`);
} catch(e) {
return setError(“room-error”, “Could not verify user. Try again.”);
}

$(“room-username-input”).value = “”;
const roomId = [currentUser.username, target].sort().join(”_”);

if (!visitedRooms.find(r => r.id === roomId)) {
visitedRooms.push({ id: roomId, with: target });
localStorage.setItem(“nc_rooms_” + currentUser.username, JSON.stringify(visitedRooms));
startUnreadListener(roomId, “privateRooms/” + roomId + “/messages”);
}

enterPrivateRoom(roomId, target);
}

function enterPrivateRoom(roomId, withUser) {
activeRoom = “private:” + roomId;
$(“chat-title”).textContent    = withUser;
$(“chat-subtitle”).textContent = “Private room”;
$(“nav-rooms”).classList.add(“active”);
$(“nav-global”).classList.remove(“active”);
hide(“rooms-panel”);
show(“chat”);
show(“input-area”);
closeSidebarOnMobile();
resetChat();
markRead(roomId);
startMessageListener(“privateRooms/” + roomId + “/messages”);
}

function renderRoomsList() {
const list = $(“rooms-list”);
list.innerHTML = “”;
if (visitedRooms.length === 0) {
list.innerHTML = ‘<p class="rooms-empty">No rooms yet. Start one above.</p>’;
return;
}
visitedRooms.forEach(room => {
const count = unreadCounts[room.id] || 0;
const btn = document.createElement(“button”);
btn.className = “room-item”;
btn.id = “room-item-” + room.id;
btn.innerHTML = `<div class="room-avatar">${escapeHtml(room.with[0].toUpperCase())}</div> <div class="room-info"> <div class="room-name">${escapeHtml(room.with)}</div> <div class="room-sub">Private · Tap to open</div> </div> <div class="badge ${count === 0 ? "hidden" : ""}">${count > 99 ? "99+" : count}</div>`;
btn.onclick = () => enterPrivateRoom(room.id, room.with);
list.appendChild(btn);
});
}

// ─── UNREAD TRACKING ───────────────────────────────────────────────
function getSeenTs(key) {
return parseInt(localStorage.getItem(“nc_seen_” + key) || “0”, 10);
}
function setSeenTs(key, ts) {
localStorage.setItem(“nc_seen_” + key, String(ts));
}
function markRead(key) {
setSeenTs(key, Date.now());
unreadCounts[key] = 0;
updateBadges();
}

function startUnreadListener(roomKey, collectionPath) {
if (unsubUnread[roomKey]) return;
unsubUnread[roomKey] = db.collection(collectionPath)
.orderBy(“timestamp”)
.onSnapshot(snapshot => {
const isActive = activeRoom === (roomKey === “global” ? “global” : “private:” + roomKey);
if (isActive) { markRead(roomKey); return; }

```
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.timestamp) return;
    if (data.timestamp.toMillis() > getSeenTs(roomKey) && data.user !== currentUser.username)
      count++;
  });
  unreadCounts[roomKey] = count;
  updateBadges();
}, err => console.error("Unread listener:", err));
```

}

function updateBadges() {
const globalCount = unreadCounts[“global”] || 0;
const globalBadge = $(“badge-global”);
if (globalBadge) {
globalBadge.textContent = globalCount > 99 ? “99+” : globalCount;
globalBadge.classList.toggle(“hidden”, globalCount === 0);
}

const privateTotal = Object.entries(unreadCounts)
.filter(([k]) => k !== “global”)
.reduce((s, [, v]) => s + v, 0);
const roomsBadge = $(“badge-rooms”);
if (roomsBadge) {
roomsBadge.textContent = privateTotal > 99 ? “99+” : privateTotal;
roomsBadge.classList.toggle(“hidden”, privateTotal === 0);
}

visitedRooms.forEach(room => {
const item = $(“room-item-” + room.id);
if (!item) return;
const badge = item.querySelector(”.badge”);
if (!badge) return;
const count = unreadCounts[room.id] || 0;
badge.textContent = count > 99 ? “99+” : count;
badge.classList.toggle(“hidden”, count === 0);
});
}

// ─── SEND MESSAGE ──────────────────────────────────────────────────
function sendMessage() {
const text = $(“messageInput”).value.trim();
if (!text || !currentUser || !activeRoom) return;

const path = activeRoom === “global”
? “messages”
: “privateRooms/” + activeRoom.replace(“private:”, “”) + “/messages”;

db.collection(path).add({
text,
user: currentUser.username,
uid: currentUser.uid,
timestamp: firebase.firestore.FieldValue.serverTimestamp()
}).catch(err => {
showChatError(“Failed to send. Check Firestore rules.”);
console.error(err);
});

$(“messageInput”).value = “”;
}

$(“messageInput”).addEventListener(“keydown”, e => {
if (e.key === “Enter”) sendMessage();
});

// ─── MESSAGE LISTENER ──────────────────────────────────────────────
function startMessageListener(collectionPath) {
if (unsubMessages) { unsubMessages(); unsubMessages = null; }

unsubMessages = db.collection(collectionPath)
.orderBy(“timestamp”)
.onSnapshot({ includeMetadataChanges: true }, snapshot => {
const welcome = $(“chat”).querySelector(”.welcome-msg”);
if (welcome && snapshot.size > 0) welcome.remove();

```
  snapshot.docChanges().forEach(change => {
    const doc = change.doc, data = doc.data(), id = doc.id;
    if (change.type === "added" && !renderedIds.has(id)) {
      renderedIds.add(id);
      const time = data.timestamp
        ? new Date(data.timestamp.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      renderMessage(data, id, time);
    }
    if (change.type === "modified" && data.timestamp) {
      const el = $("chat").querySelector(`[data-id="${id}"] .msg-time`);
      if (el) el.textContent = new Date(data.timestamp.toMillis())
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  });
  $("chat").scrollTop = $("chat").scrollHeight;
}, err => {
  console.error("Firestore:", err);
  showChatError("Could not connect. Check Firestore rules.");
});
```

}

// ─── RENDER BUBBLE ─────────────────────────────────────────────────
function renderMessage(data, id, time) {
const isMine = data.uid === currentUser.uid || data.user === currentUser.username;
const wrapper = document.createElement(“div”);
wrapper.classList.add(“msg-wrapper”, isMine ? “mine” : “theirs”);
wrapper.dataset.id = id;
const bubble = document.createElement(“div”);
bubble.classList.add(“bubble”);
bubble.innerHTML = `${!isMine ?`<div class="msg-user">${escapeHtml(data.user)}</div>`: ""} <div class="msg-text">${escapeHtml(data.text)}</div> <div class="msg-time">${time}</div>`;
wrapper.appendChild(bubble);
$(“chat”).appendChild(wrapper);
}

// ─── CLEAR MY MESSAGES ─────────────────────────────────────────────
async function clearChat() {
if (!confirm(“Delete all your messages in this chat?”)) return;
const path = activeRoom === “global”
? “messages”
: “privateRooms/” + activeRoom.replace(“private:”, “”) + “/messages”;
try {
const snap = await db.collection(path).where(“user”, “==”, currentUser.username).get();
if (snap.empty) return showChatError(“You have no messages to delete here.”);
const batch = db.batch();
snap.forEach(doc => batch.delete(doc.ref));
await batch.commit();
snap.forEach(doc => {
const el = $(“chat”).querySelector(`[data-id="${doc.id}"]`);
if (el) el.remove();
renderedIds.delete(doc.id);
});
} catch(err) {
showChatError(“Could not delete messages. Check Firestore rules.”);
console.error(err);
}
}

// ─── HELPERS ───────────────────────────────────────────────────────
function resetChat() {
if (unsubMessages) { unsubMessages(); unsubMessages = null; }
renderedIds.clear();
$(“chat”).innerHTML = ‘<div class="welcome-msg">👋 Say something…</div>’;
}

function showChatError(msg) {
const wrap = document.createElement(“div”);
wrap.className = “error-banner”;
wrap.innerHTML = `<span>${escapeHtml(msg)}</span><button class="error-close" onclick="this.parentElement.remove()">✕</button>`;
$(“chat”).prepend(wrap);
}

function escapeHtml(str) {
return str.replace(/&/g,”&”).replace(/</g,”<”).replace(/>/g,”>”).replace(/”/g,”"”);
}

async function sha256(str) {
const buf = await crypto.subtle.digest(“SHA-256”, new TextEncoder().encode(str));
return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,“0”)).join(””);
}