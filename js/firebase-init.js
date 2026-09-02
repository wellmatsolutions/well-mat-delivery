// Khởi tạo Firebase App + Firestore + Storage (SDK v10, dạng module qua CDN)
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadString, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, serverTimestamp,
  ref, uploadString, uploadBytes, getDownloadURL
};
