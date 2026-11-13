import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

// NEXT_PUBLIC_ の値はビルド時に埋め込まれるため、1つずつ名前を書いて参照する
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** 設定が足りないときの説明。足りていれば null（値はビルド時に決まる） */
export const firebaseConfigError: string | null =
  firebaseConfig.apiKey && firebaseConfig.projectId
    ? null
    : "Firebase の設定がありません。.env.local の NEXT_PUBLIC_FIREBASE_* を確認してください。";

/**
 * Firebase はブラウザの中だけで初期化する。
 * サーバーでの事前描画のときに呼ばれないよう、モジュールの読み込み時には初期化しない。
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  if (firebaseConfigError) {
    throw new Error(firebaseConfigError);
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
