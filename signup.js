import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const form = document.getElementById("signupForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = form.email.value;
  const password = form.password.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Account created!");
      window.location.href = "login.html";
    })
    .catch((error) => alert(error.message));
});
