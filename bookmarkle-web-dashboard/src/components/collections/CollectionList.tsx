import { useState } from "react";
import type { Collection } from "../../types";
import { renderCollectionIcon } from "../../utils/iconRenderer";
import { useTranslation } from "react-i18next";
import { Star, BookMarked, FolderX } from "lucide-react";
interface CollectionListProps {
  collections: Collection[];
  loading: boolean;
  selectedCollection: string;
  onCollectionChange: (collectionId: string) => void;
  onDeleteCollectionRequest: (
    collectionId: string,
    collectionName: string
  ) => void;
  onEditCollection: (collection: Collection) => void;
  onOpenAddCollectionModal: () => void;
  onOpenAddSubCollectionModal: (parentId: string) => void;
  collapsed?: boolean;
}

export const CollectionList = ({
  collections,
  loading,
  selectedCollection,
  onCollectionChange,
  onDeleteCollectionRequest,
  onEditCollection,
  onOpenAddCollectionModal,
  onOpenAddSubCollectionModal,
  collapsed = false,
}: CollectionListProps) => {
  const { t } = useTranslation();
  // 오픈된(열린) 컬렉션 id 목록
  const [openIds, setOpenIds] = useState<string[]>([]);

  // 상태 및 핸들러 추가
  const allIds = collections.map((col) => col.id);
  const handleOpenAll = () => setOpenIds(allIds);
  const handleCloseAll = () => setOpenIds([]);

  // 하위 컬렉션 존재 여부
  const hasChildren = (id: string) =>
    collections.some((col) => col.parentId === id);

  // 토글 핸들러
  const handleToggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]
    );
  };

  // 우클릭 컨텍스트 메뉴 이벤트
  const handleCollectionContextMenu = (
    e: React.MouseEvent,
    collectionId: string
  ) => {
    e.preventDefault();
    onOpenAddSubCollectionModal(collectionId);
  };

  // 트리 구조로 컬렉션을 렌더링하는 재귀 함수
  function renderCollectionTree(
    parentId: string | null,
    depth: number = 0
  ): React.JSX.Element[] {
    if (depth > 2) return [];
    const filteredCollections = collections
      .filter((col) => col.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return filteredCollections.flatMap((collection, index) => {
      const children = renderCollectionTree(collection.id, depth + 1);
      const isOpen = openIds.includes(collection.id);
      const hasChild = hasChildren(collection.id);
      const isLastChild = index === filteredCollections.length - 1;
      const nodes = [
        <div
          key={collection.id}
          className={`group w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 cursor-pointer relative tree-item border-l-4 ${
            selectedCollection === collection.id
              ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300 border-brand-500 dark:border-violet-500"
              : depth === 1
              ? "tree-depth-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
              : depth === 2
              ? "tree-depth-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] border-transparent"
          }`}
          style={{
            paddingLeft: `${depth * 8 + 6}px`,
          }}
          onContextMenu={
            depth < 2
              ? (e) => handleCollectionContextMenu(e, collection.id)
              : undefined
          }
          onClick={() => onCollectionChange(collection.id)}
        >
          {/* 트리 라인 표시 */}
          {depth > 0 && (
            <div className="tree-line">
              <div className="tree-line-horizontal"></div>
            </div>
          )}

          {/* 하위 컬렉션 연결선 - 마지막 자식이 아닌 경우에만 표시 */}
          {depth > 0 && !isLastChild && (
            <div className="tree-line-vertical"></div>
          )}

          {/* 트리 아이콘 영역 - 고정된 공간 할당 */}
          <div className="w-3 h-3 flex items-center justify-center mr-1">
            {hasChild && (
              <span
                className="tree-toggle"
                style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                title={isOpen ? t("collections.collapse") : t("collections.expand")}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(collection.id);
                }}
              >
                ▶
              </span>
            )}
            {!hasChild && depth > 0 && <span className="tree-leaf">└</span>}
          </div>

          <div className="flex items-center space-x-2">
            {/* PIN 버튼 - 왼쪽에 배치 */}
            {collection.isPinned && (
              <div className="flex-shrink-0">
                <div
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/15"
                  title={t("collections.pinnedCollection")}
                >
                  <Star
                    className="w-3 h-3 text-violet-500 dark:text-violet-400"
                    style={{ fill: "currentColor", stroke: "none" }}
                  />
                </div>
              </div>
            )}
            {renderCollectionIcon(collection.icon, "w-5 h-5")}
          </div>

          <div className="flex-1 min-w-0">
            {!collapsed && (
              <span className="font-medium block text-left truncate">
                {collection.name}
              </span>
            )}
          </div>

          {/* 액션 버튼들 - hover 시에만 표시 */}
          {!collapsed && (
            <div className="flex items-center space-x-0.5 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
              {/* 하위 컬렉션 추가 버튼 */}
              {depth < 2 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    onOpenAddSubCollectionModal(collection.id);
                  }}
                  className="p-0.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                  title={t("collections.addSubCollection")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}

              {/* 수정 버튼 */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  onEditCollection(collection);
                }}
                className="p-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                title={t("common.edit")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {/* 삭제 버튼 */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  onDeleteCollectionRequest(collection.id, collection.name);
                }}
                className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                title={t("common.delete")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          )}
        </div>,
      ];
      if (hasChild && isOpen) nodes.push(...children);
      return nodes;
    });
  }

  // 축소 모드에서는 간단한 아이콘 리스트만 표시
  if (collapsed) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* 축소된 컬렉션 목록 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* 전체 북마크 */}
          <button
            onClick={() => onCollectionChange("all")}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 ${
              selectedCollection === "all"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
            title={t("collections.all")}
          >
            <BookMarked className="w-5 h-5" />
          </button>

          {/* 즐겨찾기 */}
          <button
            onClick={() => onCollectionChange("favorites")}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 ${
              selectedCollection === "favorites"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
            title={t("bookmarks.favorites")}
          >
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </button>

          {/* 컬렉션 없음 */}
          <button
            onClick={() => onCollectionChange("none")}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 ${
              selectedCollection === "none"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
            title={t("collections.noCollection")}
          >
            <FolderX className="w-5 h-5" />
          </button>

          {/* 최상위 컬렉션들만 표시 */}
          {loading ? (
            <div className="space-y-2 mt-1 flex items-center justify-center py-4">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {t("common.loading")}
              </div>
            </div>
          ) : (
            collections
              .filter((col) => !col.parentId)
              .sort((a, b) => {
                // 핀된 컬렉션이 먼저 오도록 정렬
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((collection) => (
                <div key={collection.id} className="relative">
                  <button
                    onClick={() => onCollectionChange(collection.id)}
                    className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 ${
                      selectedCollection === collection.id
                        ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                    }`}
                    title={collection.name}
                  >
                    {renderCollectionIcon(collection.icon, "w-5 h-5")}
                  </button>
                  {collection.isPinned && (
                    <div className="absolute -top-1 -right-1">
                      <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-500/20">
                        <Star
                          className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400"
                          style={{ fill: "currentColor", stroke: "none" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>

        {/* 새 컬렉션 추가 버튼 */}
        <div className="p-2 border-t border-gray-200 dark:border-white/[0.06]">
          <button
            onClick={onOpenAddCollectionModal}
            className="w-full flex items-center justify-center p-3 btn-primary rounded-lg"
            title={t("collections.newCollection")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {t("collections.title")}
        </h2>
        <button
          onClick={
            openIds.length === allIds.length ? handleCloseAll : handleOpenAll
          }
          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] text-gray-600 dark:text-gray-400 font-medium"
        >
          {openIds.length === allIds.length
            ? t("collections.closeAll")
            : t("collections.openAll")}
        </button>
      </div>

      {/* 컬렉션 목록 */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        <nav className="space-y-1">
          {/* 전체 북마크 */}
          <button
            onClick={() => onCollectionChange("all")}
            className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 ${
              selectedCollection === "all"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
          >
            <BookMarked className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">
              {t("collections.all")}
            </span>
          </button>

          {/* 즐겨찾기 */}
          <button
            onClick={() => onCollectionChange("favorites")}
            className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 ${
              selectedCollection === "favorites"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
          >
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">
              {t("bookmarks.favorites")}
            </span>
          </button>

          {/* 컬렉션 없음 */}
          <button
            onClick={() => onCollectionChange("none")}
            className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-200 ${
              selectedCollection === "none"
                ? "bg-brand-100 dark:bg-violet-950/50 text-brand-700 dark:text-violet-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
            }`}
          >
            <FolderX className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">
              {t("collections.noCollection")}
            </span>
          </button>

          {loading ? (
            <div className="mt-2 flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">
                {t("common.loading")}
              </div>
            </div>
          ) : (
            <>
              {collections.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>{t("collections.noCollectionsFound")}</p>
                  <p className="text-sm mt-1">
                    {t("collections.createNewCollection")}
                  </p>
                </div>
              )}

              {/* 트리 구조 컬렉션 렌더링 */}
              {renderCollectionTree(null, 0)}
            </>
          )}
        </nav>
      </div>

      {/* 새 컬렉션 추가 버튼 */}
      <div className="p-3 border-t border-gray-100 dark:border-white/[0.06]">
        <button
          onClick={onOpenAddCollectionModal}
          className="w-full flex items-center justify-center space-x-2 btn-primary py-2 font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="whitespace-nowrap">
            {t("collections.newCollection")}
          </span>
        </button>
      </div>
    </div>
  );
};
