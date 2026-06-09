export {
  ADMIN_EMAILS,
  auth,
  db,
  firebaseConfig,
  googleProvider,
} from "./firebaseCore";
export { default } from "./firebaseCore";
export {
  clearFirebaseStorage,
  loginWithEmail,
  loginWithGoogle,
  logout,
  resetPassword,
  signupWithEmail,
} from "./firebaseAuth";
export { checkAdminStatus, isAdmin, isAdminUser } from "./firebaseAdmin";
export {
  cancelAccountDeletion,
  getAccountDeletionStatus,
  scheduleAccountDeletion,
} from "./firebaseAccount";
export {
  getUserDefaultPage,
  getUserNotificationSettings,
  getUserWeatherLocation,
  setUserDefaultPage,
  setUserNotificationSettings,
  setUserWeatherLocation,
  type NotificationSettings,
  type WeatherLocation,
} from "./firebaseSettings";
export { getRefreshToken } from "./firebaseToken";
