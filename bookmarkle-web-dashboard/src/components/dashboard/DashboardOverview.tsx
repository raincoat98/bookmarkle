import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Bell,
  BookOpen,
  Check,
  Edit,
  RotateCcw,
  Settings,
  Trash2,
  X,
  ArrowLeftRight,
  ArrowUpDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, onSnapshot } from "firebase/firestore";

import { SortableWidget } from "./SortableWidget";
import { QuickActions } from "./widgets/QuickActions";
import { BookmarksWidget } from "./widgets/BookmarksWidget";
import { ClockWidget } from "./widgets/ClockWidget";
import { BibleVerseWidget } from "./widgets/BibleVerseWidget";
import { useWidgetOrder, type WidgetConfig } from "../../hooks/widget/useWidgetOrder";
import type { Bookmark, Collection } from "../../types";
import { useAuthStore } from "../../stores";
import { useNotifications } from "../../hooks/notification/useNotifications";
import {
  db,
  getUserNotificationSettings,
  setUserNotificationSettings,
} from "../../firebase";

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
        const err = error as { code?: string; message?: string };
        // 권한 오류 시 리스너 자동 정리
        if (
          err?.code === "permission-denied" ||
          err?.code === "unauthenticated"
        ) {
          // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
          try {
            unsubscribe();
          } catch {
            // 리스너 정리 중 발생하는 에러는 무시
          }
          return;
        }

        if (import.meta.env.DEV) {
          console.error("알림 설정 실시간 동기화 실패:", error);
        }
        if (user?.uid) {
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
              if (import.meta.env.DEV) {
                console.error("알림 설정 로드 실패:", err);
              }
            });
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

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

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) {
      setIsNotificationOpen(false);
    }
  }, [notificationsEnabled]);

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

  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [bookmarkPanelSwapped, setBookmarkPanelSwapped] = useState(() => {
    try { return localStorage.getItem("bookmarksWidget_swapped") === "true"; } catch { return false; }
  });
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

      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      reorderWidgets(newWidgets);
    },
    [widgets, reorderWidgets]
  );

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

  const handleNotificationToggle = async () => {
    if (!user?.uid) return;

    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem("notifications", JSON.stringify(newValue));
    localStorage.setItem("bookmarkNotifications", JSON.stringify(newValue));

    try {
      await setUserNotificationSettings(user.uid, {
        notifications: newValue,
        bookmarkNotifications: newValue,
      });
    } catch (error) {
      console.error("알림 설정 저장 실패:", error);
      const previousValue = !newValue;
      setNotificationsEnabled(previousValue);
      localStorage.setItem("notifications", JSON.stringify(previousValue));
      localStorage.setItem(
        "bookmarkNotifications",
        JSON.stringify(previousValue)
      );
      return;
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
        newValue ? t("notifications.enable") : t("notifications.disable")
      }`
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("dashboard.title")}
        </h2>
        <div className="flex items-center flex-wrap gap-2 justify-end sm:justify-start">
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
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                aria-label={t("notifications.title")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && !isMobile && (
                <div
                  ref={notificationDropdownRef}
                  className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111113] rounded-xl shadow-xl border border-gray-200 dark:border-white/[0.06] z-50 max-h-[600px] flex flex-col"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
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
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

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
                          className={`border-b border-gray-100 dark:border-white/[0.06] p-4 hover:bg-gray-50 dark:hover:bg-white/[0.08]/50 transition-colors ${
                            !notification.isRead
                              ? "bg-blue-50/50 dark:bg-blue-900/10"
                              : ""
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-2 rounded-lg ${
                                notification.type === "bookmark_added"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  : notification.type === "bookmark_updated"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : notification.type === "bookmark_deleted"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                  : "bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400"
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
                                  }
                                  if (diffMinutes < 60) {
                                    return t("notifications.minutesAgo", {
                                      count: diffMinutes,
                                    });
                                  }
                                  if (diffHours < 24) {
                                    return t("notifications.hoursAgo", {
                                      count: diffHours,
                                    });
                                  }
                                  return t("notifications.daysAgo", {
                                    count: diffDays,
                                  });
                                })()}
                              </p>
                            </div>

                            <div className="flex flex-col space-y-1">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                  title={t("notifications.markAsRead")}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteNotification(notification.id)
                                }
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-white/[0.08]"
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

                  <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
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
                        onClick={handleNotificationToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                          notificationsEnabled
                            ? "bg-violet-600"
                            : "bg-gray-200 dark:bg-white/[0.08]"
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
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap ${
              isEditMode
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            <Settings className="w-4 h-4" />
            {isEditMode ? t("dashboard.editComplete") : t("dashboard.editWidget")}
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
            {enabledWidgets.map((widget, index) => {
              const canMoveUp = index > 0;
              const canMoveDown = index < enabledWidgets.length - 1;

              return (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  enabled={widget.enabled}
                  isEditMode={isEditMode}
                  isMobile={isMobile}
                  onToggle={() => toggleWidget(widget.id)}
                  onMoveUp={() => moveWidgetUp(widget.id)}
                  onMoveDown={() => moveWidgetDown(widget.id)}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  animationDelay={index * 0.05}
                  editControls={widget.id === "bookmarks" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !bookmarkPanelSwapped;
                        setBookmarkPanelSwapped(next);
                        try {
                          localStorage.setItem("bookmarksWidget_swapped", String(next));
                        } catch {
                          return;
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-white/[0.08] shadow-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <ArrowLeftRight className="hidden lg:block w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                      <ArrowUpDown className="lg:hidden w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                      <span className="hidden lg:inline text-xs text-violet-600 dark:text-violet-400 font-medium">좌우 전환</span>
                      <span className="lg:hidden text-xs text-violet-600 dark:text-violet-400 font-medium">위아래 전환</span>
                    </button>
                  ) : undefined}
                >
                  {renderWidget(widget)}
                </SortableWidget>
              );
            })}
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
                  {activeWidget.id === "bookmarks" ? "북마크"
                    : activeWidget.id === "clock" ? "시계 / 날씨"
                    : activeWidget.id === "bible-verse" ? "오늘의 성경말씀"
                    : activeWidget.id === "quick-actions" ? "빠른 실행"
                    : activeWidget.id}
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
