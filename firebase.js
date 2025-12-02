// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider,} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
export const auth = getAuth(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDGslgsEPHZDg0S97-9y4Zp70DmfcNZ3Jo",
  authDomain: "circle-8bb5b.firebaseapp.com",
  projectId: "circle-8bb5b",
  storageBucket: "circle-8bb5b.firebasestorage.app",
  messagingSenderId: "398245900446",
  appId: "1:398245900446:web:a2a6d31ec4580fef618b8f",
  measurementId: "G-CQ2BCBDERL"
};
// OPEN POPUPS
document.getElementById("openLogin").onclick = () => {
    document.getElementById("loginPopup").style.display = "flex";
};

document.getElementById("openSignup").onclick = () => {
    document.getElementById("signupPopup").style.display = "flex";
};

// CLOSE POPUPS
document.getElementById("closePopup").onclick = () => {
    document.getElementById("loginPopup").style.display = "none";
};

document.getElementById("closeSignupPopup").onclick = () => {
    document.getElementById("signupPopup").style.display = "none";
};

// SIGN UP USER
document.getElementById("signupBtn").onclick = async () => {
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully!");
        window.location.href = "home.html";
    } catch (error) {
        document.getElementById("signupError").innerText = error.message;
    }
};

// LOG IN USER
document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful!");
        window.location.href = "home.html";
    } catch (error) {
        document.getElementById("loginError").innerText = error.message;
    }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);