import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores";
import { useNotifications } from "../hooks/notification/useNotifications";
import { Drawer } from "../components/layout/Drawer";
import {
  getUserNotificationSettings,
  setUserNotificationSettings,
  db,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Bell,
  Check,
  Trash2,
  Edit,
  ArrowLeft,
  CheckCheck,
  Bookmark,
  Monitor,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationPermission,
  requestNotificationPermission,
} from "../utils/browserNotifications";
import type { Notification } from "../types";

type FilterTab = "all" | "unread";

function groupByDate(notifications: Notification[], t: (k: string) => string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    const d = n.createdAt;
    if (d >= startOfToday) today.push(n);
    else if (d >= startOfWeek) thisWeek.push(n);
    else older.push(n);
  }

  const groups: { label: string; items: Notification[] }[] = [];
  if (today.length > 0)    groups.push({ label: t("notifications.today"),    items: today });
  if (thisWeek.length > 0) groups.push({ label: t("notifications.thisWeek"), items: thisWeek });
  if (older.length > 0)    groups.push({ label: t("notifications.older"),    items: older });
  return groups;
}

const TYPE_STYLE: Record<string, { bg: string; icon: React.ReactNode }> = {
  bookmark_added:   { bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", icon: <Bookmark className="w-3.5 h-3.5" /> },
  bookmark_updated: { bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",             icon: <Edit     className="w-3.5 h-3.5" /> },
  bookmark_deleted: { bg: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",                 icon: <Trash2   className="w-3.5 h-3.5" /> },
  default:          { bg: "bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400",            icon: <Bell     className="w-3.5 h-3.5" /> },
};

interface ToggleProps {
  enabled: boolean | null;
  disabled?: boolean;
  onChange: () => void;
}
const Toggle: React.FC<ToggleProps> = ({ enabled, disabled, onChange }) => (
  <button
    onClick={onChange}
    disabled={disabled || enabled === null}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-75 ${
      enabled ? "bg-violet-600" : "bg-gray-200 dark:bg-white/[0.08]"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

export const NotificationCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
  } = useNotifications(user?.uid || "");

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const getInitialNotificationsSetting = () => {
    const saved = localStorage.getItem("notifications");
    if (saved !== null) return JSON.parse(saved);
    const legacy = localStorage.getItem("bookmarkNotifications");
    if (legacy !== null) return JSON.parse(legacy);
    return true;
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(
    getInitialNotificationsSetting
  );
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState<boolean | null>(() => {
    const saved = localStorage.getItem("systemNotifications");
    return saved !== null ? JSON.parse(saved) : getInitialNotificationsSetting();
  });
  const [browserPermission, setBrowserPermission] = useState(
    () => getNotificationPermission()
  );

  // Firestore 설정 실시간 동기화
  useEffect(() => {
    if (!user?.uid) return;
    const settingsRef = doc(db, "users", user.uid, "settings", "main");
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const noti = data.notifications ?? data.bookmarkNotifications ?? true;
        const sys  = data.systemNotifications ?? noti;
        setNotificationsEnabled(noti);
        setSystemNotificationsEnabled(noti ? sys : false);
        localStorage.setItem("notifications", JSON.stringify(noti));
        localStorage.setItem("bookmarkNotifications", JSON.stringify(noti));
        localStorage.setItem("systemNotifications", JSON.stringify(noti ? sys : false));
      }
      setBrowserPermission(getNotificationPermission());
    }, (err) => {
      const e = err as { code?: string };
      if (e?.code === "permission-denied" || e?.code === "unauthenticated") return;
      if (user?.uid) {
        getUserNotificationSettings(user.uid).then((s) => {
          const noti = s.notifications ?? s.bookmarkNotifications;
          if (noti !== undefined) {
            setNotificationsEnabled(noti);
            localStorage.setItem("notifications", JSON.stringify(noti));
          }
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (browserPermission.denied && systemNotificationsEnabled) {
      setSystemNotificationsEnabled(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));
      if (user?.uid) setUserNotificationSettings(user.uid, { systemNotifications: false });
      toast.error(t("notifications.permissionDenied"));
    }
  }, [browserPermission.denied, systemNotificationsEnabled, user?.uid, t]);

  useEffect(() => {
    const onFocus = () => setBrowserPermission(getNotificationPermission());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleNotificationToggle = async () => {
    if (notificationsEnabled === null) return;
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("notifications", JSON.stringify(next));
    localStorage.setItem("bookmarkNotifications", JSON.stringify(next));
    if (!next) {
      setSystemNotificationsEnabled(false);
      localStorage.setItem("systemNotifications", JSON.stringify(false));
    }
    if (user?.uid) {
      await setUserNotificationSettings(user.uid, {
        notifications: next,
        bookmarkNotifications: next,
        systemNotifications: next ? (systemNotificationsEnabled ?? false) : false,
      }).catch(() => {
        setNotificationsEnabled(!next);
        localStorage.setItem("notifications", JSON.stringify(!next));
      });
    }
    window.dispatchEvent(new CustomEvent("notificationsChanged", { detail: { enabled: next } }));
    window.dispatchEvent(new CustomEvent("bookmarkNotificationsChanged", { detail: { enabled: next } }));
    toast.success(`${t("notifications.bookmarkNotifications")} ${next ? t("notifications.enable") : t("notifications.disable")}`);
  };

  const handleSystemNotificationToggle = async () => {
    if (systemNotificationsEnabled === null || !notificationsEnabled) {
      if (!notificationsEnabled) toast.error(t("notifications.enableBookmarkFirst"));
      return;
    }
    if (!systemNotificationsEnabled) {
      const ok = await requestNotificationPermission();
      const perm = getNotificationPermission();
      setBrowserPermission(perm);
      if (!ok || !perm.granted) {
        toast.error(t("notifications.permissionDenied"));
        return;
      }
    }
    const next = !systemNotificationsEnabled;
    setSystemNotificationsEnabled(next);
    localStorage.setItem("systemNotifications", JSON.stringify(next));
    if (user?.uid) {
      await setUserNotificationSettings(user.uid, { systemNotifications: next }).catch(() => {
        setSystemNotificationsEnabled(!next);
        localStorage.setItem("systemNotifications", JSON.stringify(!next));
      });
    }
    window.dispatchEvent(new CustomEvent("systemNotificationsChanged", { detail: { enabled: next } }));
    toast.success(`${t("notifications.systemNotifications")} ${next ? t("notifications.enable") : t("notifications.disable")}`);
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) await markAsRead(n.id);
    if (n.bookmarkId) navigate(`/bookmarks?highlight=${n.bookmarkId}`);
  };

  const formatDate = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (mins < 1)   return t("notifications.justNow");
    if (mins < 60)  return t("notifications.minutesAgo", { count: mins });
    if (hours < 24) return t("notifications.hoursAgo",   { count: hours });
    if (days < 7)   return t("notifications.daysAgo",    { count: days });
    return date.toLocaleDateString();
  };

  const filtered = useMemo(() =>
    activeTab === "unread" ? notifications.filter(n => !n.isRead) : notifications,
    [notifications, activeTab]
  );

  const groups = useMemo(() => groupByDate(filtered, t), [filtered, t]);

  return (
    <Drawer>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10]">

        {/* 헤더 */}
        <div className="bg-white/80 dark:bg-[#111113]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/[0.06] sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t("notifications.center")}
                  </h1>
                  {unreadCount > 0 && (
                    <span className="bg-violet-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-tight">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">

          {/* 알림 설정 카드 */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {t("notifications.settings")}
              </p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04] px-2 pb-2">

              {/* 북마크 알림 */}
              <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t("notifications.bookmarkNotifications")}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t("notifications.bookmarkNotificationsDescription")}
                    </p>
                  </div>
                </div>
                <Toggle enabled={notificationsEnabled} onChange={handleNotificationToggle} />
              </div>

              {/* 시스템 알림 */}
              <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t("notifications.systemNotifications")}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t("notifications.systemNotificationsDescription")}
                    </p>
                    {browserPermission.denied && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {t("notifications.permissionDenied")}
                      </p>
                    )}
                  </div>
                </div>
                <Toggle
                  enabled={systemNotificationsEnabled}
                  disabled={!notificationsEnabled || browserPermission.denied}
                  onChange={handleSystemNotificationToggle}
                />
              </div>

            </div>
          </div>

          {/* 알림 목록 카드 */}
          <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">

            {/* 탭 + 액션 헤더 */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/[0.04] rounded-xl">
                {(["all", "unread"] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      activeTab === tab
                        ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab === "all"
                      ? `${t("notifications.all")}${notifications.length > 0 ? ` · ${notifications.length}` : ""}`
                      : `${t("notifications.unread")}${unreadCount > 0 ? ` · ${unreadCount}` : ""}`
                    }
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 sm:gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                    title={t("notifications.markAllAsRead")}
                  >
                    <CheckCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">{t("notifications.markAllAsRead")}</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAllNotifications}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 sm:gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title={t("notifications.deleteAll")}
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">{t("notifications.deleteAll")}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-50 dark:border-white/[0.04]">
              {/* 빈 상태 */}
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {activeTab === "unread"
                      ? t("notifications.noUnreadNotifications") || "읽지 않은 알림이 없습니다"
                      : t("notifications.noNotifications")}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {activeTab === "unread"
                      ? t("notifications.allCaughtUp") || "모든 알림을 확인했습니다"
                      : t("notifications.noNotificationsDescription")}
                  </p>
                </div>
              ) : (
                <div>
                  {groups.map(({ label, items }) => (
                    <div key={label}>
                      <div className="px-5 py-2">
                        <p className="text-[10px] font-semibold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                          {label}
                        </p>
                      </div>
                      <div className="px-2 space-y-0.5 pb-1">
                        {items.map(n => {
                          const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.default;
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                                !n.isRead
                                  ? "bg-violet-50/60 dark:bg-violet-500/[0.06] hover:bg-violet-50 dark:hover:bg-violet-500/[0.09]"
                                  : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                              }`}
                            >
                              {/* 읽지 않음 dot */}
                              <div className="mt-2.5 w-1.5 flex-shrink-0">
                                {!n.isRead && (
                                  <span className="block w-1.5 h-1.5 rounded-full bg-violet-500" />
                                )}
                              </div>

                              {/* 타입 아이콘 */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                                {style.icon}
                              </div>

                              {/* 내용 */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-snug ${
                                  !n.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                                }`}>
                                  {n.title}
                                </p>
                                {n.message && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                                    {n.message}
                                  </p>
                                )}
                                <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">
                                  {formatDate(n.createdAt)}
                                </p>
                              </div>

                              {/* 액션 버튼 (hover 시 표시) */}
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => e.stopPropagation()}
                              >
                                {!n.isRead && (
                                  <button
                                    onClick={() => markAsRead(n.id)}
                                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-violet-500 dark:hover:text-violet-400 rounded-lg hover:bg-white dark:hover:bg-white/[0.08] transition-colors"
                                    title={t("notifications.markAsRead")}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(n.id)}
                                  className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-white/[0.08] transition-colors"
                                  title={t("notifications.deleteNotification")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {notifications.some(n => n.isRead) && (
                    <div className="px-5 py-3 border-t border-gray-50 dark:border-white/[0.04]">
                      <button
                        onClick={deleteReadNotifications}
                        className="w-full text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 text-center py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        {t("notifications.deleteAllRead")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
