// Sign-up
const signUpForm = document.querySelector('#sign-up-form');
signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signUpForm['sign-up-email'].value;
    const password = signUpForm['sign-up-password'].value;

    console.log(email, password);
    // Create user
    auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
        console.log('User signed up:', userCredential.user);
    }).catch((error) => {
        console.error('Error during sign-up:', error);
    });

    // Firebase Auth sign-up
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        alert('Sign-up successful!');
        signUpForm.reset();
    } catch (error) {
        alert('Error during sign-up: ' + error.message);
    }
});

// Login
const loginForm = document.querySelector('#login-form');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert('Login successful!');
        loginForm.reset();
    } catch (error) {
        alert('Error during login: ' + error.message);
    }
});