import { auth, signInWithEmailAndPassword, signOut } from "../firebase-config.js";

const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const signInButton = document.querySelector("#sign-in-btn");
const signOutButton = document.querySelector("#sign-out-btn");


signInButton.addEventListener("click", function(event) {
    event.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            window.location.assign("/index.html");
            console.log('Signed In:', user);
        }) 
        .catch((error) => {
            console.error('Sign In Error:', error.code, error.message)
        });

});

//Sign Out User
signOutButton.addEventListener('click', function() {
    console.log("User Signed Out");

    signOut(auth)
        .then(() => {
        window.location.assign("/login.html");
      })
      .catch((error) => {
        console.error('Sign Out Error:', error.code, error.message)
    })    
});
