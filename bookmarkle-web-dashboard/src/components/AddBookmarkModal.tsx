import React, { useState, useEffect } from "react";
import { X, Plus, Globe, Folder } from "lucide-react";
import type { Collection } from "../types";
import { getFaviconUrl, findFaviconFromWebsite } from "../utils/favicon";
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

  // URL이 변경될 때 파비콘 자동 가져오기
  useEffect(() => {
    const fetchFavicon = async () => {
      if (url.trim()) {
        setFaviconLoading(true);
        try {
          // 먼저 기본 파비콘 URL 생성
          const defaultFavicon = getFaviconUrl(url);
          setFavicon(defaultFavicon);

          // 웹사이트에서 실제 파비콘 찾기 시도 (타임아웃 설정)
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(
              () => reject(new Error("파비콘 가져오기 시간 초과")),
              5000
            );
          });

          const faviconPromise = findFaviconFromWebsite(url);
          const actualFavicon = await Promise.race([
            faviconPromise,
            timeoutPromise,
          ]);
          setFavicon(actualFavicon);
        } catch (error) {
          console.error("파비콘 가져오기 실패:", error);
          // 실패해도 기본 파비콘은 유지
          const defaultFavicon = getFaviconUrl(url);
          setFavicon(defaultFavicon);
        } finally {
          setFaviconLoading(false);
        }
      } else {
        setFavicon("");
      }
    };

    const timeoutId = setTimeout(fetchFavicon, 1000); // 1초 후 실행
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 기본 유효성 검사
    if (!title.trim()) {
      alert(t("bookmarks.bookmarkTitleRequired"));
      return;
    }

    if (!url.trim()) {
      alert(t("bookmarks.bookmarkUrlRequired"));
      return;
    }

    // URL 유효성 검사
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
      console.log("북마크 추가 시도:", {
        title: title.trim(),
        url: validUrl,
        description: description.trim() || "",
        collection: selectedCollection,
        tags: [],
        isFavorite: false,
        favicon: favicon || "",
      });

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
    } catch (error) {
      console.error("북마크 추가 실패:", error);
      console.error("오류 상세:", {
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        stack: error instanceof Error ? error.stack : "스택 없음",
        type: typeof error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // URL에서 자동으로 제목 추출 시도
    if (!title.trim() && value.trim()) {
      try {
        const urlObj = new URL(
          value.startsWith("http") ? value : `https://${value}`
        );
        const domain = urlObj.hostname.replace("www.", "");
        setTitle(domain);
      } catch {
        // URL이 유효하지 않은 경우 무시
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 래퍼 */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* 모달 컨테이너 */}
        <div className="relative w-full max-w-md animate-slide-up">
          <div className="card-glass max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 - 고정 */}
            <div className="flex items-center justify-between p-6 sm:p-8 pb-4 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 border-b border-white/20 dark:border-gray-700/30">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("bookmarks.addBookmark")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폼 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* URL 입력 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("bookmarks.bookmarkUrl")} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Globe className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      required
                    />
                  </div>
                  {/* 파비콘 미리보기 */}
                  {url.trim() && (
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        {favicon ? (
                          <img
                            src={favicon}
                            alt={t("common.favicon")}
                            className="w-6 h-6 rounded"
                            onError={(e) => {
                              e.currentTarget.src = "/favicon.svg";
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                            <Globe className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        {faviconLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-500"></div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {faviconLoading
                          ? t("bookmarks.faviconLoading")
                          : t("bookmarks.faviconPreview")}
                      </span>
                    </div>
                  )}
                </div>

                {/* 제목 입력 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("bookmarks.bookmarkTitle")} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("bookmarks.bookmarkTitlePlaceholder")}
                    className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>

                {/* 설명 입력 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("bookmarks.bookmarkDescription")} ({t("common.optional")}
                    )
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("bookmarks.bookmarkDescriptionPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>

                {/* 컬렉션 선택 */}
                {collections.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("bookmarks.bookmarkCollection")} (
                      {t("common.optional")})
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Folder className="w-5 h-5 text-gray-400" />
                      </div>
                      <select
                        value={selectedCollection}
                        onChange={(e) => setSelectedCollection(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200 text-gray-900 dark:text-white appearance-none cursor-pointer"
                      >
                        <option value="">
                          {t("collections.noCollectionSelection")}
                        </option>
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* 버튼 그룹 */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !title.trim() || !url.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl font-medium hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 backdrop-blur-sm flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner w-4 h-4"></div>
                        <span>{t("common.adding")}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{t("common.add")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
