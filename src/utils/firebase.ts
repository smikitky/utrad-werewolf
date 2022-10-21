// import { getAnalytics, isSupported } from 'firebase/analytics';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { EmailAuthProvider, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const fbConfig = import.meta.env.FB_APP_CONFIG;
if (!fbConfig) throw new Error('FB_APP_CONFIG is not defined.');
let firebaseConfig: FirebaseOptions;
try {
  firebaseConfig = JSON.parse(atob(fbConfig));
} catch (e) {
  throw new Error('FB_APP_CONFIG is not properly encoded.');
}

export const app = initializeApp(firebaseConfig);
// export const analytics = getAnalytics(app);
export const auth = getAuth();
export const googleAuthProvider = new GoogleAuthProvider();
export const emailAuthProvider = new EmailAuthProvider();

export const database = getDatabase();
