// firebase-config.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged 
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    addDoc,
    serverTimestamp 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACwxAfpvrmuHlJvpIcloMVj7x4nTREMEE",
    authDomain: "signup-2461d.firebaseapp.com",
    projectId: "signup-2461d",
    storageBucket: "signup-2461d.firebasestorage.app",
    messagingSenderId: "1004312329009",
    appId: "1:1004312329009:web:bbeeb8cb8a8d095df5ce10",
    measurementId: "G-CFPR2QG7SC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ============= AUTHENTICATION FUNCTIONS =============

/**
 * Sign Up function untuk mendaftar pengguna baru
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 * @param {string} fullName - Nama lengkap pengguna
 * @returns {Promise} - Promise dengan hasil sign up
 */
export async function signUp(email, password, fullName) {
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile dengan nama pengguna
        await updateProfile(user, {
            displayName: fullName
        });
        
        // Simpan data tambahan pengguna ke Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: fullName,
            email: email,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isActive: true,
            role: "user"
        });
        
        // Catat log pendaftaran
        await addDoc(collection(db, "userLogs"), {
            userId: user.uid,
            action: "sign_up",
            timestamp: serverTimestamp(),
            email: email
        });
        
        return {
            success: true,
            message: "Pendaftaran berjaya!",
            user: user
        };
    } catch (error) {
        console.error("Error signing up:", error);
        let errorMessage = "Pendaftaran gagal. Sila cuba lagi.";
        
        // Handle specific Firebase errors
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "Email ini sudah didaftarkan.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Format email tidak sah.";
                break;
            case 'auth/weak-password':
                errorMessage = "Password terlalu lemah. Guna minimum 6 karakter.";
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error
        };
    }
}

/**
 * Sign In function untuk log masuk pengguna
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 * @returns {Promise} - Promise dengan hasil sign in
 */
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update last login di Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            lastLogin: serverTimestamp()
        }, { merge: true });
        
        // Catat log login
        await addDoc(collection(db, "userLogs"), {
            userId: user.uid,
            action: "sign_in",
            timestamp: serverTimestamp(),
            email: email
        });
        
        return {
            success: true,
            message: "Log masuk berjaya!",
            user: user
        };
    } catch (error) {
        console.error("Error signing in:", error);
        let errorMessage = "Log masuk gagal. Sila cuba lagi.";
        
        // Handle specific Firebase errors
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "Email tidak didaftarkan.";
                break;
            case 'auth/wrong-password':
                errorMessage = "Password salah.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Format email tidak sah.";
                break;
            case 'auth/user-disabled':
                errorMessage = "Akaun ini telah dilumpuhkan.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Terlalu banyak percubaan. Sila cuba sebentar lagi.";
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error
        };
    }
}

/**
 * Sign Out function untuk log keluar
 * @returns {Promise} - Promise dengan hasil sign out
 */
export async function signOutUser() {
    try {
        const user = auth.currentUser;
        if (user) {
            // Catat log logout
            await addDoc(collection(db, "userLogs"), {
                userId: user.uid,
                action: "sign_out",
                timestamp: serverTimestamp(),
                email: user.email
            });
        }
        
        await signOut(auth);
        
        return {
            success: true,
            message: "Log keluar berjaya!"
        };
    } catch (error) {
        console.error("Error signing out:", error);
        return {
            success: false,
            message: "Log keluar gagal. Sila cuba lagi.",
            error: error
        };
    }
}

/**
 * Reset Password function
 * @param {string} email - Email pengguna
 * @returns {Promise} - Promise dengan hasil reset password
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        
        return {
            success: true,
            message: "Email reset password telah dihantar. Sila periksa inbox anda."
        };
    } catch (error) {
        console.error("Error resetting password:", error);
        let errorMessage = "Reset password gagal. Sila cuba lagi.";
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "Email tidak didaftarkan.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Format email tidak sah.";
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error
        };
    }
}

// ============= USER DATA FUNCTIONS =============

/**
 * Get user data from Firestore
 * @param {string} userId - User ID
 * @returns {Promise} - Promise dengan data pengguna
 */
export async function getUserData(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return {
                success: true,
                data: userSnap.data()
            };
        } else {
            return {
                success: false,
                message: "Data pengguna tidak dijumpai."
            };
        }
    } catch (error) {
        console.error("Error getting user data:", error);
        return {
            success: false,
            message: "Gagal mendapatkan data pengguna.",
            error: error
        };
    }
}

/**
 * Update user profile in Firestore
 * @param {string} userId - User ID
 * @param {object} data - Data yang nak dikemaskini
 * @returns {Promise} - Promise dengan hasil update
 */
export async function updateUserData(userId, data) {
    try {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        return {
            success: true,
            message: "Profil berjaya dikemaskini!"
        };
    } catch (error) {
        console.error("Error updating user data:", error);
        return {
            success: false,
            message: "Gagal mengemaskini profil.",
            error: error
        };
    }
}

// ============= AUTH STATE OBSERVER =============

/**
 * Monitor authentication state changes
 * @param {function} callback - Function yang akan dipanggil bila auth state berubah
 */
export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            callback({
                isLoggedIn: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                }
            });
        } else {
            // User is signed out
            callback({
                isLoggedIn: false,
                user: null
            });
        }
    });
}

/**
 * Get current user
 * @returns {object|null} - Current user object atau null jika tidak login
 */
export function getCurrentUser() {
    const user = auth.currentUser;
    if (user) {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
        };
    }
    return null;
}

// ============= HELPER FUNCTIONS =============

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
export function validatePassword(password) {
    const result = {
        isValid: true,
        message: "Password ok"
    };
    
    if (!password || password.length < 6) {
        result.isValid = false;
        result.message = "Password mesti sekurang-kurangnya 6 karakter";
    }
    
    return result;
}

// Export Firebase instances untuk kegunaan lain
export { auth, db, app, analytics };
