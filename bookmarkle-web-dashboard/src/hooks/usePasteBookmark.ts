import { useEffect, useCallback } from "react";
import { getFaviconUrl } from "../utils/favicon";
import type { BookmarkFormData } from "../types";

interface UsePasteBookmarkOptions {
  onAddBookmark: (bookmarkData: BookmarkFormData) => Promise<void>;
  onOpenModal?: () => void;
  enabled?: boolean;
}

/**
 * 붙여넣기로 북마크를 추가하는 커스텀 훅
 * Ctrl+V (Windows/Linux) 또는 Cmd+V (Mac)로 클립보드의 URL을 북마크로 추가
 */
export const usePasteBookmark = ({
  onAddBookmark,
  onOpenModal,
  enabled = true,
}: UsePasteBookmarkOptions) => {
  /**
   * 클립보드에서 URL 추출 및 유효성 검사
   */
  const extractUrlFromClipboard = useCallback(async (): Promise<
    string | null
  > => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        return null;
      }

      const trimmedText = text.trim();

      // URL 형식 정규화 시도
      let normalizedUrl = trimmedText;

      // http:// 또는 https://로 시작하지 않으면 추가
      if (
        !normalizedUrl.startsWith("http://") &&
        !normalizedUrl.startsWith("https://")
      ) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // URL 유효성 검사
      try {
        const url = new URL(normalizedUrl);
        // 프로토콜이 http 또는 https인지 확인
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return null;
        }
        // 호스트네임이 있는지 확인
        if (!url.hostname || url.hostname.length === 0) {
          return null;
        }
        return normalizedUrl;
      } catch {
        // URL이 유효하지 않은 경우 null 반환
        return null;
      }
    } catch (error) {
      console.error("클립보드 읽기 실패:", error);
      return null;
    }
  }, []);

  /**
   * URL에서 제목 자동 생성
   */
  const generateTitleFromUrl = useCallback((url: string): string => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");
      return domain;
    } catch {
      return "새 북마크";
    }
  }, []);

  /**
   * 입력 필드에 포커스가 있는지 확인
   */
  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput =
      tagName === "input" ||
      tagName === "textarea" ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable);

    return isInput;
  }, []);

  /**
   * 붙여넣기 이벤트 핸들러
   */
  const handlePaste = useCallback(
    async (e: KeyboardEvent) => {
      // Ctrl+V (Windows/Linux) 또는 Cmd+V (Mac)
      const isPasteKey =
        (e.ctrlKey || e.metaKey) && e.key === "v" && !e.shiftKey && !e.altKey;

      if (!isPasteKey || !enabled) {
        return;
      }

      // 입력 필드에 포커스가 있으면 기본 동작 유지
      if (isInputFocused()) {
        return;
      }

      // 기본 붙여넣기 동작 방지
      e.preventDefault();

      // 클립보드에서 URL 추출
      const url = await extractUrlFromClipboard();
      if (!url) {
        return;
      }

      // URL에서 제목 자동 생성
      const title = generateTitleFromUrl(url);
      const favicon = getFaviconUrl(url);

      // 북마크 데이터 준비
      const bookmarkData: BookmarkFormData = {
        title,
        url,
        description: "",
        collection: "",
        tags: [],
        isFavorite: false,
        favicon,
      };

      // 모달이 있으면 모달 열기, 없으면 바로 추가
      if (onOpenModal) {
        // 모달을 열고 URL을 전달하는 방법은 모달 컴포넌트에 따라 다를 수 있음
        // 여기서는 모달을 열기만 하고, 모달 컴포넌트에서 초기값을 설정하도록 함
        onOpenModal();
        // 모달이 열린 후 URL을 설정하기 위해 약간의 지연
        setTimeout(() => {
          // 모달 컴포넌트에서 URL을 받을 수 있도록 이벤트 발생
          window.dispatchEvent(
            new CustomEvent("pasteBookmarkUrl", {
              detail: { url, title, favicon },
            })
          );
        }, 100);
      } else {
        // 바로 북마크 추가
        try {
          await onAddBookmark(bookmarkData);
        } catch (error) {
          console.error("붙여넣기 북마크 추가 실패:", error);
        }
      }
    },
    [
      enabled,
      extractUrlFromClipboard,
      generateTitleFromUrl,
      isInputFocused,
      onAddBookmark,
      onOpenModal,
    ]
  );

  /**
   * 키보드 이벤트 리스너 등록
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener("keydown", handlePaste);

    return () => {
      window.removeEventListener("keydown", handlePaste);
    };
  }, [enabled, handlePaste]);
};
