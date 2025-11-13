import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, Eye, EyeOff, Move } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WidgetId } from "../../hooks/useWidgetOrder";

interface SortableWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditMode: boolean;
  enabled: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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
    <div
      ref={setNodeRef}
      style={style}
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
