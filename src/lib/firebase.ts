import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Log config metadata (no secrets) for debugging
console.log('Firebase Config Loaded:', {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

async function testConnection() {
  try {
    // Try to get a non-existent doc from server to verify link
    // The path /_connection_test_/ping is allowed for public read in firestore.rules
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connectivity test: Connection established successfully.");
  } catch (error) {
    if (error instanceof Error) {
      const isAuthError = error.message.includes('permission-denied') || 
                         error.message.includes('Missing or insufficient permissions') ||
                         (error as any).code === 'permission-denied';
      
      const isTransportError = error.message.includes('the client is offline') || 
                              error.message.includes('unavailable') ||
                              (error as any).code === 'unavailable';

      if (isAuthError) {
        console.log("Firestore connectivity test: Connected (reached server, auth checked).");
      } else if (isTransportError) {
        console.warn("Firestore connectivity test: Service temporarily unavailable or device offline. This is usually transient in dev environments.");
      } else {
        console.info("Firestore connectivity test notice:", error.message);
      }
    }
  }
}
testConnection();
