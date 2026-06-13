import { useEffect, useRef } from "react";
import { useAuthStore, useBookmarkStore } from "../../stores";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

type IntervalHandle = ReturnType<typeof setInterval>;

// 24시간마다 휴지통의 오래된 항목 자동 정리
export function usePeriodicTrashCleanup() {
  const { user } = useAuthStore();
  const { cleanupOldTrash } = useBookmarkStore();
  const intervalRef = useRef<IntervalHandle | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!user?.uid) return;

    const handleError = (error: unknown) => {
      const err = error as { code?: string; message?: string };
      // 인덱스 빌드 중이면 일시적 — 조용히 지나가고 다음 주기에 재시도
      if (
        err?.code === "failed-precondition" &&
        err?.message?.includes("index is currently building")
      ) {
        console.log(
          "휴지통 자동 정리: 인덱스 빌드 중입니다. 나중에 다시 시도됩니다."
        );
      } else {
        console.error("휴지통 자동 정리 오류:", error);
      }
    };

    cleanupOldTrash(user.uid).catch(handleError);

    intervalRef.current = setInterval(() => {
      cleanupOldTrash(user.uid).catch(handleError);
    }, ONE_DAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.uid, cleanupOldTrash]);
}
