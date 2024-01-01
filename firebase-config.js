// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2y-P5OEn2JFXSyWUjbC-7GoAv4HI5_UU",
  authDomain: "chuck-stewart-archive.firebaseapp.com",
  projectId: "chuck-stewart-archive",
  storageBucket: "chuck-stewart-archive.appspot.com",
  messagingSenderId: "191651204993",
  appId: "1:191651204993:web:7e0738e8e79fea3a03e280",
  measurementId: "G-158TYLMTEX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { analytics, auth, signInWithEmailAndPassword, signOut};
