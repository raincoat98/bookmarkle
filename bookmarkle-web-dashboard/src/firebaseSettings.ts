import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseCore";
import { isPermissionOrAuthError } from "./firebaseErrors";

export type NotificationSettings = {
  notifications?: boolean;
  bookmarkNotifications?: boolean;
  systemNotifications?: boolean;
};

export type WeatherLocation = {
  lat: number;
  lon: number;
  city: string;
};

const DEFAULT_PAGE = "dashboard";
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notifications: true,
  bookmarkNotifications: true,
  systemNotifications: true,
};

const isAuthSyncedWithUser = (uid: string): boolean => auth.currentUser?.uid === uid;

const userSettingsRef = (uid: string) =>
  doc(db, "users", uid, "settings", "main");

const defaultNotificationSettings = (): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
});

export async function getUserDefaultPage(uid: string): Promise<string> {
  if (!isAuthSyncedWithUser(uid)) return DEFAULT_PAGE;

  try {
    const snap = await getDoc(userSettingsRef(uid));
    if (snap.exists() && snap.data().defaultPage) {
      return snap.data().defaultPage;
    }
    return DEFAULT_PAGE;
  } catch (error) {
    if (isPermissionOrAuthError(error)) {
      console.warn("⚠️ getUserDefaultPage: Permission denied, returning default");
      return DEFAULT_PAGE;
    }
    console.error("❌ getUserDefaultPage error:", error);
    return DEFAULT_PAGE;
  }
}

export async function setUserDefaultPage(
  uid: string,
  value: string
): Promise<void> {
  await setDoc(userSettingsRef(uid), { defaultPage: value }, { merge: true });
}

export async function getUserNotificationSettings(
  uid: string
): Promise<NotificationSettings> {
  if (!isAuthSyncedWithUser(uid)) return defaultNotificationSettings();

  try {
    const snap = await getDoc(userSettingsRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        notifications:
          data.notifications !== undefined ? data.notifications : true,
        bookmarkNotifications:
          data.bookmarkNotifications !== undefined
            ? data.bookmarkNotifications
            : true,
        systemNotifications:
          data.systemNotifications !== undefined
            ? data.systemNotifications
            : data.notifications !== undefined
            ? data.notifications
            : true,
      };
    }
    return defaultNotificationSettings();
  } catch (error) {
    if (isPermissionOrAuthError(error)) {
      console.warn(
        "⚠️ getUserNotificationSettings: Permission denied, returning defaults"
      );
      return defaultNotificationSettings();
    }
    console.error("❌ getUserNotificationSettings error:", error);
    return defaultNotificationSettings();
  }
}

export async function setUserNotificationSettings(
  uid: string,
  settings: NotificationSettings
): Promise<void> {
  await setDoc(userSettingsRef(uid), settings, { merge: true });
}

export async function getUserWeatherLocation(
  uid: string
): Promise<WeatherLocation | null> {
  if (!isAuthSyncedWithUser(uid)) return null;

  try {
    const snap = await getDoc(userSettingsRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      if (
        data.weatherLocation &&
        data.weatherLocation.lat &&
        data.weatherLocation.lon
      ) {
        return {
          lat: data.weatherLocation.lat,
          lon: data.weatherLocation.lon,
          city: data.weatherLocation.city || "",
        };
      }
    }
    return null;
  } catch (error) {
    if (isPermissionOrAuthError(error)) {
      console.warn("⚠️ getUserWeatherLocation: Permission denied, returning null");
      return null;
    }
    console.error("❌ getUserWeatherLocation error:", error);
    return null;
  }
}

export async function setUserWeatherLocation(
  uid: string,
  location: WeatherLocation
): Promise<void> {
  await setDoc(
    userSettingsRef(uid),
    {
      weatherLocation: {
        lat: location.lat,
        lon: location.lon,
        city: location.city,
      },
    },
    { merge: true }
  );
}
