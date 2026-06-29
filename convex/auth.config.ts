const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  process.env.VITE_FIREBASE_PROJECT_ID ??
  "grease-83410";

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${firebaseProjectId}`,
      applicationID: firebaseProjectId,
    },
  ],
};
