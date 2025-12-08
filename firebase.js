import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGslgsEPHZDg0S97-9y4Zp70DmfcNZ3Jo",
    authDomain: "circle-8bb5b.firebaseapp.com",
    projectId: "circle-8bb5b",
    storageBucket: "circle-8bb5b.firebasestorage.app",
    messagingSenderId: "398245900446",
    appId: "1:398245900446:web:a2a6d31ec4580fef618b8f",
    measurementId: "G-CQ2BCBDERL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
