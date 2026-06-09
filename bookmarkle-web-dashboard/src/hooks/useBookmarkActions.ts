import { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Bookmark } from "../types";

interface UseBookmarkActionsProps {
  onRefreshFavicon?: (bookmarkId: string, url: string) => Promise<string>;
}

export const useBookmarkActions = ({
  onRefreshFavicon,
}: UseBookmarkActionsProps) => {
  const { t } = useTranslation();
  const [faviconLoadingStates, setFaviconLoadingStates] = useState<
    Record<string, boolean>
  >({});

  const handleRefreshFavicon = async (bookmark: Bookmark) => {
    if (!onRefreshFavicon) return;

    setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: true }));
    try {
      await onRefreshFavicon(bookmark.id, bookmark.url);
    } catch {
      toast.error(t("bookmarks.faviconRefreshError"));
    } finally {
      setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: false }));
    }
  };

  return {
    faviconLoadingStates,
    handleRefreshFavicon,
  };
};
