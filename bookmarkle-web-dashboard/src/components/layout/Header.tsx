import {
  useAuthStore,
  useThemeStore,
  useDrawerStore,
  useSubscriptionStore,
} from "../../stores";
import { Link } from "react-router-dom";
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
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { setIsDrawerOpen } = useDrawerStore();
  const { isPremium } = useSubscriptionStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
      await logout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
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

            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-soft">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text">북마클</h1>
            </Link>
          </div>

          {/* 오른쪽: 알림, 테마, 사용자 메뉴 */}
          <div className="flex items-center space-x-2">
            {/* 알림 센터 */}
            {user && <NotificationCenter />}

            {/* 테마 토글 */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
              aria-label="테마 변경"
              title={`현재: ${
                theme === "light"
                  ? "라이트"
                  : theme === "dark"
                  ? "다크"
                  : "자동"
              } 모드`}
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : theme === "dark" ? (
                <Globe className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

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
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[100]">
                    {/* 사용자 정보 */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.displayName || "사용자"}
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
                        <span>{isPremium ? "프리미엄 구독" : "구독 관리"}</span>
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
                        <span>관리자 대시보드</span>
                      </Link>
                    )}

                    {/* 설정 */}
                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                      <span>설정</span>
                    </Link>

                    {/* 로그아웃 */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
