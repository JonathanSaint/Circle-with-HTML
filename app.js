// Your Firebase config (you will get this from Firebase)
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

const chatDiv = document.getElementById("chat");

// Send message
function sendMessage() {
  const input = document.getElementById("messageInput");
  const username = document.getElementById("username");

  if (!input.value || !username.value) return;

  db.collection("messages").add({
    text: input.value,
    user: username.value,
    timestamp: Date.now()
  });

  input.value = "";
}

// Display messages
db.collection("messages")
  .orderBy("timestamp")
  .onSnapshot(snapshot => {
    chatDiv.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();

      const msg = document.createElement("div");
      msg.classList.add("message");

      msg.innerHTML = `
        <div class="username">${data.user}</div>
        <div>${data.text}</div>
      `;

      chatDiv.appendChild(msg);
    });

    // Auto scroll to bottom
    chatDiv.scrollTop = chatDiv.scrollHeight;
  });