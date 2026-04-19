import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Use environment variable for API Key to avoid hardcoding secrets
const apiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;

if (!apiKey || apiKey === "PASTE_YOUR_FIREBASE_API_KEY_HERE") {
  console.error("🔥 Error: Firebase API Key is missing or invalid. Please check your environment variables (VITE_FIREBASE_API_KEY).");
}

const finalConfig = {
  ...firebaseConfig,
  apiKey: apiKey
};

const app = initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signIn = async () => {
  console.log("Attempting to sign in with popup...");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in successful:", result.user.email);
    return result;
  } catch (error: any) {
    console.error("SignIn Popup Error:", error.code, error.message);
    if (error.code === 'auth/popup-blocked') {
      alert("El navegador bloqueó la ventana emergente. Por favor, permite los popups para este sitio.");
    } else if (error.code === 'auth/api-key-not-valid') {
      alert("Error crítico: La API Key de Firebase en Vercel no es válida. Revisa las variables de entorno.");
    }
    throw error;
  }
};
export const signOut = () => auth.signOut();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'anonymous',
      email: user?.email || '',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous ?? false,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}
