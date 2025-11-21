import { useState, useEffect } from "react";
import type { Collection, CollectionFormData } from "../../types";
import { IconPicker } from "./IconPicker";
import * as LucideIcons from "lucide-react";
import { PinIcon } from "lucide-react";
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
  const [formData, setFormData] = useState<CollectionFormData>({
    name: "",
    description: "",
    icon: "Folder",
    parentId: null,
    isPinned: false,
  });
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // 컬렉션 데이터가 변경될 때 폼 데이터 업데이트
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
      toast.error("컬렉션 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleIconSelect = (iconName: string) => {
    setFormData({ ...formData, icon: iconName });
  };

  // 현재 선택된 아이콘 컴포넌트 렌더링
  const renderSelectedIcon = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[formData.icon];
    if (!IconComponent) return <LucideIcons.Folder className="w-6 h-6" />;
    return <IconComponent className="w-6 h-6" />;
  };

  // 자기 자신 및 하위 컬렉션을 부모 선택지에서 제외
  const descendantIds = collection?.id
    ? getDescendantIds(collections, collection.id)
    : [];
  const availableParents = collections.filter(
    (col) => col.id !== collection?.id && !descendantIds.includes(col.id)
  );

  if (!isOpen || !collection) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            컬렉션 수정
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="컬렉션 이름을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                아이콘
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-700 dark:text-gray-300">
                      {renderSelectedIcon()}
                    </div>
                    <span>{formData.icon}</span>
                  </div>
                  <span className="text-gray-500">선택</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="컬렉션에 대한 설명을 입력하세요 (선택사항)"
              />
            </div>

            {/* 상위 컬렉션 선택: 최상위 컬렉션이면 아예 렌더링하지 않음 */}
            {collection?.parentId !== null && availableParents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  상위 컬렉션
                </label>
                <select
                  value={formData.parentId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parentId: e.target.value || null,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">최상위 컬렉션</option>
                  {availableParents.map((parentCollection) => (
                    <option
                      key={parentCollection.id}
                      value={parentCollection.id}
                    >
                      {parentCollection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 고정하기 옵션 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) =>
                  setFormData({ ...formData, isPinned: e.target.checked })
                }
                className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor="isPinned"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2"
              >
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <PinIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
                <span>고정하기 (기본 탭으로 설정)</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-4 py-2 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "수정 중..." : "수정"}
              </button>
            </div>
          </form>
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
