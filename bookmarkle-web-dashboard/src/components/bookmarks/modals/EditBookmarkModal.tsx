import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import type { Bookmark, BookmarkFormData, Collection } from "../../../types";
import { getFaviconUrl, findFaviconFromWebsite } from "../../../utils/favicon";
import { useTranslation } from "react-i18next";

interface EditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, bookmarkData: BookmarkFormData) => Promise<void>;
  bookmark: Bookmark | null;
  collections: Collection[];
}

export const EditBookmarkModal = ({
  isOpen,
  onClose,
  onUpdate,
  bookmark,
  collections,
}: EditBookmarkModalProps) => {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: "",
    url: "",
    description: "",
    favicon: "",
    collection: "",
    tags: [],
    isFavorite: false,
  });
  const [loading, setLoading] = useState(false);
  const [faviconLoading, setFaviconLoading] = useState(false);
  const [customFaviconUrl, setCustomFaviconUrl] = useState("");
  const [showCustomFaviconInput, setShowCustomFaviconInput] = useState(false);
  const [originalFavicon, setOriginalFavicon] = useState("");

  useEffect(() => {
    if (bookmark) {
      const favicon = bookmark.favicon || "";
      setFormData({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || "",
        favicon: favicon,
        collection: bookmark.collection || "",
        tags: bookmark.tags || [],
        isFavorite: bookmark.isFavorite || false,
      });
      setOriginalFavicon(favicon);
      if (isCustomFavicon(favicon)) {
        setCustomFaviconUrl(favicon);
        setShowCustomFaviconInput(true);
      } else {
        setCustomFaviconUrl("");
        setShowCustomFaviconInput(false);
      }
    }
  }, [bookmark, collections]);

  useEffect(() => {
    const fetchFavicon = async () => {
      if (formData.url && formData.url !== bookmark?.url && !customFaviconUrl) {
        setFaviconLoading(true);
        try {
          const defaultFavicon = getFaviconUrl(formData.url);
          setFormData((prev: BookmarkFormData) => ({ ...prev, favicon: defaultFavicon }));
          const actualFavicon = await findFaviconFromWebsite(formData.url);
          setFormData((prev: BookmarkFormData) => ({ ...prev, favicon: actualFavicon }));
        } catch {
          // 기본 파비콘 유지
        } finally {
          setFaviconLoading(false);
        }
      }
    };
    const id = setTimeout(fetchFavicon, 1000);
    return () => clearTimeout(id);
  }, [formData.url, bookmark?.url, customFaviconUrl]);

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (value && !formData.tags.includes(value)) {
      setFormData({ ...formData, tags: [...formData.tags, value] });
    }
    setTagInput("");
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent as unknown as { isComposing?: boolean };
    const isComposing = typeof nativeEvent.isComposing === "boolean" ? nativeEvent.isComposing : false;
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t: string) => t !== tag) });
  };

  const isValidUrl = (url: string): boolean => {
    try { new URL(url); return true; } catch { return false; }
  };

  const isCustomFavicon = (faviconUrl: string | undefined): boolean => {
    if (!faviconUrl) return false;
    return !faviconUrl.includes("google.com/s2/favicons");
  };

  const handleApplyCustomFavicon = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!bookmark) return;
    const trimmedUrl = customFaviconUrl.trim();
    if (trimmedUrl) {
      if (isValidUrl(trimmedUrl)) {
        const updatedFormData = { ...formData, favicon: trimmedUrl };
        setFormData(updatedFormData);
        setLoading(true);
        try {
          await onUpdate(bookmark.id, updatedFormData);
          toast.success(t("bookmarks.faviconApplied"));
        } catch {
          toast.error(t("bookmarks.bookmarkUpdateError"));
        } finally {
          setLoading(false);
        }
      } else {
        toast.error(t("bookmarks.invalidUrlFormat"));
      }
    }
  };

  const handleAutoFetchFavicon = async () => {
    if (formData.url) {
      setFaviconLoading(true);
      try {
        const defaultFavicon = getFaviconUrl(formData.url);
        setFormData((prev: BookmarkFormData) => ({ ...prev, favicon: defaultFavicon }));
        const actualFavicon = await findFaviconFromWebsite(formData.url);
        setFormData((prev: BookmarkFormData) => ({ ...prev, favicon: actualFavicon }));
      } catch {
        toast.error(t("bookmarks.faviconFetchError"));
      } finally {
        setFaviconLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmark || !formData.title || !formData.url) return;
    if (showCustomFaviconInput && customFaviconUrl.trim() && isValidUrl(customFaviconUrl.trim())) {
      setFormData((prev) => ({ ...prev, favicon: customFaviconUrl.trim() }));
    }
    setLoading(true);
    try {
      await onUpdate(bookmark.id, formData);
      onClose();
    } catch {
      toast.error(t("bookmarks.bookmarkUpdateError"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !bookmark) return null;

  const inputClass =
    "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-150";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("bookmarks.editBookmark")}
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
              <label className={labelClass}>{t("bookmarks.bookmarkUrl")} *</label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
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
            </div>

            {/* 제목 */}
            <div>
              <label className={labelClass}>{t("bookmarks.bookmarkTitle")} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("bookmarks.bookmarkTitlePlaceholder")}
                className={inputClass}
                required
              />
            </div>

            {/* 파비콘 */}
            <div>
              <label className={labelClass}>{t("common.favicon")}</label>
              <div className="flex items-center gap-3">
                {/* 파비콘 미리보기 */}
                <div className="relative w-8 h-8 flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center overflow-hidden">
                    {formData.favicon ? (
                      <img
                        src={formData.favicon}
                        alt={t("common.favicon")}
                        className="w-5 h-5 rounded"
                        onError={(e) => { e.currentTarget.src = "/favicon.svg"; }}
                      />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
                      </svg>
                    )}
                  </div>
                  {faviconLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/40 rounded-lg">
                      <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {/* 버튼들 */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAutoFetchFavicon}
                    disabled={!formData.url || faviconLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.10] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t("bookmarks.autoFetchFavicon")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showCustomFaviconInput) {
                        setCustomFaviconUrl(isCustomFavicon(formData.favicon) ? formData.favicon || "" : "");
                      }
                      setShowCustomFaviconInput(!showCustomFaviconInput);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors duration-150"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t("bookmarks.customFaviconInput")}
                  </button>
                </div>
              </div>

              {/* 커스텀 파비콘 URL 입력 */}
              {showCustomFaviconInput && (
                <div className="mt-2 space-y-2">
                  <input
                    type="url"
                    value={customFaviconUrl}
                    onChange={(e) => setCustomFaviconUrl(e.target.value)}
                    placeholder={t("bookmarks.customFaviconPlaceholder")}
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleApplyCustomFavicon}
                      disabled={!customFaviconUrl.trim() || customFaviconUrl.trim() === formData.favicon || loading}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : t("common.apply")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomFaviconInput(false);
                        setCustomFaviconUrl(isCustomFavicon(originalFavicon) ? originalFavicon : "");
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors duration-150"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 설명 */}
            <div>
              <label className={labelClass}>
                {t("bookmarks.bookmarkDescription")} ({t("common.optional")})
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.collection}
                    onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                    className={`${inputClass} pl-9 appearance-none cursor-pointer`}
                  >
                    <option value="">{t("collections.noCollectionSelection")}</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
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

            {/* 태그 */}
            <div>
              <label className={labelClass}>
                {t("bookmarks.bookmarkTags")} ({t("common.optional")})
              </label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={t("bookmarks.tagInputPlaceholder")}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors duration-150 whitespace-nowrap"
                >
                  {t("common.add")}
                </button>
              </div>
            </div>

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
                disabled={loading || !formData.title.trim() || !formData.url.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("common.updating")}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t("common.edit")}</span>
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
