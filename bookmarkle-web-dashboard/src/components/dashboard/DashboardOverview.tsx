import React, { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeftRight,
  ArrowUpDown,
  BookOpen,
  RotateCcw,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { SortableWidget } from "./SortableWidget";
import { QuickActions } from "./widgets/QuickActions";
import { BookmarksWidget } from "./widgets/BookmarksWidget";
import { ClockWidget } from "./widgets/ClockWidget";
import { BibleVerseWidget } from "./widgets/BibleVerseWidget";
import { NotificationDropdown } from "./NotificationDropdown";
import {
  useWidgetOrder,
  type WidgetConfig,
} from "../../hooks/widget/useWidgetOrder";
import type { Bookmark, Collection } from "../../types";
import { useAuthStore } from "../../stores";

interface DashboardOverviewProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onAddBookmark: () => void;
  onAddCollection: () => void;
  userId: string;
  bookmarksLoading?: boolean;
  collectionsLoading?: boolean;
}

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
};

const readSwappedInitial = (): boolean => {
  try {
    return localStorage.getItem("bookmarksWidget_swapped") === "true";
  } catch {
    return false;
  }
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  bookmarks,
  collections,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAddBookmark,
  onAddCollection,
  userId,
  bookmarksLoading = false,
  collectionsLoading = false,
}) => {
  const { t } = useTranslation();
  const {
    widgets,
    enabledWidgets,
    isEditMode,
    setIsEditMode,
    reorderWidgets,
    toggleWidget,
    resetWidgetOrder,
    moveWidgetUp,
    moveWidgetDown,
  } = useWidgetOrder(userId);

  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [bookmarkPanelSwapped, setBookmarkPanelSwapped] =
    useState(readSwappedInitial);
  const activeWidget = widgets.find((w) => w.id === activeWidgetId) ?? null;

  const handleWidgetDragStart = useCallback((event: DragStartEvent) => {
    setActiveWidgetId(String(event.active.id));
  }, []);

  const handleWidgetDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveWidgetId(null);
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      reorderWidgets(arrayMove(widgets, oldIndex, newIndex));
    },
    [widgets, reorderWidgets]
  );

  const renderWidget = useCallback(
    (widget: WidgetConfig) => {
      switch (widget.id) {
        case "clock":
          return <ClockWidget />;
        case "bookmarks":
          return (
            <BookmarksWidget
              bookmarks={bookmarks}
              collections={collections}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              loading={bookmarksLoading}
              isEditMode={isEditMode}
              swapped={bookmarkPanelSwapped}
            />
          );
        case "quick-actions":
          return (
            <QuickActions
              onAddBookmark={onAddBookmark}
              onAddCollection={onAddCollection}
              loading={collectionsLoading}
            />
          );
        case "bible-verse":
          return <BibleVerseWidget />;
        default:
          return null;
      }
    },
    [
      bookmarks,
      collections,
      onEdit,
      onDelete,
      onToggleFavorite,
      onAddBookmark,
      onAddCollection,
      bookmarksLoading,
      collectionsLoading,
      bookmarkPanelSwapped,
      isEditMode,
    ]
  );

  const toggleSwap = () => {
    const next = !bookmarkPanelSwapped;
    setBookmarkPanelSwapped(next);
    try {
      localStorage.setItem("bookmarksWidget_swapped", String(next));
    } catch {
      /* no-op */
    }
  };

  const widgetLabel = (id: string) => {
    if (id === "bookmarks") return "북마크";
    if (id === "clock") return "시계 / 날씨";
    if (id === "bible-verse") return "오늘의 성경말씀";
    if (id === "quick-actions") return "빠른 실행";
    return id;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("dashboard.title")}
        </h2>
        <div className="flex items-center flex-wrap gap-2 justify-end sm:justify-start">
          <NotificationDropdown userId={user?.uid} isMobile={isMobile} />

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap ${
              isEditMode
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            <Settings className="w-4 h-4" />
            {isEditMode
              ? t("dashboard.editComplete")
              : t("dashboard.editWidget")}
          </button>
          {isEditMode && (
            <button
              onClick={resetWidgetOrder}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {t("dashboard.reset")}
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleWidgetDragStart}
        onDragEnd={handleWidgetDragEnd}
      >
        <SortableContext
          items={enabledWidgets.map((widget) => widget.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {enabledWidgets.map((widget, index) => (
              <SortableWidget
                key={widget.id}
                id={widget.id}
                enabled={widget.enabled}
                isEditMode={isEditMode}
                isMobile={isMobile}
                onToggle={() => toggleWidget(widget.id)}
                onMoveUp={() => moveWidgetUp(widget.id)}
                onMoveDown={() => moveWidgetDown(widget.id)}
                canMoveUp={index > 0}
                canMoveDown={index < enabledWidgets.length - 1}
                animationDelay={index * 0.05}
                editControls={
                  widget.id === "bookmarks" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSwap();
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-white/[0.08] shadow-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <ArrowLeftRight className="hidden lg:block w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                      <ArrowUpDown className="lg:hidden w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                      <span className="hidden lg:inline text-xs text-violet-600 dark:text-violet-400 font-medium">
                        좌우 전환
                      </span>
                      <span className="lg:hidden text-xs text-violet-600 dark:text-violet-400 font-medium">
                        위아래 전환
                      </span>
                    </button>
                  ) : undefined
                }
              >
                {renderWidget(widget)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeWidget && (
            <div className="opacity-90 scale-[1.02] shadow-2xl rounded-xl ring-2 ring-violet-500/50 pointer-events-none">
              <div className="bg-white dark:bg-[#111113] rounded-xl border border-violet-200 dark:border-violet-500/30 px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {widgetLabel(activeWidget.id)}
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {isEditMode && (
        <div className="flex items-start gap-2 px-4 py-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-lg text-xs text-violet-600 dark:text-violet-400">
          <Settings className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p>{t("dashboard.editModeTip1")}</p>
            <p className="hidden md:block">{t("dashboard.editModeTip2")}</p>
            <p className="md:hidden">{t("dashboard.editModeTip3")}</p>
          </div>
        </div>
      )}
    </div>
  );
};
