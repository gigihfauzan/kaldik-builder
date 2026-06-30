/* Ganti config, lalu pakai modul ES di halaman terpisah atau bundler */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function simpanKeCloud(sekolahId, state) {
  await setDoc(doc(db, "kalender", sekolahId), state);
}

export async function muatDariCloud(sekolahId) {
  const snap = await getDoc(doc(db, "kalender", sekolahId));
  return snap.exists() ? snap.data() : null;
}
