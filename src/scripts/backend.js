import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, setDoc, Timestamp, where, writeBatch, } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyAn2ji3I_bry26KAs6pyngLe2qNV7SHkz4",
    authDomain: "yappaholic-feea8.firebaseapp.com",
    projectId: "yappaholic-feea8",
    storageBucket: "yappaholic-feea8.firebasestorage.app",
    messagingSenderId: "819856624413",
    appId: "1:819856624413:web:4ba07c55a19d9da0282ff4",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// Authentication
export function getCurrentUser() {
    return auth.currentUser;
}
export async function getUserById(uid) {
    const userDoc = doc(usersCol, uid);
    const snapshot = await getDoc(userDoc);
    if (snapshot.exists()) {
        return snapshot.data();
    }
    else {
        return null;
    }
}
export let _handleAuth = () => { };
export function handleAuth(callback) {
    _handleAuth = callback;
}
function randomUsername() {
    // cSpell:ignore boykisser
    const usernameParts = [
        ["massive", "silly", "lewd", "fluffy"],
        ["faggot", "boykisser"],
    ];
    return usernameParts.map((part) => part[Math.floor(Math.random() * part.length)]).join("");
}
const usersCol = collection(db, "users");
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = doc(usersCol, user.uid);
        const snapshot = await getDoc(userDoc);
        const data = snapshot?.data() || {};
        if (!snapshot.exists() || data.displayname === undefined) {
            await setDoc(userDoc, { displayname: randomUsername() }, { merge: true });
        }
        if (data.power === undefined)
            await setDoc(userDoc, { power: 0 }, { merge: true });
    }
    _handleAuth(user);
});
export async function loginWithGoogle() {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
}
export async function logout() {
    await signOut(auth);
}
// Firestore
const postsCol = collection(db, "posts");
const postsQuery = query(postsCol, orderBy("timestamp", "asc"));
let _handlePost = () => { };
export function handlePost(callback) {
    _handlePost = callback;
}
onSnapshot(postsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        _handlePost(change);
    });
});
export async function canDeletePost(postSnap) {
    if (postSnap.exists()) {
        const authorId = postSnap.data().author;
        const authorData = (await getUserById(authorId)) ?? { power: 0 };
        const userId = getCurrentUser()?.uid ?? "";
        const userData = (await getUserById(userId)) ?? { power: 0 };
        return authorId === userId || userData.power > authorData.power;
    }
    return false;
}
export async function deletePost(id) {
    const postDoc = doc(postsCol, id);
    const postSnap = await getDoc(postDoc);
    if (await canDeletePost(postSnap)) {
        await deleteDoc(postDoc);
    }
}
export async function createPost(text) {
    const currentUser = getCurrentUser();
    if (currentUser) {
        const newPostDoc = doc(postsCol);
        const newPostData = {
            author: currentUser.uid,
            text: text.replace(/\n\n+/g, "\n").slice(0, 400),
            timestamp: Timestamp.now(),
        };
        await setDoc(newPostDoc, newPostData);
    }
}
export async function deleteAccount() {
    const currentUser = getCurrentUser();
    if (!currentUser)
        return;
    const userId = currentUser.uid;
    const q = query(postsCol, where("author", "==", userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await deleteDoc(doc(usersCol, userId));
    await currentUser.delete();
}
