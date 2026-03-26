import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {getDatabase} from "firebase/database";
const firebaseConfig = {
  
  apiKey: "AIzaSyCCxkOCbYAe6OnucKI0G6HEZuBHC8OeNVI",
  authDomain: "customer-support-chat-system.firebaseapp.com",
  databaseURL: "https://customer-support-chat-system-default-rtdb.firebaseio.com",
  projectId: "customer-support-chat-system",
  storageBucket: "customer-support-chat-system.firebasestorage.app",
  messagingSenderId: "393821509330",
  appId: "1:393821509330:web:f845d59a9061d0a2347f0b",
  measurementId: "G-6T6QJVE90S"
  
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb=getDatabase(app);
export default app;