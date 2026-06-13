export {
  ADMIN_EMAILS,
  auth,
  db,
  firebaseConfig,
  googleProvider,
} from "./core";
export { default } from "./core";
export {
  clearFirebaseStorage,
  loginWithEmail,
  loginWithGoogle,
  logout,
  resetPassword,
  signupWithEmail,
} from "./auth";
export { checkAdminStatus, isAdmin, isAdminUser } from "./admin";
export {
  cancelAccountDeletion,
  getAccountDeletionStatus,
  scheduleAccountDeletion,
} from "./account";
export {
  getUserDefaultPage,
  getUserNotificationSettings,
  getUserWeatherLocation,
  setUserDefaultPage,
  setUserNotificationSettings,
  setUserWeatherLocation,
  type NotificationSettings,
  type WeatherLocation,
} from "./settings";
export { getRefreshToken } from "./token";
