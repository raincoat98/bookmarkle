import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion } from "framer-motion";
import {
  Plus,
  FolderPlus,
  Move,
  Settings,
  RotateCcw,
  Eye,
  EyeOff,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Globe,
  Edit,
  Trash2,
  Heart,
  Bell,
  X,
  Check,
} from "lucide-react";
import type { Bookmark, Collection, SortOption } from "../types";
import { sortBookmarks } from "../utils/sortBookmarks";
import {
  getUserNotificationSettings,
  setUserNotificationSettings,
  db,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import bibleVerses from "../data/bibleVerses.json";
import { WeatherWidget } from "./WeatherWidget";
import { useTranslation } from "../../node_modules/react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWidgetOrder } from "../hooks/useWidgetOrder";
import type { WidgetId, WidgetConfig } from "../hooks/useWidgetOrder";
import { useAuthStore } from "../stores";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface BookmarksWidgetProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  currentSort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

interface QuickActionsProps {
  onAddBookmark: () => void;
  onAddCollection: () => void;
}

interface DashboardOverviewProps {
  bookmarks: Bookmark[];
  collections: Collection[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onAddBookmark: () => void;
  onAddCollection: () => void;
  currentSort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  userId: string;
}

// 정렬 가능한 위젯 컴포넌트
const SortableWidget: React.FC<{
  id: WidgetId;
  children: React.ReactNode;
  isEditMode: boolean;
  enabled: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}> = ({
  id,
  children,
  isEditMode,
  enabled,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const { t } = useTranslation();
  // 화면 크기 감지를 위한 상태
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md 브레이크포인트
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    disabled: !isEditMode || isMobile, // 모바일에서는 드래그 비활성화
    transition: {
      duration: 150,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!enabled && !isEditMode) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "opacity-50 z-50" : ""} ${
        isEditMode && !isMobile ? "cursor-move" : ""
      } ${!enabled && isEditMode ? "opacity-50" : ""}`}
      {...(isMobile ? {} : { ...attributes, ...listeners })} // 모바일에서는 드래그 리스너 제거
    >
      {isEditMode && (
        <div className="absolute top-2 right-2 z-10 flex flex-col space-y-2">
          {/* 토글 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={
              enabled ? t("dashboard.hideWidget") : t("dashboard.showWidget")
            }
          >
            {enabled ? (
              <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* 모바일용 이동 버튼 그룹 */}
          <div className="md:hidden flex flex-col space-y-1">
            {canMoveUp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.();
                }}
                className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={t("common.moveUp")}
              >
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            {canMoveDown && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.();
                }}
                className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={t("common.moveDown")}
              >
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* 데스크톱용 드래그 핸들 */}
          <div className="hidden md:block p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <Move className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      )}
      <div
        className={`${
          isEditMode
            ? "border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-2"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// 사용하지 않는 코드 제거됨

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddBookmark,
  onAddCollection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card-glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {t("dashboard.quickActions")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onAddBookmark}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-soft">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addBookmark")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addBookmarkDescription")}
            </p>
          </div>
        </button>
        <button
          onClick={onAddCollection}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-soft">
            <FolderPlus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addCollection")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addCollectionDescription")}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

// 통합 북마크 위젯 (즐겨찾기 + 최근 북마크)
const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  currentSort,
  onSortChange,
}) => {
  const { t } = useTranslation();

  // 즐겨찾기 북마크 (컬렉션 정보 포함)
  const favoriteBookmarks = useMemo(() => {
    const filtered = bookmarks.filter((b) => b.isFavorite);
    if (currentSort && onSortChange) {
      return sortBookmarks(filtered, currentSort).slice(0, 6);
    }
    return filtered.slice(0, 6);
  }, [bookmarks, currentSort, onSortChange]);

  // 최근 북마크 (컬렉션 정보 포함)
  const recentBookmarks = useMemo(() => {
    return bookmarks
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [bookmarks]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("dashboard.today");
    if (diffDays === 1) return t("dashboard.yesterday");
    if (diffDays < 7) return t("dashboard.daysAgo", { count: diffDays });
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const handleFaviconClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="card-glass p-4 sm:p-6 h-full flex flex-col min-h-[400px] sm:min-h-[500px]">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
        <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mr-2 sm:mr-3" />
        {t("bookmarks.title")}
      </h3>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* 왼쪽: 즐겨찾기 북마크 */}
        <div className="favorites-section group/fav-section flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-lg transition-all duration-300">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <Sparkles className="w-4 h-4 text-yellow-500 mr-2" />
            {t("bookmarks.favorites")}
          </h4>
          {favoriteBookmarks.length > 0 ? (
            <div className="flex flex-wrap gap-3 flex-1">
              {favoriteBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="relative flex flex-col items-center p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-lg hover:scale-105 transition-all duration-300 w-20 h-24 flex-shrink-0 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30"
                >
                  {/* 파비콘 아이콘 */}
                  <div
                    className="w-10 h-10 rounded-lg shadow-lg hover:shadow-xl group-hover/fav-section:scale-110 transition-all duration-300 cursor-pointer mb-2 relative overflow-hidden"
                    onClick={() => handleFaviconClick(bookmark.url)}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${
                        new URL(bookmark.url).hostname
                      }&sz=32`}
                      alt={bookmark.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-r from-yellow-400 to-orange-500"
                      style={{ display: "none" }}
                    >
                      <Sparkles className="w-5 h-5 text-white group-hover/fav-section:animate-pulse" />
                    </div>
                  </div>

                  {/* 제목 */}
                  <p
                    className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </p>

                  {/* 호버 시 액션 버튼들 - 상단 그룹 */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover/fav-section:opacity-100 transition-all duration-300 transform group-hover/fav-section:scale-110">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(bookmark.id, false);
                      }}
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("bookmarks.removeFromFavorites")}
                    >
                      <Heart className="w-3 h-3 fill-current" />
                    </button>
                  </div>

                  {/* 하단 액션 버튼들 - 하단 그룹 */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/fav-section:opacity-100 transition-all duration-300 flex space-x-2 group-hover/fav-section:scale-105">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bookmark);
                      }}
                      className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.edit")}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bookmark.id);
                      }}
                      className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noFavorites")}
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 최근 북마크 */}
        <div className="recent-section group/recent-section flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <Globe className="w-4 h-4 text-blue-500 mr-2" />
            {t("bookmarks.recentlyAdded")}
          </h4>
          {recentBookmarks.length > 0 ? (
            <div className="flex flex-wrap gap-3 flex-1">
              {recentBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="relative flex flex-col items-center p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-lg hover:scale-105 transition-all duration-300 w-20 h-28 flex-shrink-0 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-600/30"
                >
                  {/* 파비콘 아이콘 */}
                  <div
                    className="w-10 h-10 rounded-lg shadow-lg hover:shadow-xl group-hover/recent-section:scale-110 transition-all duration-300 cursor-pointer mb-2 relative overflow-hidden"
                    onClick={() => handleFaviconClick(bookmark.url)}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${
                        new URL(bookmark.url).hostname
                      }&sz=32`}
                      alt={bookmark.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ display: "none" }}
                    >
                      <Globe className="w-5 h-5 text-white group-hover/recent-section:animate-pulse" />
                    </div>
                  </div>

                  {/* 제목 */}
                  <p
                    className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </p>

                  {/* 날짜 */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {formatDate(bookmark.createdAt)}
                  </p>

                  {/* 호버 시 액션 버튼들 - 상단 그룹 */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover/recent-section:opacity-100 transition-all duration-300 transform group-hover/recent-section:scale-110">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(bookmark.id, !bookmark.isFavorite);
                      }}
                      className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={
                        bookmark.isFavorite
                          ? t("bookmarks.removeFromFavorites")
                          : t("bookmarks.addToFavorites")
                      }
                    >
                      <Heart
                        className={`w-3 h-3 ${
                          bookmark.isFavorite ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* 하단 액션 버튼들 - 하단 그룹 */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/recent-section:opacity-100 transition-all duration-300 flex space-x-2 group-hover/recent-section:scale-105">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bookmark);
                      }}
                      className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.edit")}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bookmark.id);
                      }}
                      className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("bookmarks.noRecentBookmarks")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 시계 위젯 (시계와 날씨만 포함)
export const ClockWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 언어에 따른 로케일 설정
  const getLocale = () => {
    switch (i18n.language) {
      case "ko":
        return "ko-KR";
      case "ja":
        return "ja-JP";
      case "en":
        return "en-US";
      default:
        return "ko-KR";
    }
  };

  const dateStr = now.toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4">
      {/* 시계 */}
      <div className="sm:col-span-2 card-glass p-3 sm:p-4 flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[140px]">
        <div className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text tracking-wider mb-1">
          {timeStr}
        </div>
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {dateStr}
        </div>
      </div>

      {/* 날씨 */}
      <div className="sm:col-span-3">
        <WeatherWidget />
      </div>
    </div>
  );
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  bookmarks,
  collections,
  onEdit,
  onDelete,
  onToggleFavorite,
  onAddBookmark,
  onAddCollection,
  currentSort,
  onSortChange,
  userId,
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

  // 알림 관련 상태
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications(user?.uid || "");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const getInitialNotificationsSetting = () => {
    const saved = localStorage.getItem("notifications");
    if (saved !== null) return JSON.parse(saved);
    const legacy = localStorage.getItem("bookmarkNotifications");
    if (legacy !== null) return JSON.parse(legacy);
    return true;
  };

  const initialNotificationsEnabled = getInitialNotificationsSetting();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialNotificationsEnabled
  );

  // Firestore에서 알림 설정 실시간 동기화
  useEffect(() => {
    if (!user?.uid) return;

    const settingsRef = doc(db, "users", user.uid, "settings", "main");

    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const recordValue =
            data.notifications !== undefined
              ? data.notifications
              : data.bookmarkNotifications !== undefined
              ? data.bookmarkNotifications
              : true;

          setNotificationsEnabled(recordValue);
          localStorage.setItem("notifications", JSON.stringify(recordValue));
          localStorage.setItem(
            "bookmarkNotifications",
            JSON.stringify(recordValue)
          );
        } else {
          setNotificationsEnabled(true);
          localStorage.setItem("notifications", JSON.stringify(true));
          localStorage.setItem("bookmarkNotifications", JSON.stringify(true));
        }
      },
      (error) => {
        console.error("알림 설정 실시간 동기화 실패:", error);
        getUserNotificationSettings(user.uid)
          .then((settings) => {
            const recordValue =
              settings.notifications !== undefined
                ? settings.notifications
                : settings.bookmarkNotifications;

            if (recordValue !== undefined) {
              setNotificationsEnabled(recordValue);
              localStorage.setItem(
                "notifications",
                JSON.stringify(recordValue)
              );
              localStorage.setItem(
                "bookmarkNotifications",
                JSON.stringify(recordValue)
              );
            }
          })
          .catch((err) => {
            console.error("알림 설정 로드 실패:", err);
          });
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 외부 클릭 감지로 알림 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node) &&
        isNotificationOpen
      ) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationOpen]);

  // 모바일 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // 알림이 비활성화되면 드롭다운 닫기
  useEffect(() => {
    if (!notificationsEnabled) {
      setIsNotificationOpen(false);
    }
  }, [notificationsEnabled]);

  // 설정 페이지에서 알림 상태 변경 감지
  useEffect(() => {
    const handleNotificationsChange = (event: CustomEvent) => {
      setNotificationsEnabled(event.detail.enabled);
    };

    window.addEventListener(
      "notificationsChanged",
      handleNotificationsChange as EventListener
    );
    window.addEventListener(
      "bookmarkNotificationsChanged",
      handleNotificationsChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "notificationsChanged",
        handleNotificationsChange as EventListener
      );
      window.removeEventListener(
        "bookmarkNotificationsChanged",
        handleNotificationsChange as EventListener
      );
    };
  }, []);

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 위젯 드래그 종료 핸들러
  const handleWidgetDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      reorderWidgets(newWidgets);
    },
    [widgets, reorderWidgets]
  );

  // 위젯 렌더링 함수
  const renderWidget = useCallback(
    (widget: WidgetConfig) => {
      const { id } = widget;

      switch (id) {
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
              currentSort={currentSort}
              onSortChange={onSortChange}
            />
          );
        case "quick-actions":
          return (
            <QuickActions
              onAddBookmark={onAddBookmark}
              onAddCollection={onAddCollection}
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
      currentSort,
      onSortChange,
    ]
  );

  return (
    <div className="space-y-8">
      {/* 위젯 편집 컨트롤 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("dashboard.title")}
        </h2>
        <div className="flex items-center space-x-2">
          {/* 알림 버튼 - 알림이 활성화된 경우에만 표시 */}
          {notificationsEnabled && (
            <div className="relative">
              <button
                onClick={() => {
                  if (isMobile) {
                    navigate("/notifications");
                  } else {
                    setIsNotificationOpen(!isNotificationOpen);
                  }
                }}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                aria-label={t("notifications.title")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* 알림 드롭다운 - 데스크톱에서만 표시 */}
              {isNotificationOpen && !isMobile && (
                <div
                  ref={notificationDropdownRef}
                  className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col"
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("notifications.title")}
                    </h3>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={deleteAllNotifications}
                          className="text-xs sm:text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 px-1 sm:px-0"
                        >
                          {t("notifications.deleteAll")}
                        </button>
                      )}
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs sm:text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 px-1 sm:px-0"
                        >
                          {t("notifications.markAllAsRead")}
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 알림 목록 */}
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t("notifications.noNotifications")}</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            !notification.isRead
                              ? "bg-blue-50/50 dark:bg-blue-900/10"
                              : ""
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            {/* 아이콘 */}
                            <div
                              className={`p-2 rounded-lg ${
                                notification.type === "bookmark_added"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  : notification.type === "bookmark_updated"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : notification.type === "bookmark_deleted"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {notification.type === "bookmark_added" ? (
                                <BookOpen className="w-4 h-4" />
                              ) : notification.type === "bookmark_updated" ? (
                                <Edit className="w-4 h-4" />
                              ) : notification.type === "bookmark_deleted" ? (
                                <Trash2 className="w-4 h-4" />
                              ) : (
                                <Bell className="w-4 h-4" />
                              )}
                            </div>

                            {/* 내용 */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {(() => {
                                  const now = new Date();
                                  const notificationDate = new Date(
                                    notification.createdAt
                                  );
                                  const diffTime =
                                    now.getTime() - notificationDate.getTime();
                                  const diffMinutes = Math.floor(
                                    diffTime / (1000 * 60)
                                  );
                                  const diffHours = Math.floor(
                                    diffTime / (1000 * 60 * 60)
                                  );
                                  const diffDays = Math.floor(
                                    diffTime / (1000 * 60 * 60 * 24)
                                  );

                                  if (diffMinutes < 1) {
                                    return t("notifications.justNow");
                                  } else if (diffMinutes < 60) {
                                    return t("notifications.minutesAgo", {
                                      count: diffMinutes,
                                    });
                                  } else if (diffHours < 24) {
                                    return t("notifications.hoursAgo", {
                                      count: diffHours,
                                    });
                                  } else {
                                    return t("notifications.daysAgo", {
                                      count: diffDays,
                                    });
                                  }
                                })()}
                              </p>
                            </div>

                            {/* 액션 버튼 */}
                            <div className="flex flex-col space-y-1">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title={t("notifications.markAsRead")}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteNotification(notification.id)
                                }
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                title={t("notifications.deleteNotification")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 알림 설정 */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t("notifications.bookmarkNotifications")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("notifications.bookmarkNotificationsDescription")}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!user?.uid) return;

                          const newValue = !notificationsEnabled;
                          setNotificationsEnabled(newValue);
                          localStorage.setItem(
                            "notifications",
                            JSON.stringify(newValue)
                          );
                          localStorage.setItem(
                            "bookmarkNotifications",
                            JSON.stringify(newValue)
                          );

                          try {
                            await setUserNotificationSettings(user.uid, {
                              notifications: newValue,
                              bookmarkNotifications: newValue,
                            });
                          } catch (error) {
                            console.error("알림 설정 저장 실패:", error);
                            const previousValue = !newValue;
                            setNotificationsEnabled(previousValue);
                            localStorage.setItem(
                              "notifications",
                              JSON.stringify(previousValue)
                            );
                            localStorage.setItem(
                              "bookmarkNotifications",
                              JSON.stringify(previousValue)
                            );
                          }

                          window.dispatchEvent(
                            new CustomEvent("notificationsChanged", {
                              detail: { enabled: newValue },
                            })
                          );
                          window.dispatchEvent(
                            new CustomEvent("bookmarkNotificationsChanged", {
                              detail: { enabled: newValue },
                            })
                          );

                          toast.success(
                            `${t("notifications.bookmarkNotifications")} ${
                              newValue
                                ? t("notifications.enable")
                                : t("notifications.disable")
                            }`
                          );
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notificationsEnabled
                            ? "bg-blue-600"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationsEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isEditMode
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>
              {isEditMode
                ? t("dashboard.editComplete")
                : t("dashboard.editWidget")}
            </span>
          </button>
          {isEditMode && (
            <button
              onClick={resetWidgetOrder}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center space-x-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t("dashboard.reset")}</span>
            </button>
          )}
        </div>
      </div>

      {/* 메인 레이아웃 - 모든 위젯을 통합 드래그 시스템으로 관리 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleWidgetDragEnd}
      >
        <SortableContext
          items={enabledWidgets.map((widget) => widget.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* 모든 위젯을 순서대로 렌더링 */}
            {widgets
              .filter((widget) => widget.enabled || isEditMode)
              .map((widget, index) => {
                const canMoveUp = index > 0;
                const canMoveDown = index < widgets.length - 1;

                return (
                  <SortableWidget
                    key={widget.id}
                    id={widget.id}
                    enabled={widget.enabled}
                    isEditMode={isEditMode}
                    onToggle={() => toggleWidget(widget.id)}
                    onMoveUp={() => moveWidgetUp(widget.id)}
                    onMoveDown={() => moveWidgetDown(widget.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                );
              })}
          </div>
        </SortableContext>
      </DndContext>

      {/* 편집 모드 도움말 */}
      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
            <Settings className="w-5 h-5" />
            <h3 className="font-medium">{t("dashboard.editMode")}</h3>
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
            <p>• {t("dashboard.editModeTip1")}</p>
            <p className="hidden md:block">• {t("dashboard.editModeTip2")}</p>
            <p className="md:hidden">• {t("dashboard.editModeTip3")}</p>
            <p>• {t("dashboard.editModeTip4")}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 성경 구절 위젯 컴포넌트
const BibleVerseWidget: React.FC = () => {
  const { t } = useTranslation();
  const [currentVerse, setCurrentVerse] = useState(() => {
    const data = bibleVerses as {
      verses: Array<{ verse: string; reference: string }>;
    };
    const randomIndex = Math.floor(Math.random() * data.verses.length);
    return data.verses[randomIndex];
  });
  const [copied, setCopied] = useState(false);

  // 배경 그라디언트 배열 - 더 다양한 색상 조합
  const backgrounds = [
    // 블루 계열
    "bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90",
    "bg-gradient-to-br from-indigo-900/90 via-blue-900/90 to-cyan-900/90",
    "bg-gradient-to-br from-cyan-900/90 via-blue-900/90 to-indigo-900/90",
    "bg-gradient-to-br from-sky-900/90 via-blue-900/90 to-slate-900/90",
    "bg-gradient-to-br from-blue-800/90 via-indigo-800/90 to-purple-800/90",

    // 퍼플/핑크 계열
    "bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-red-900/90",
    "bg-gradient-to-br from-violet-900/90 via-purple-900/90 to-indigo-900/90",
    "bg-gradient-to-br from-rose-900/90 via-pink-900/90 to-purple-900/90",
    "bg-gradient-to-br from-fuchsia-900/90 via-purple-900/90 to-violet-900/90",
    "bg-gradient-to-br from-pink-800/90 via-rose-800/90 to-red-800/90",

    // 그린/틸 계열
    "bg-gradient-to-br from-emerald-900/90 via-teal-900/90 to-blue-900/90",
    "bg-gradient-to-br from-teal-900/90 via-cyan-900/90 to-blue-900/90",
    "bg-gradient-to-br from-green-900/90 via-emerald-900/90 to-teal-900/90",
    "bg-gradient-to-br from-lime-800/90 via-green-800/90 to-emerald-800/90",

    // 웜톤 계열
    "bg-gradient-to-br from-orange-900/90 via-red-900/90 to-pink-900/90",
    "bg-gradient-to-br from-amber-900/90 via-orange-900/90 to-red-900/90",
    "bg-gradient-to-br from-yellow-800/90 via-amber-800/90 to-orange-800/90",
    "bg-gradient-to-br from-red-900/90 via-rose-900/90 to-pink-900/90",

    // 다크/뉴트럴 계열
    "bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-zinc-900/90",
    "bg-gradient-to-br from-gray-900/90 via-slate-900/90 to-stone-900/90",
    "bg-gradient-to-br from-zinc-900/90 via-neutral-900/90 to-stone-900/90",

    // 특별한 조합들
    "bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-teal-900/90",
    "bg-gradient-to-br from-rose-900/90 via-orange-900/90 to-amber-900/90",
    "bg-gradient-to-br from-emerald-900/90 via-blue-900/90 to-purple-900/90",
    "bg-gradient-to-br from-indigo-900/90 via-pink-900/90 to-red-900/90",
    "bg-gradient-to-br from-teal-900/90 via-purple-900/90 to-rose-900/90",

    // 대각선 방향 변화
    "bg-gradient-to-tr from-blue-900/90 via-purple-900/90 to-pink-900/90",
    "bg-gradient-to-tl from-emerald-900/90 via-cyan-900/90 to-blue-900/90",
    "bg-gradient-to-bl from-violet-900/90 via-indigo-900/90 to-blue-900/90",
    "bg-gradient-to-r from-orange-900/90 via-red-900/90 to-rose-900/90",
  ];

  // 마운트 시 랜덤 배경 선택
  const [backgroundIndex] = useState(() =>
    Math.floor(Math.random() * backgrounds.length)
  );

  // 성경말씀 복사 기능
  const handleCopyVerse = async () => {
    if (!currentVerse) {
      console.log("복사할 말씀이 없습니다.");
      return;
    }

    const textToCopy = `"${currentVerse.verse}" - ${currentVerse.reference}`;
    console.log("복사 시도:", textToCopy);

    // 현대적인 Clipboard API 시도
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        console.log("Clipboard API로 복사 성공");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      } catch (error) {
        console.error("Clipboard API 복사 실패:", error);
      }
    }

    // Fallback: execCommand 방법
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        console.log("execCommand로 복사 성공");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        console.error("execCommand 복사 실패");
        alert("복사 기능을 사용할 수 없습니다. 브라우저가 지원하지 않습니다.");
      }
    } catch (fallbackError) {
      console.error("모든 복사 방법 실패:", fallbackError);
      alert(
        "복사 기능을 사용할 수 없습니다. 수동으로 텍스트를 선택해서 복사해주세요."
      );
    }
  };

  // 마운트 시에만 한 번 설정 (interval 제거)
  useEffect(() => {
    const data = bibleVerses as {
      verses: Array<{ verse: string; reference: string }>;
    };
    const randomIndex = Math.floor(Math.random() * data.verses.length);
    setCurrentVerse(data.verses[randomIndex]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateX: -15 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotateX: 0,
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-2xl md:rounded-3xl ${backgrounds[backgroundIndex]} backdrop-blur-xl border border-white/20 shadow-2xl min-h-[280px] sm:min-h-[320px] md:min-h-[400px] flex items-center cursor-pointer`}
      onClick={handleCopyVerse}
      title={copied ? t("dashboard.copied") : t("dashboard.clickToCopyVerse")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopyVerse();
        }
      }}
    >
      {/* 애니메이션 배경 패턴 - z-index를 낮게 설정하여 텍스트 뒤로 배치 */}
      <div className="absolute inset-0 opacity-10" style={{ zIndex: -10 }}>
        {/* 움직이는 원형 패턴들 */}
        <div
          className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]"
          style={{
            animation: "spin 60s linear infinite",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05)_0%,transparent_50%)]"
          style={{
            animation: "spin 90s linear infinite reverse",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)]"
          style={{
            animation: "ping 8s cubic-bezier(0, 0, 0.2, 1) infinite",
            zIndex: -10,
          }}
        ></div>

        {/* 떠다니는 점들 - 더 많은 효과 */}
        <div
          className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-bounce duration-[3000ms]"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-3/4 right-1/4 w-1 h-1 bg-white/30 rounded-full animate-bounce duration-[4000ms] delay-1000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce duration-[3500ms] delay-2000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-1/3 right-1/2 w-1 h-1 bg-white/15 rounded-full animate-bounce duration-[2800ms] delay-500"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce duration-[3200ms] delay-1500"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute top-2/3 left-2/3 w-1 h-1 bg-white/25 rounded-full animate-bounce duration-[3600ms] delay-3000"
          style={{ zIndex: -10 }}
        ></div>

        {/* 움직이는 그라디언트 오버레이들 */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse duration-[8000ms]"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/3 to-transparent animate-pulse duration-[12000ms] delay-2000"
          style={{ zIndex: -10 }}
        ></div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-transparent via-white/2 to-transparent animate-pulse duration-[10000ms] delay-4000"
          style={{ zIndex: -10 }}
        ></div>

        {/* 흐르는 빛의 선들 */}
        <div
          className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60"
          style={{
            animation: "float-horizontal 15s infinite ease-in-out",
            zIndex: -10,
          }}
        ></div>
        <div
          className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40"
          style={{
            animation: "float-horizontal-reverse 20s infinite ease-in-out",
            zIndex: -10,
          }}
        ></div>
      </div>

      {/* 메인 콘텐츠 - z-index를 높게 설정하여 배경 패턴 위에 표시 */}
      <motion.div
        className="relative p-4 sm:p-6 md:p-8 lg:p-12 text-center w-full"
        style={{ zIndex: 100 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <motion.div
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <div
            className="inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 shadow-lg relative"
            style={{ zIndex: 200 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="w-5 h-5 text-white/80" />
            </motion.div>
            <span className="text-white/80 text-sm font-medium">
              {copied ? t("dashboard.copied") : t("dashboard.todaysBibleVerse")}
            </span>
          </div>
        </motion.div>

        {/* 복사 상태 알림 */}
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-4 right-4 bg-white/90 text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-xl backdrop-blur-sm border border-white/20 flex items-center space-x-2"
            style={{ zIndex: 300 }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              ✓
            </motion.div>
            <span>{t("dashboard.copied")}</span>
          </motion.div>
        )}

        <div className="space-y-8">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
          >
            <motion.div
              className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 1.5, duration: 1 }}
            ></motion.div>
            <motion.div
              className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-light text-white leading-relaxed tracking-wide px-2 sm:px-3 md:px-4 relative"
              style={{
                zIndex: 200,
                textShadow:
                  "0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6)",
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
              }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
            >
              {(() => {
                const verse = currentVerse.verse;
                // 줄바꿈을 위한 적절한 지점 찾기 (구두점이나 문절 끝)
                const breakPatterns = [
                  " 그리하면 ",
                  " 그러므로 ",
                  " 하지만 ",
                  " 그런데 ",
                  " 왜냐하면 ",
                  " 그리고 ",
                ];

                for (const pattern of breakPatterns) {
                  if (verse.includes(pattern)) {
                    const parts = verse.split(pattern);
                    return (
                      <>
                        "{parts[0]}
                        {pattern.trim()}
                        <br />
                        {parts.slice(1).join(pattern)}"
                      </>
                    );
                  }
                }

                // 특별한 패턴이 없으면 쉼표나 적절한 지점에서 분할
                const commaIndex = verse.indexOf(",");
                if (commaIndex > 10 && commaIndex < verse.length - 10) {
                  return (
                    <>
                      "{verse.substring(0, commaIndex + 1)}
                      <br />
                      {verse.substring(commaIndex + 1).trim()}"
                    </>
                  );
                }

                // 적절한 지점이 없으면 중간에서 분할
                const words = verse.split(" ");
                if (words.length > 8) {
                  const midPoint = Math.floor(words.length / 2);
                  return (
                    <>
                      "{words.slice(0, midPoint).join(" ")}
                      <br />
                      {words.slice(midPoint).join(" ")}"
                    </>
                  );
                }

                // 짧은 문장은 그대로 표시
                return `"${verse}"`;
              })()}
            </motion.div>
            <motion.div
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 2, duration: 1 }}
            ></motion.div>
          </motion.div>

          <motion.div
            className="pt-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            <p
              className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 font-medium tracking-wide relative"
              style={{
                zIndex: 200,
                textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
              }}
            >
              {currentVerse.reference}
            </p>
            <p
              className="text-xs text-white/70 mt-2 font-light tracking-wide relative"
              style={{
                zIndex: 200,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {
                (bibleVerses as { _copyright: { notice: string } })._copyright
                  .notice
              }
            </p>
          </motion.div>
        </div>

        {/* 장식 요소 - 중간 레이어에 배치 */}
        <motion.div
          className="absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 w-12 sm:w-16 md:w-20 lg:w-24 h-12 sm:h-16 md:h-20 lg:h-24 bg-white/5 rounded-full backdrop-blur-sm border border-white/10"
          style={{ zIndex: 50 }}
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        <motion.div
          className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 w-10 sm:w-14 md:w-16 lg:w-20 h-10 sm:h-14 md:h-16 lg:h-20 bg-white/5 rounded-full backdrop-blur-sm border border-white/10"
          style={{ zIndex: 50 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        ></motion.div>
        <motion.div
          className="absolute top-1/4 left-4 sm:left-6 md:left-8 w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 bg-white/3 rounded-full backdrop-blur-sm"
          style={{ zIndex: 50 }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        <motion.div
          className="absolute bottom-1/4 right-6 sm:right-8 md:right-10 lg:right-12 w-8 sm:w-10 md:w-12 lg:w-16 h-8 sm:h-10 md:h-12 lg:h-16 bg-white/3 rounded-full backdrop-blur-sm"
          style={{ zIndex: 50 }}
          animate={{
            x: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        ></motion.div>
      </motion.div>
    </motion.div>
  );
};
