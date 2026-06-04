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
  Menu,
} from "lucide-react";
import { CollectionList } from "../collections/CollectionList";
import type { Collection } from "../../types";
import { useTranslation } from "react-i18next";

interface DrawerProps {
  children: React.ReactNode;
  collections?: Collection[];
  selectedCollection?: string;
  onCollectionChange?: (collectionId: string) => void;
  onDeleteCollectionRequest?: (collectionId: string, collectionName: string) => void;
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
    if (typeof window !== "undefined") return window.innerWidth >= 1024;
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setIsDrawerOpen(desktop);
    }
  }, [setIsDrawerOpen]);

  useEffect(() => {
    if (isDesktop) setIsDrawerOpen(true);
  }, [isDesktop, setIsDrawerOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const desktop = window.innerWidth >= 1024;
        const prev = isDesktop;
        setIsDesktop(desktop);
        if (desktop !== prev) {
          if (desktop) setIsDrawerOpen(true);
          else setIsDrawerOpen(false);
        }
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [isDesktop, setIsDrawerOpen]);

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
    <div className="flex h-screen bg-gray-50 dark:bg-[#0d0d10]">
      {/* 모바일 오버레이 */}
      <AnimatePresence>
        {isDrawerOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/30 lg:hidden"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 사이드바 */}
      {(isDesktop || isDrawerOpen) && (
        <motion.div
          initial={false}
          animate={{
            width: isDesktop ? (isDrawerCollapsed ? 64 : 240) : isDrawerOpen ? 240 : 0,
            x: isDesktop ? 0 : isDrawerOpen ? 0 : -240,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
          className="fixed inset-y-0 left-0 z-[9999]"
        >
          <div className="flex h-full flex-col bg-white dark:bg-[#111113] border-r border-gray-200/70 dark:border-white/[0.06]">
            {/* 헤더 */}
            <div
              className={`flex items-center justify-between border-b border-gray-100 dark:border-white/[0.06] h-[64px] ${
                isDrawerCollapsed ? "px-3" : "px-4"
              }`}
            >
              <Link
                to="/about"
                className={`flex items-center ${isDrawerCollapsed ? "justify-center" : "gap-2.5"}`}
              >
                <div
                  className={`bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDrawerCollapsed ? "w-7 h-7" : "w-8 h-8"
                  }`}
                >
                  <BookOpen className={`text-white ${isDrawerCollapsed ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                </div>
                {!isDrawerCollapsed && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
                    북마클
                  </span>
                )}
              </Link>

              <div className="flex items-center">
                {isDesktop ? (
                  <button
                    onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {isDrawerCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 네비게이션 */}
            <nav className={`pt-2 ${isDrawerCollapsed ? "px-2" : "px-2"}`}>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => {
                      if (!isDesktop && item.href !== "/bookmarks") {
                        setIsDrawerOpen(false);
                      }
                    }}
                    title={isDrawerCollapsed ? item.name : undefined}
                    className={`flex items-center ${
                      isDrawerCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                    } rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      item.current
                        ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-4.5 h-4.5 flex-shrink-0 ${
                        item.current
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                      style={{ width: "18px", height: "18px" }}
                    />
                    {!isDrawerCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* CollectionList */}
            {location.pathname === "/bookmarks" && (
              <div className="flex-1 overflow-hidden min-h-0">
                <CollectionList
                  collections={collections}
                  loading={false}
                  selectedCollection={selectedCollection}
                  onCollectionChange={(collectionId) => {
                    onCollectionChange(collectionId);
                    if (!isDesktop) setIsDrawerOpen(false);
                  }}
                  onDeleteCollectionRequest={onDeleteCollectionRequest}
                  onEditCollection={onEditCollection}
                  onOpenAddCollectionModal={onOpenAddCollectionModal}
                  onOpenAddSubCollectionModal={onOpenAddSubCollectionModal}
                  {...({ collapsed: isDrawerCollapsed } as { collapsed: boolean })}
                />
              </div>
            )}

            {/* 푸터 */}
            {!isDrawerCollapsed && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06]">
                <p className="text-[11px] text-gray-400 dark:text-gray-600">
                  © 2025 북마클
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="lg:hidden h-14 px-4 border-b border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-[#111113] flex items-center">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <main
          className="flex-1 overflow-auto"
          style={{
            paddingLeft: isDesktop ? (isDrawerCollapsed ? "64px" : "240px") : "0",
            transition: "padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
