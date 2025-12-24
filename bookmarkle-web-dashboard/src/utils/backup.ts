import type { Bookmark, Collection } from "../types";

export interface BackupData {
  version: string;
  exportedAt: string;
  bookmarks: Bookmark[];
  collections: Collection[];
  userId: string;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  lastBackup?: string;
  maxBackups: number;
}

export interface BackupStatus {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  lastBackup?: string;
  backupCount: number;
  totalSize: string;
  nextBackup: string | null;
}

export interface BackupListItem {
  timestamp: string;
  data: BackupData;
}

const BACKUP_SETTINGS_KEY = "bookmarkhub_backup_settings";
const BACKUP_DATA_PREFIX = "bookmarkhub_backup_";

// 백업 설정 저장
export const saveBackupSettings = (settings: BackupSettings): void => {
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
};

// 백업 설정 불러오기
export const loadBackupSettings = (): BackupSettings => {
  const saved = localStorage.getItem(BACKUP_SETTINGS_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    enabled: false,
    frequency: "weekly",
    maxBackups: 5,
  };
};

// 백업 데이터 저장
export const saveBackupData = (data: BackupData): void => {
  const timestamp = new Date().toISOString();
  const key = `${BACKUP_DATA_PREFIX}${timestamp}`;
  localStorage.setItem(key, JSON.stringify(data));

  // 오래된 백업 정리
  cleanupOldBackups();
};

// 백업 데이터 불러오기
export const loadBackupData = (timestamp: string): BackupData | null => {
  const key = `${BACKUP_DATA_PREFIX}${timestamp}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : null;
};

// 모든 백업 목록 가져오기
export const getAllBackups = (): BackupListItem[] => {
  const backups: BackupListItem[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      key.startsWith(BACKUP_DATA_PREFIX) &&
      key !== BACKUP_SETTINGS_KEY // settings 키는 무시
    ) {
      const timestamp = key.replace(BACKUP_DATA_PREFIX, "");
      try {
        const data = loadBackupData(timestamp);
        // 데이터가 정상적으로 파싱되고, 북마크/컬렉션이 1개 이상인 경우만 추가
        if (
          data &&
          Array.isArray(data.bookmarks) &&
          Array.isArray(data.collections) &&
          (data.bookmarks.length > 0 || data.collections.length > 0)
        ) {
          backups.push({ timestamp, data });
        } else {
          // 잘못된 백업은 자동 삭제 (삭제 이유와 데이터 콘솔 출력)
          console.warn("잘못된 백업 자동 삭제:", key, data);
          localStorage.removeItem(key);
        }
      } catch (e) {
        // 파싱 에러 등 잘못된 백업은 자동 삭제 (삭제 이유와 에러 콘솔 출력)
        console.warn("파싱 에러로 백업 자동 삭제:", key, e);
        localStorage.removeItem(key);
      }
    }
  }

  return backups.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// 오래된 백업 정리
export const cleanupOldBackups = (): void => {
  const settings = loadBackupSettings();
  const backups = getAllBackups();

  if (backups.length > settings.maxBackups) {
    const toDelete = backups.slice(settings.maxBackups);
    toDelete.forEach(({ timestamp }) => {
      const key = `${BACKUP_DATA_PREFIX}${timestamp}`;
      localStorage.removeItem(key);
    });
  }
};

// 백업이 필요한지 확인
export const shouldBackup = (): boolean => {
  const settings = loadBackupSettings();
  if (!settings.enabled) return false;

  if (!settings.lastBackup) return true;

  const lastBackup = new Date(settings.lastBackup);
  const now = new Date();
  const diffInHours = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

  switch (settings.frequency) {
    case "daily":
      return diffInHours >= 24;
    case "weekly":
      return diffInHours >= 24 * 7;
    case "monthly":
      return diffInHours >= 24 * 30;
    default:
      return false;
  }
};

// 백업 실행
export const performBackup = (
  bookmarks: Bookmark[],
  collections: Collection[],
  userId: string
): boolean => {
  // 데이터가 모두 없으면 백업하지 않음
  if (
    (!bookmarks || bookmarks.length === 0) &&
    (!collections || collections.length === 0)
  ) {
    return false;
  }
  const backupData: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    bookmarks,
    collections,
    userId,
  };

  saveBackupData(backupData);

  // 백업 설정 업데이트
  const settings = loadBackupSettings();
  settings.lastBackup = new Date().toISOString();
  saveBackupSettings(settings);
  return true;
};

// 백업 복원
export const restoreBackup = (timestamp: string): BackupData | null => {
  return loadBackupData(timestamp);
};

// 백업 삭제
export const deleteBackup = (timestamp: string): void => {
  const key = `${BACKUP_DATA_PREFIX}${timestamp}`;
  localStorage.removeItem(key);
};

// 백업 크기 계산 (MB)
export const getBackupSize = (): number => {
  const backups = getAllBackups();
  let totalSize = 0;

  backups.forEach(({ timestamp }) => {
    const key = `${BACKUP_DATA_PREFIX}${timestamp}`;
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += new Blob([data]).size;
    }
  });

  return totalSize / (1024 * 1024); // MB로 변환
};

// 백업 상태 정보
export const getBackupStatus = (): BackupStatus => {
  const settings = loadBackupSettings();
  const backups = getAllBackups();
  const totalSize = getBackupSize();

  return {
    enabled: settings.enabled,
    frequency: settings.frequency,
    lastBackup: settings.lastBackup,
    backupCount: backups.length,
    totalSize: totalSize.toFixed(2),
    nextBackup: settings.lastBackup
      ? getNextBackupTime(settings.lastBackup, settings.frequency)
      : null,
  };
};

// 다음 백업 시간 계산
const getNextBackupTime = (lastBackup: string, frequency: string): string => {
  const last = new Date(lastBackup);
  const next = new Date(last);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next.toISOString();
};
