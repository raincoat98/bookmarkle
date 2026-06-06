import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Collection, CollectionFormData } from "../../types";
import { IconPicker } from "./IconPicker";
import * as LucideIcons from "lucide-react";
import toast from "react-hot-toast";

interface EditCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    collectionId: string,
    collectionData: CollectionFormData
  ) => Promise<void>;
  collection: Collection | null;
  collections: Collection[];
}

// 하위 컬렉션 id 재귀적으로 구하는 함수
function getDescendantIds(
  collections: Collection[],
  targetId: string
): string[] {
  let result: string[] = [];
  for (const col of collections) {
    if (col.parentId === targetId) {
      result.push(col.id);
      result = result.concat(getDescendantIds(collections, col.id));
    }
  }
  return result;
}

export const EditCollectionModal = ({
  isOpen,
  onClose,
  onUpdate,
  collection,
  collections,
}: EditCollectionModalProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CollectionFormData>({
    name: "",
    description: "",
    icon: "Folder",
    parentId: null,
    isPinned: false,
  });
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (collection) {
      setFormData({
        name: collection.name,
        description: collection.description || "",
        icon: collection.icon,
        parentId: collection.parentId,
        isPinned: collection.isPinned || false,
      });
    }
  }, [collection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !formData.name.trim()) return;

    setLoading(true);
    try {
      await onUpdate(collection.id, formData);
      onClose();
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error(t("collections.updateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleIconSelect = (iconName: string) => {
    setFormData({ ...formData, icon: iconName });
  };

  const renderSelectedIcon = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[formData.icon];
    if (!IconComponent) return <LucideIcons.Folder className="w-4 h-4" />;
    return <IconComponent className="w-4 h-4" />;
  };

  // 자기 자신 및 하위 컬렉션을 부모 선택지에서 제외
  const descendantIds = collection?.id
    ? getDescendantIds(collections, collection.id)
    : [];
  const availableParents = collections.filter(
    (col) => col.id !== collection?.id && !descendantIds.includes(col.id)
  );

  if (!isOpen || !collection) return null;

  const inputClass =
    "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-150";
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        {/* 오버레이 */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 모달 */}
        <div className="relative w-full max-w-md bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("collections.editCollection")}
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
          <div className="px-5 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이름 */}
              <div>
                <label className={labelClass}>
                  {t("collections.collectionName")} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder={t("collections.collectionNamePlaceholder")}
                  required
                />
              </div>

              {/* 아이콘 선택 */}
              <div>
                <label className={labelClass}>
                  {t("collections.collectionIcon")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors duration-150 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-500 dark:text-gray-400">{renderSelectedIcon()}</span>
                    <span className="text-gray-700 dark:text-gray-300">{formData.icon}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t("collections.selectIcon")}
                  </span>
                </button>
              </div>

              {/* 설명 */}
              <div>
                <label className={labelClass}>
                  {t("collections.collectionDescription")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder={t("collections.collectionDescriptionPlaceholder")}
                />
              </div>

              {/* 상위 컬렉션 선택: 최상위 컬렉션이면 숨김 */}
              {collection?.parentId !== null && availableParents.length > 0 && (
                <div>
                  <label className={labelClass}>
                    {t("collections.parentCollection") ?? "상위 컬렉션"}
                  </label>
                  <div className="relative">
                    <select
                      value={formData.parentId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, parentId: e.target.value || null })
                      }
                      className={`${inputClass} appearance-none cursor-pointer pr-9`}
                    >
                      <option value="">{t("collections.rootCollection") ?? "최상위 컬렉션"}</option>
                      {availableParents.map((parentCollection) => (
                        <option key={parentCollection.id} value={parentCollection.id}>
                          {parentCollection.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* 고정하기 toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("collections.pinCollection")}
                  </p>
                </div>
                {/* toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isPinned}
                  onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-[#111113] ${
                    formData.isPinned ? "bg-violet-600" : "bg-gray-200 dark:bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-75 ${
                      formData.isPinned ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.08] disabled:opacity-50 transition-colors duration-150"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("common.saving") ?? "저장 중..."}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{t("common.save") ?? "수정"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 아이콘 피커 */}
      <IconPicker
        selectedIcon={formData.icon}
        onSelect={handleIconSelect}
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
      />
    </>
  );
};
