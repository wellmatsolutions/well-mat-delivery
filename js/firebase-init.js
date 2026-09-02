// Khởi tạo Firebase App + Firestore + Authentication (SDK v10, dạng module qua CDN)
// Lưu ý: KHÔNG dùng Firebase Storage — kể từ 03/2026 Storage bắt buộc gói Blaze
// (phải khai thẻ ngân hàng). Thay vào đó, ảnh/chữ ký được nén nhỏ và lưu trực
// tiếp trong Firestore (vẫn ở gói Spark miễn phí hoàn toàn).
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
  onAuthStateChanged, signInWithEmailAndPassword, signOut
};
