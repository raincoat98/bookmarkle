import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, EyeOff, Eye, GripHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WidgetId } from "../../hooks/widget/useWidgetOrder";

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
  editControls?: React.ReactNode;
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
  editControls,
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

  if (!enabled && !isEditMode) return null;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: enabled ? 1 : 0.5, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      className={`relative ${isDragging ? "opacity-40 z-50" : ""} ${!enabled && isEditMode ? "opacity-50" : ""}`}
    >
      {isEditMode && (
        <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl overflow-hidden">
          {/* 드래그 핸들 바 */}
          <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-900/20 px-3 py-1.5 select-none">
            {/* 데스크톱: 그립 핸들 (넓은 영역) */}
            {!isMobile ? (
              <div
                {...attributes}
                {...listeners}
                className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing touch-none py-1"
                title="드래그하여 순서 변경"
              >
                <GripHorizontal className="w-4 h-4 text-blue-400 dark:text-blue-500 flex-shrink-0" />
                <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                  드래그하여 순서 변경
                </span>
              </div>
            ) : (
              /* 모바일: 위아래 버튼 */
              <div className="flex items-center gap-1">
                {canMoveUp && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                    className="p-1.5 rounded-lg bg-white dark:bg-white/[0.08] shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t("common.moveUp")}
                  >
                    <ChevronUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  </button>
                )}
                {canMoveDown && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                    className="p-1.5 rounded-lg bg-white dark:bg-white/[0.08] shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t("common.moveDown")}
                  >
                    <ChevronDown className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  </button>
                )}
              </div>
            )}

            {/* 위젯별 커스텀 컨트롤 */}
            {editControls && (
              <div className="flex-shrink-0 mr-2">{editControls}</div>
            )}

            {/* 표시/숨기기 버튼 */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-white/[0.08] shadow-sm hover:bg-gray-50 dark:hover:bg-white/[0.12] transition-colors flex-shrink-0"
              title={enabled ? t("dashboard.hideWidget") : t("dashboard.showWidget")}
            >
              {enabled ? (
                <EyeOff className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {enabled ? "숨기기" : "보이기"}
              </span>
            </button>
          </div>

          {/* 위젯 콘텐츠 */}
          <div>{children}</div>
        </div>
      )}

      {!isEditMode && <div>{children}</div>}
    </motion.div>
  );
};
