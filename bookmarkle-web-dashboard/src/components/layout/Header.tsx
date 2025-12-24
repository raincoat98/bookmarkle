import {
  useAuthStore,
  useThemeStore,
  useDrawerStore,
  useSubscriptionStore,
} from "../../stores";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Sun,
  Moon,
  Settings,
  User,
  LogOut,
  Globe,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("auto");
    } else {
      setTheme("light");
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // 로그아웃 완료되면 navigate (user 상태가 null로 변경되고 Header가 언마운트되기 전에)
      navigate("/", { replace: true });
    } catch (error) {
      console.error("로그아웃 실패:", error);
      setIsLoggingOut(false);
    }
  };

  // 관리자 권한 체크
  useEffect(() => {
    if (user) {
      isAdminUser(user).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="relative z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 왼쪽: 로고 및 메뉴 버튼 */}
          <div className="flex items-center space-x-4">
            {showMenuButton && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link to="/about" className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 bg-gradient-to-r from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-soft"
                >
                  <BookOpen className="w-5 h-5 text-white" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-xl font-bold gradient-text"
                >
                  {t("common.appName")}
                </motion.h1>
              </Link>
            </motion.div>
          </div>

          {/* 오른쪽: 알림, 테마, 사용자 메뉴 */}
          <div className="flex items-center space-x-2">
            {/* 알림 센터 */}
            {user && <NotificationCenter />}

            {/* 테마 토글 */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
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
              <AnimatePresence mode="wait">
                {theme === "light" ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5" />
                  </motion.div>
                ) : theme === "dark" ? (
                  <motion.div
                    key="globe"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Globe className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* 사용자 메뉴 */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-brand-500 to-accent-500 rounded-full flex items-center justify-center shadow-soft">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  {isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* 드롭다운 메뉴 */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[100]"
                    >
                      {/* 사용자 정보 */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName || t("settings.user")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* 구독 관리 - 베타 기간 중 숨김 */}
                      {!isBetaPeriod() && (
                        <Link
                          to="/subscription"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            isPremium
                              ? "text-yellow-600 dark:text-yellow-400"
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

                      {/* 관리자 페이지 */}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Shield className="w-4 h-4" />
                          <span>{t("header.adminDashboard")}</span>
                        </Link>
                      )}

                      {/* 설정 */}
                      <Link
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{t("settings.title")}</span>
                      </Link>

                      {/* 로그아웃 */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={isLoggingOut}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>
                          {isLoggingOut
                            ? t("auth.loggingOut")
                            : t("auth.logout")}
                        </span>
                      </button>
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
