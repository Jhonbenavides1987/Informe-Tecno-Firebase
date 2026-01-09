import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBewile8uMnTrciA5n1GsTsPAzYu246-Ps",
  authDomain: "informe-c87b9.firebaseapp.com",
  projectId: "informe-c87b9",
  storageBucket: "informe-c87b9.appspot.com",
  messagingSenderId: "27004985138",
  appId: "1:27004985138:web:5f079f33709fd4bf04012b",
  measurementId: "G-Y9340Y986S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const functions = getFunctions(app);

export { app, firestore, functions };
