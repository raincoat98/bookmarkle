import React, { useState, useEffect } from "react";
import type { Collection } from "../../../types";
import { getFaviconUrl, findFaviconFromWebsite } from "../../../utils/favicon";
import { useTranslation } from "react-i18next";

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (bookmark: {
    title: string;
    url: string;
    description?: string;
    collection: string;
    tags: string[];
    isFavorite: boolean;
    favicon?: string;
  }) => void;
  collections: Collection[];
}

export const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  collections,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [favicon, setFavicon] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [faviconLoading, setFaviconLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setUrl("");
      setDescription("");
      setSelectedCollection("");
      setFavicon("");
    }
  }, [isOpen]);

  // 붙여넣기 이벤트 리스너 (모달이 열렸을 때 URL 자동 채우기)
  useEffect(() => {
    if (!isOpen) return;

    const handlePasteBookmarkUrl = (e: Event) => {
      const customEvent = e as CustomEvent<{
        url: string;
        title: string;
        favicon: string;
      }>;
      if (customEvent.detail) {
        setUrl(customEvent.detail.url);
        setTitle(customEvent.detail.title);
        setFavicon(customEvent.detail.favicon);
      }
    };

    window.addEventListener("pasteBookmarkUrl", handlePasteBookmarkUrl as EventListener);
    return () => {
      window.removeEventListener("pasteBookmarkUrl", handlePasteBookmarkUrl as EventListener);
    };
  }, [isOpen]);

  // URL 변경 시 파비콘 자동 가져오기
  useEffect(() => {
    const fetchFavicon = async () => {
      if (url.trim()) {
        setFaviconLoading(true);
        try {
          const defaultFavicon = getFaviconUrl(url);
          setFavicon(defaultFavicon);

          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error("파비콘 가져오기 시간 초과")), 5000);
          });

          const faviconPromise = findFaviconFromWebsite(url);
          const actualFavicon = await Promise.race([faviconPromise, timeoutPromise]);
          setFavicon(actualFavicon);
        } catch {
          const defaultFavicon = getFaviconUrl(url);
          setFavicon(defaultFavicon);
        } finally {
          setFaviconLoading(false);
        }
      } else {
        setFavicon("");
      }
    };

    const timeoutId = setTimeout(fetchFavicon, 1000);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert(t("bookmarks.bookmarkTitleRequired"));
      return;
    }
    if (!url.trim()) {
      alert(t("bookmarks.bookmarkUrlRequired"));
      return;
    }

    let validUrl = url.trim();
    if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
      validUrl = `https://${validUrl}`;
    }

    try {
      new URL(validUrl);
    } catch {
      alert(t("bookmarks.invalidUrl"));
      return;
    }

    setIsLoading(true);
    try {
      await onAdd({
        title: title.trim(),
        url: validUrl,
        description: description.trim() || "",
        collection: selectedCollection,
        tags: [],
        isFavorite: false,
        favicon: favicon || "",
      });
      onClose();
    } catch {
      // 에러는 상위 컴포넌트에서 처리
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (!title.trim() && value.trim()) {
      try {
        const urlObj = new URL(value.startsWith("http") ? value : `https://${value}`);
        const domain = urlObj.hostname.replace("www.", "");
        setTitle(domain);
      } catch {
        // URL이 유효하지 않은 경우 무시
      }
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-150";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("bookmarks.addBookmark")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL */}
            <div>
              <label className={labelClass}>
                {t("bookmarks.bookmarkUrl")} *
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com"
                  className={`${inputClass} pl-9`}
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                </div>
              </div>

              {/* 파비콘 미리보기 */}
              {url.trim() && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt={t("common.favicon")}
                        className="w-5 h-5 rounded"
                        onError={(e) => { e.currentTarget.src = "/favicon.svg"; }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-white/[0.06] flex items-center justify-center">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
                        </svg>
                      </div>
                    )}
                    {faviconLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-600">
                    {faviconLoading ? t("bookmarks.faviconLoading") : t("bookmarks.faviconPreview")}
                  </span>
                </div>
              )}
            </div>

            {/* 제목 */}
            <div>
              <label className={labelClass}>
                {t("bookmarks.bookmarkTitle")} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("bookmarks.bookmarkTitlePlaceholder")}
                className={inputClass}
                required
              />
            </div>

            {/* 설명 */}
            <div>
              <label className={labelClass}>
                {t("bookmarks.bookmarkDescription")} ({t("common.optional")})
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("bookmarks.bookmarkDescriptionPlaceholder")}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* 컬렉션 선택 */}
            {collections.length > 0 && (
              <div>
                <label className={labelClass}>
                  {t("bookmarks.bookmarkCollection")} ({t("common.optional")})
                </label>
                <div className="relative">
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className={`${inputClass} pl-9 appearance-none cursor-pointer`}
                  >
                    <option value="">{t("collections.noCollectionSelection")}</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors duration-150"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isLoading || !title.trim() || !url.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("common.adding")}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t("common.add")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
