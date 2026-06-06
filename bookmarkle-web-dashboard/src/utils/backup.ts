import type { Bookmark, Collection } from "../types";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc as firestoreDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore";

export const BACKUP_VERSION = "2.0";
const BACKUP_SETTINGS_KEY = "bookmarkhub_backup_settings";
const MAX_BACKUP_SIZE_MB = 0.85; // Firestore 1MB 문서 한도 여유

export interface BackupData {
  version: string;
  exportedAt: string;
  bookmarks: Bookmark[];
  collections: Collection[];
  userId: string;
  checksum?: string;
  tag?: "auto" | "manual" | "pre-restore";
}

export interface BackupSettings {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  lastBackup?: string;
  lastBackupChecksum?: string;
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
  id: string;        // Firestore 문서 ID
  timestamp: string; // 표시용 시각
  data: BackupData;
}

// --- 체크섬 ---

export function calcChecksum(bookmarks: Bookmark[], collections: Collection[]): string {
  const str = `${bookmarks.length}:${collections.length}:${bookmarks.map(b => b.id).sort().join(",")}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(16);
}

export const verifyBackup = (data: BackupData): boolean => {
  if (!data.checksum) return true; // 구형 백업 통과
  return data.checksum === calcChecksum(data.bookmarks, data.collections);
};

// --- 백업 설정 (localStorage - 소량 설정값) ---

export const saveBackupSettings = (settings: BackupSettings): void => {
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
};

export const loadBackupSettings = (): BackupSettings => {
  const saved = localStorage.getItem(BACKUP_SETTINGS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fallthrough */ }
  }
  return { enabled: false, frequency: "weekly", maxBackups: 10 };
};

// --- Firestore CRUD ---

export const saveBackupToFirestore = async (
  userId: string,
  data: BackupData
): Promise<string> => {
  const ref = collection(db, "users", userId, "backups");
  const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
};

export const getAllBackupsFromFirestore = async (userId: string): Promise<BackupListItem[]> => {
  const ref = collection(db, "users", userId, "backups");
  const q = query(ref, orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);

  return snap.docs
    .map(d => {
      const raw = d.data() as BackupData & { createdAt?: Timestamp };
      const timestamp =
        raw.createdAt instanceof Timestamp
          ? raw.createdAt.toDate().toISOString()
          : raw.exportedAt ?? new Date().toISOString();
      return {
        id: d.id,
        timestamp,
        data: {
          version:     raw.version,
          exportedAt:  raw.exportedAt,
          bookmarks:   raw.bookmarks   ?? [],
          collections: raw.collections ?? [],
          userId:      raw.userId,
          checksum:    raw.checksum,
          tag:         raw.tag,
        },
      };
    })
    .filter(b =>
      Array.isArray(b.data.bookmarks) &&
      Array.isArray(b.data.collections) &&
      (b.data.bookmarks.length > 0 || b.data.collections.length > 0)
    );
};

export const deleteBackupFromFirestore = async (
  userId: string,
  backupId: string
): Promise<void> => {
  await deleteDoc(firestoreDoc(db, "users", userId, "backups", backupId));
};

const cleanupOldBackups = async (userId: string): Promise<void> => {
  const { maxBackups } = loadBackupSettings();
  const all = await getAllBackupsFromFirestore(userId);
  if (all.length > maxBackups) {
    await Promise.all(all.slice(maxBackups).map(b => deleteBackupFromFirestore(userId, b.id)));
  }
};

// --- 백업 필요 여부 ---

export const shouldBackup = (): boolean => {
  const { enabled, lastBackup, frequency } = loadBackupSettings();
  if (!enabled) return false;
  if (!lastBackup) return true;

  const diffHours = (Date.now() - new Date(lastBackup).getTime()) / 3_600_000;
  switch (frequency) {
    case "daily":   return diffHours >= 24;
    case "weekly":  return diffHours >= 168;
    case "monthly": return diffHours >= 720;
    default:        return false;
  }
};

// --- 크기 추정 ---

export const estimateBackupSizeMB = (
  bookmarks: Bookmark[],
  collections: Collection[]
): number => new Blob([JSON.stringify({ bookmarks, collections })]).size / 1_048_576;

// --- 백업 실행 ---

// 동시 호출 방어용 in-flight 락 (사용자별)
const inFlightBackups = new Map<string, Promise<boolean>>();

export const performBackup = async (
  bookmarks: Bookmark[],
  collections: Collection[],
  userId: string,
  tag: "auto" | "manual" | "pre-restore" = "auto"
): Promise<boolean> => {
  if (!bookmarks?.length && !collections?.length) return false;

  // 같은 사용자의 백업이 이미 진행 중이면 그 결과를 공유 (중복 생성 방지)
  const lockKey = `${userId}:${tag}`;
  const existing = inFlightBackups.get(lockKey);
  if (existing) return existing;

  // auto 백업의 경우 checksum 비교로 동일 데이터면 스킵
  if (tag === "auto") {
    const newChecksum = calcChecksum(bookmarks, collections);
    const s = loadBackupSettings();
    if (s.lastBackupChecksum === newChecksum) {
      return false;
    }
  }

  const task = (async () => {
    const sizeMB = estimateBackupSizeMB(bookmarks, collections);
    if (sizeMB > MAX_BACKUP_SIZE_MB) {
      console.warn(`백업 크기(${sizeMB.toFixed(2)}MB)가 한도를 초과합니다.`);
      return false;
    }

    const checksum = calcChecksum(bookmarks, collections);
    const data: BackupData = {
      version:     BACKUP_VERSION,
      exportedAt:  new Date().toISOString(),
      bookmarks,
      collections,
      userId,
      tag,
      checksum,
    };

    await saveBackupToFirestore(userId, data);

    const s = loadBackupSettings();
    saveBackupSettings({
      ...s,
      lastBackup: new Date().toISOString(),
      lastBackupChecksum: checksum,
    });

    await cleanupOldBackups(userId);
    return true;
  })();

  inFlightBackups.set(lockKey, task);
  try {
    return await task;
  } finally {
    inFlightBackups.delete(lockKey);
  }
};

// --- 파일 다운로드 ---

export const downloadBackupAsFile = (data: BackupData, timestamp: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href:     url,
    download: `bookmarkle-backup-${timestamp.replace(/[:.]/g, "-").substring(0, 19)}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
};

// --- 백업 상태 ---

export const getBackupStatus = (backupCount = 0): BackupStatus => {
  const s = loadBackupSettings();
  return {
    enabled:     s.enabled,
    frequency:   s.frequency,
    lastBackup:  s.lastBackup,
    backupCount,
    totalSize:   "0.00",
    nextBackup:  s.lastBackup ? getNextBackupTime(s.lastBackup, s.frequency) : null,
  };
};

const getNextBackupTime = (lastBackup: string, frequency: string): string => {
  const next = new Date(lastBackup);
  switch (frequency) {
    case "daily":   next.setDate(next.getDate() + 1); break;
    case "weekly":  next.setDate(next.getDate() + 7); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
  }
  return next.toISOString();
};
