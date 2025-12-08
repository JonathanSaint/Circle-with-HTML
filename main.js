// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);