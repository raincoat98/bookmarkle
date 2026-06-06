import {
  useAuthStore,
  useThemeStore,
  useDrawerStore,
  useSubscriptionStore,
  useFeatureFlagsStore,
} from "../../stores";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  Monitor,
  Settings,
  User,
  LogOut,
  Shield,
  Crown,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { isAdminUser } from "../../firebase";
import { useState, useEffect, useRef } from "react";
import { NotificationCenter } from "../common/NotificationCenter";
import { isBetaPeriod } from "../../utils/betaFlags";

interface HeaderProps {
  showMenuButton?: boolean;
}

export const Header = ({ showMenuButton = false }: HeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { setIsDrawerOpen } = useDrawerStore();
  const { isPremium } = useSubscriptionStore();
  useFeatureFlagsStore((s) => s.flags);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("auto");
    else setTheme("light");
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/", { replace: true });
    } catch {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (user) isAdminUser(user).then(setIsAdmin);
    else setIsAdmin(false);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-40 h-14 lg:h-[80px] bg-white/80 dark:bg-[#111113]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/[0.06] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center">
          {/* 왼쪽: 로고 */}
          <div className="flex items-center gap-2">
            {showMenuButton && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors lg:hidden touch-manipulation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Link to="/about" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
                {t("common.appName")}
              </span>
            </Link>
          </div>

          {/* 오른쪽: 알림, 테마, 사용자 */}
          <div className="flex items-center gap-1">
            {user && <NotificationCenter />}

            {/* 테마 토글 */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              aria-label={t("header.themeToggle")}
              title={t("header.currentTheme", {
                theme:
                  theme === "light"
                    ? t("settings.themeLight")
                    : theme === "dark"
                    ? t("settings.themeDark")
                    : t("settings.themeSystem"),
              })}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>

            {/* 사용자 메뉴 */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  {isPremium && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111113] rounded-xl shadow-lg border border-gray-100 dark:border-white/[0.06] py-1 z-[100] overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.displayName || t("settings.user")}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      <div className="py-1">
                        {!isBetaPeriod() && (
                          <Link
                            to="/subscription"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors ${
                              isPremium
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <Crown className="w-4 h-4" />
                            <span>
                              {isPremium
                                ? t("header.premiumSubscription")
                                : t("premium.subscriptionManagement")}
                            </span>
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            <span>{t("header.adminDashboard")}</span>
                          </Link>
                        )}

                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>{t("settings.title")}</span>
                        </Link>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] disabled:opacity-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>
                            {isLoggingOut ? t("auth.loggingOut") : t("auth.logout")}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
