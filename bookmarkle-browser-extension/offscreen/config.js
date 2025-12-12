(() => {
  const firebaseConfig = {
    apiKey: "_FIREBASE_API_KEY_",
    authDomain: "_FIREBASE_AUTH_DOMAIN_",
    projectId: "_FIREBASE_PROJECT_ID_",
    storageBucket: "_FIREBASE_STORAGE_BUCKET_",
    messagingSenderId: "_FIREBASE_MESSAGING_SENDER_ID_",
    appId: "_FIREBASE_APP_ID_",
  };

  console.log("🔧 Firebase config loaded:", {
    apiKey: firebaseConfig.apiKey?.substring(0, 10) + "...",
    projectId: firebaseConfig.projectId,
  });

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  window.OffscreenEnv = {
    firebaseConfig,
    db,
  };
})();
