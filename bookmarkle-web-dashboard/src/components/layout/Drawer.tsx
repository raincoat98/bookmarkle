import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useDrawerStore } from "../../stores";
import {
  Home,
  BookOpen,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CollectionList } from "../collections/CollectionList";
import type { Collection } from "../../types";
import { useTranslation } from "react-i18next";

interface DrawerProps {
  children: React.ReactNode;
  // CollectionList 관련 props 추가
  collections?: Collection[];
  selectedCollection?: string;
  onCollectionChange?: (collectionId: string) => void;
  onDeleteCollectionRequest?: (
    collectionId: string,
    collectionName: string
  ) => void;
  onEditCollection?: (collection: Collection) => void;
  onOpenAddCollectionModal?: () => void;
  onOpenAddSubCollectionModal?: (parentId: string) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  children,
  collections = [],
  selectedCollection = "all",
  onCollectionChange = () => {},
  onDeleteCollectionRequest = () => {},
  onEditCollection = () => {},
  onOpenAddCollectionModal = () => {},
  onOpenAddSubCollectionModal = () => {},
}) => {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    isDrawerCollapsed,
    setIsDrawerCollapsed,
  } = useDrawerStore(
    useShallow((state) => ({
      isDrawerOpen: state.isDrawerOpen,
      setIsDrawerOpen: state.setIsDrawerOpen,
      isDrawerCollapsed: state.isDrawerCollapsed,
      setIsDrawerCollapsed: state.setIsDrawerCollapsed,
    }))
  );
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  // 초기 마운트 시 데스크톱 체크 및 Drawer 상태 동기화
  useEffect(() => {
    if (typeof window !== "undefined") {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);

      // 데스크톱이면 Drawer 열기 (즉시 실행)
      if (desktop) {
        setIsDrawerOpen(true);
      } else {
        // 모바일이면 Drawer 닫기
        setIsDrawerOpen(false);
      }
    }
  }, [setIsDrawerOpen]);

  // 데스크톱에서는 Drawer를 항상 열어둠
  useEffect(() => {
    if (isDesktop) {
      setIsDrawerOpen(true);
    }
  }, [isDesktop, setIsDrawerOpen]);

  // 리사이즈 이벤트 처리 (디바운스)
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    // 초기 체크는 즉시 실행
    const desktop = window.innerWidth >= 1024;
    setIsDesktop(desktop);
    if (desktop) {
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const desktop = window.innerWidth >= 1024;

        setIsDesktop((prevDesktop) => {
          // 상태가 변경된 경우에만 Drawer 상태 업데이트
          if (desktop !== prevDesktop) {
            // 데스크톱으로 전환되면 Drawer를 항상 열어둠
            if (desktop && !prevDesktop) {
              setIsDrawerOpen(true);
            }
            // 모바일로 전환되면 Drawer를 닫음
            if (!desktop && prevDesktop) {
              setIsDrawerOpen(false);
            }
          }
          return desktop;
        });
      }, 100); // 디바운스
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [setIsDrawerOpen]);

  const navigation = [
    {
      name: t("dashboard.title"),
      href: "/dashboard",
      icon: Home,
      current: location.pathname === "/dashboard" || location.pathname === "/",
    },
    {
      name: t("bookmarks.title"),
      href: "/bookmarks",
      icon: BookOpen,
      current: location.pathname === "/bookmarks",
    },
    {
      name: t("settings.title"),
      href: "/settings",
      icon: Settings,
      current: location.pathname === "/settings",
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 모바일 오버레이 */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/20 dark:bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 사이드바 - 데스크톱에서는 항상 표시 */}
      {(isDesktop || isDrawerOpen) && (
        <motion.div
          initial={false}
          animate={{
            width: isDesktop
              ? isDrawerCollapsed
                ? 64
                : 288
              : isDrawerOpen
              ? 288
              : 0,
            x: isDesktop ? 0 : isDrawerOpen ? 0 : -288,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className={`fixed inset-y-0 left-0 z-[9999] ${
            isDesktop ? "relative" : ""
          }`}
          style={
            isDesktop
              ? {
                  position: "static",
                  display: "block",
                }
              : {}
          }
        >
          <div className="flex h-full flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-white/30 dark:border-gray-700/30 shadow-glass">
            {/* 헤더 */}
            <div
              className={`flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 h-[80px] ${
                isDrawerCollapsed ? "px-2 lg:px-3" : "px-4 lg:px-6"
              }`}
            >
              <div
                className={`flex items-center ${
                  isDrawerCollapsed
                    ? "justify-center"
                    : "space-x-2 lg:space-x-3"
                }`}
              >
                <div
                  className={`bg-gradient-to-r from-brand-500 to-accent-500 rounded-xl flex items-center justify-center shadow-soft flex-shrink-0 ${
                    isDrawerCollapsed ? "w-7 h-7" : "w-9 h-9 lg:w-10 lg:h-10"
                  }`}
                >
                  <BookOpen
                    className={`text-white ${
                      isDrawerCollapsed
                        ? "w-3.5 h-3.5"
                        : "w-5 h-5 lg:w-6 lg:h-6"
                    }`}
                  />
                </div>
                {!isDrawerCollapsed && (
                  <h1 className="text-base lg:text-lg font-bold gradient-text leading-none">
                    북마클
                  </h1>
                )}
              </div>
              <div
                className={`flex items-center ${
                  isDrawerCollapsed ? "justify-center" : "space-x-2"
                }`}
              >
                {/* 데스크톱 토글 버튼 */}
                {isDesktop && (
                  <button
                    onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                    className="hidden lg:flex p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                  >
                    {isDrawerCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronLeft className="w-5 h-5" />
                    )}
                  </button>
                )}
                {/* 모바일 닫기 버튼 */}
                {!isDesktop && (
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                  >
                    <X className="w-5 h-5 lg:w-6 lg:h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* 네비게이션 */}
            <nav
              className={`space-y-1 ${
                isDrawerCollapsed ? "p-2" : "p-2 lg:p-3"
              }`}
            >
              {navigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Link
                      to={item.href}
                      onClick={() => {
                        // 데스크톱에서는 Drawer를 닫지 않음
                        if (!isDesktop && item.href !== "/bookmarks") {
                          setIsDrawerOpen(false);
                        }
                      }}
                      className={`group flex items-center ${
                        isDrawerCollapsed
                          ? "justify-center px-3 py-3"
                          : "space-x-2 lg:space-x-3 px-3 py-3"
                      } rounded-xl lg:rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        item.current
                          ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-soft"
                          : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                      }`}
                      title={isDrawerCollapsed ? item.name : undefined}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            item.current
                              ? "text-white"
                              : "text-gray-400 group-hover:text-brand-500 dark:group-hover:text-brand-400"
                          }`}
                        />
                      </motion.div>
                      {!isDrawerCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm lg:text-base"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* CollectionList - 북마크 페이지에서만 표시 */}
            {location.pathname === "/bookmarks" && (
              <div className="flex-1 overflow-hidden min-h-0">
                <CollectionList
                  collections={collections}
                  loading={false}
                  selectedCollection={selectedCollection}
                  onCollectionChange={(collectionId) => {
                    onCollectionChange(collectionId);
                    // 데스크톱에서는 Drawer를 닫지 않음
                    if (!isDesktop) {
                      setIsDrawerOpen(false);
                    }
                  }}
                  onDeleteCollectionRequest={onDeleteCollectionRequest}
                  onEditCollection={onEditCollection}
                  onOpenAddCollectionModal={onOpenAddCollectionModal}
                  onOpenAddSubCollectionModal={onOpenAddSubCollectionModal}
                  {...({ collapsed: isDrawerCollapsed } as {
                    collapsed: boolean;
                  })}
                />
              </div>
            )}

            {/* 푸터 */}
            {(!isDrawerCollapsed || !isDesktop) && (
              <div className="p-2 lg:p-3 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  © 2024 북마클
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="lg:hidden p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl flex items-center justify-between">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-all duration-200 hover:scale-110 hover:bg-white/50 dark:hover:bg-gray-700/50 backdrop-blur-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
