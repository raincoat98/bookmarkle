import { useEffect, useRef } from "react";
import { useAuthStore, useBookmarkStore, useCollectionStore } from "../../stores";
import {
  shouldBackup,
  performBackup,
  loadBackupSettings,
} from "../../utils/backup";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_WEEK_MS = ONE_DAY_MS * 7;
const ONE_MONTH_MS = ONE_DAY_MS * 30;

const INTERVAL_MS: Record<string, number> = {
  daily: ONE_DAY_MS,
  weekly: ONE_WEEK_MS,
  monthly: ONE_MONTH_MS,
};

type IntervalHandle = ReturnType<typeof setInterval>;

// 백업 설정에 따라 주기적으로 백업 실행
export function usePeriodicBackup() {
  const { user } = useAuthStore();
  const { rawBookmarks } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const intervalRef = useRef<IntervalHandle | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const settings = loadBackupSettings();
    const shouldSetup =
      user?.uid &&
      settings.enabled &&
      rawBookmarks?.length > 0 &&
      collections?.length > 0;

    if (!shouldSetup) return;

    const intervalMs = INTERVAL_MS[settings.frequency] || ONE_WEEK_MS;

    if (shouldBackup()) {
      performBackup(rawBookmarks, collections, user.uid);
    }

    intervalRef.current = setInterval(() => {
      if (shouldBackup()) {
        performBackup(rawBookmarks, collections, user.uid);
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.uid, rawBookmarks, collections]);
}
