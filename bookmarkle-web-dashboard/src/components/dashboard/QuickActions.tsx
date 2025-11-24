import React from "react";
import { motion } from "framer-motion";
import { Plus, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QuickActionsProps {
  onAddBookmark: () => void;
  onAddCollection: () => void;
  loading?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddBookmark,
  onAddCollection,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="card-glass p-6 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="card-glass p-6"
    >
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-lg font-semibold text-gray-900 dark:text-white mb-6"
      >
        {t("dashboard.quickActions")}
      </motion.h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddBookmark}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
        >
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-soft"
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addBookmark")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addBookmarkDescription")}
            </p>
          </div>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddCollection}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
        >
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-soft"
          >
            <FolderPlus className="w-6 h-6 text-white" />
          </motion.div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addCollection")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addCollectionDescription")}
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};
