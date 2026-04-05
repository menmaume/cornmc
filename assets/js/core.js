import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 2. CONFIGURATION
export const defaultConfig = {
    server_name: "CornMiner.top",
    server_ip: "cornminer.top",
    discord_link: "https://discord.gg/cUsA2K4Cpz",
    welcome_title: "Chào mừng đến với CornMiner.top",
    welcome_description: "Thế giới sinh tồn đầy thử thách và sáng tạo!"
};


const firebaseConfig = {
    apiKey: "AIzaSyAfQZr63_aYH_tqxGEuBupqKPzNAxoQEOw",
    authDomain: "cornminer-edb42.firebaseapp.com",
    projectId: "cornminer-edb42",
    storageBucket: "cornminer-edb42.firebasestorage.app",
    messagingSenderId: "679321936018",
    appId: "1:679321936018:web:01e4660bd723ab2ae8064b",
    measurementId: "G-T4B1T6L981"
};

// 3. INIT FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================
// A. AUTHENTICATION FUNCTIONS
// ==========================================

export const getCurrentUser = () => auth.currentUser;

// Theo dõi trạng thái đăng nhập
export function subscribeToAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Lấy Role từ Firestore
                const userRef = doc(db, "users", user.uid);
                const snap = await getDoc(userRef);
                let role = 'member';

                if (snap.exists()) {
                    role = snap.data().role || 'member';
                    // Cache lại để dùng cho lần sau
                    localStorage.setItem('cached_user_role', role);
                    localStorage.setItem('cached_user_name', user.displayName);
                } else {
                    // Tạo user mới nếu chưa có trong DB
                    await setDoc(userRef, {
                        username: user.displayName || "User",
                        email: user.email,
                        photoURL: user.photoURL,
                        role: 'member',
                        joinedAt: serverTimestamp()
                    });
                }
                callback(user, role);
            } catch (e) {
                console.error("Auth Sync Error:", e);
                callback(user, 'member');
            }
        } else {
            callback(null, 'guest');
        }
    });
}
// Đăng nhập: Chấp nhận cả Tên nhân vật HOẶC Email thật
export async function loginUser(input, password) {
    let email = input.trim();
    // Nếu không có @, tự động coi là user ảo
    if (!email.includes('@')) {
        email = `${email.toLowerCase()}@corn.local`;
    }
    return await signInWithEmailAndPassword(auth, email, password);
}

// Đăng ký: CHỈ CẦN USERNAME + PASSWORD
export async function registerUser(username, password) {
    // Tạo email ảo đuôi @corn.local
    const fakeEmail = `${username.trim().toLowerCase()}@corn.local`;
    
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    await updateProfile(cred.user, { displayName: username });
    
    // Lưu vào Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
        username: username,
        email: fakeEmail, // Lưu email ảo để quản lý
        role: 'member',
        photoURL: null, // Để null, UI sẽ tự lấy skin Minecraft
        joinedAt: serverTimestamp()
    });
    return cred.user;
}

// Quên mật khẩu (Chỉ dùng được nếu User đăng ký bằng Google hoặc Email thật sau này)
export async function resetPassword(email) {
    return await sendPasswordResetEmail(auth, email);
}

export async function loginGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function loginEmail(email, password) {
    // Thêm hậu tố domain ảo như code cũ của bạn
    return await signInWithEmailAndPassword(auth, `${email}@corn.local`, password);
}

export async function registerEmail(username, password) {
    const cred = await createUserWithEmailAndPassword(auth, `${username}@corn.local`, password);
    await updateProfile(cred.user, { displayName: username });
    // Tạo data user
    await setDoc(doc(db, "users", cred.user.uid), {
        username: username,
        role: 'member',
        photoURL: null,
        joinedAt: serverTimestamp()
    });
    return cred.user;
}

export async function logout() {
    return await signOut(auth);
}

export async function updateUserProfile(displayName, photoURL) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    // Update Auth
    await updateProfile(user, { displayName, photoURL });

    // Update Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        username: displayName,
        photoURL: photoURL
    });
}

// ==========================================
// B. DATA FETCHING (POSTS, USERS, ETC)
// ==========================================

// Lấy danh sách tin tức
export async function fetchNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách hướng dẫn
export async function fetchGuides() {
    const q = query(collection(db, "guides"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách bài viết diễn đàn theo trạng thái
export async function fetchForumPosts(status) {
    const q = query(collection(db, "forum_posts"), where("status", "==", status), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Lấy danh sách Users (Admin Panel)
export async function fetchAllUsers() {
    const q = query(collection(db, "users"), orderBy("joinedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function fetchMyPosts(uid) {
    const q = query(
        collection(db, "forum_posts"), 
        where("authorId", "==", uid), 
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// C. DATA MUTATION (ADD, UPDATE, DELETE)
// ==========================================

export async function createPost(collectionName, data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    return await addDoc(collection(db, collectionName), {
        ...data,
        author: user.displayName,
        authorId: user.uid,
        createdAt: serverTimestamp()
    });
}

export async function deleteDocument(collectionName, docId) {
    return await deleteDoc(doc(db, collectionName, docId));
}

export async function editDocument(collectionName, docId, data) {
    return await updateDoc(doc(db, collectionName, docId), data);
}

// Upload Hình Ảnh Lên Firebase Storage
export async function uploadImageToFirebase(file, folderName = 'news_images') {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folderName}/${fileName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

// Comments
export async function fetchComments(postId) {
    const q = query(collection(db, "forum_posts", postId, "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addComment(postId, content, role) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in");

    return await addDoc(collection(db, "forum_posts", postId, "comments"), {
        content: content,
        uid: user.uid,
        username: user.displayName,
        avatar: user.photoURL || `https://mc-heads.net/avatar/${user.displayName}`,
        role: role,
        createdAt: serverTimestamp()
    });
}

export async function deleteComment(postId, commentId) {
    return await deleteDoc(doc(db, "forum_posts", postId, "comments", commentId));
}

// User Management (Admin)
export async function deleteUserAndData(uid) {
    return await deleteDoc(doc(db, "users", uid));
}
