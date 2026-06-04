import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, EyeOff, Eye, Move } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WidgetId } from "../../hooks/useWidgetOrder";

interface SortableWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditMode: boolean;
  enabled: boolean;
  isMobile: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  animationDelay?: number;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({
  id,
  children,
  isEditMode,
  enabled,
  isMobile,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  animationDelay = 0,
}) => {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditMode || isMobile,
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
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: enabled ? 1 : 0.5, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      className={`relative group ${isDragging ? "opacity-50 z-50" : ""} ${
        isEditMode && !isMobile ? "cursor-move" : ""
      } ${!enabled && isEditMode ? "opacity-50" : ""}`}
      {...(isMobile ? {} : { ...attributes, ...listeners })}
    >
      {isEditMode && (
        <div className="absolute top-2 right-2 z-10 flex flex-col space-y-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={enabled ? t("dashboard.hideWidget") : t("dashboard.showWidget")}
          >
            {enabled ? (
              <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {isMobile && (
            <div className="flex flex-col space-y-1">
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
          )}

          {!isMobile && (
            <div className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Move className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>
      )}
      <div
        className={
          isEditMode
            ? "border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-2"
            : ""
        }
      >
        {children}
      </div>
    </motion.div>
  );
};
