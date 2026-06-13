import { useState, useEffect, useCallback, useMemo } from "react";

export type WidgetId = "clock" | "bookmarks" | "quick-actions" | "bible-verse";

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  enabled: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "bible-verse", title: "성경말씀", enabled: true },
  { id: "clock", title: "시계", enabled: true },
  { id: "bookmarks", title: "북마크", enabled: true },
  { id: "quick-actions", title: "빠른 작업", enabled: true },
];

export const useWidgetOrder = (userId: string) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);

  // 로컬 스토리지 키
  const storageKey = useMemo(() => `widget-order-${userId}`, [userId]);

  // 위젯 설정 병합 함수
  const mergeWidgetConfigs = useCallback(
    (savedWidgets: WidgetConfig[]): WidgetConfig[] => {
      const validWidgets = savedWidgets.filter((widget) =>
        DEFAULT_WIDGETS.some((defaultWidget) => defaultWidget.id === widget.id)
      );

      // 새로운 위젯 추가
      const mergedWidgets = [...validWidgets];
      DEFAULT_WIDGETS.forEach((defaultWidget) => {
        const exists = mergedWidgets.find(
          (widget) => widget.id === defaultWidget.id
        );
        if (!exists) {
          mergedWidgets.push(defaultWidget);
        }
      });

      return mergedWidgets;
    },
    []
  );

  // 위젯 설정 로드
  const loadWidgetConfig = useCallback(() => {
    if (!userId) return DEFAULT_WIDGETS;

    try {
      const savedOrder = localStorage.getItem(storageKey);
      if (!savedOrder) return DEFAULT_WIDGETS;

      const parsedOrder: WidgetConfig[] = JSON.parse(savedOrder);
      return mergeWidgetConfigs(parsedOrder);
    } catch (error) {
      console.error("위젯 순서 로드 실패:", error);
      return DEFAULT_WIDGETS;
    }
  }, [userId, storageKey, mergeWidgetConfigs]);

  // 위젯 설정 저장
  const saveWidgetConfig = useCallback(
    (newWidgets: WidgetConfig[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWidgets));
        setWidgets(newWidgets);
      } catch (error) {
        console.error("위젯 순서 저장 실패:", error);
      }
    },
    [storageKey]
  );

  // 위젯 순서 로드
  useEffect(() => {
    const loadedWidgets = loadWidgetConfig();
    setWidgets(loadedWidgets);
  }, [loadWidgetConfig]);

  // 위젯 순서 변경
  const reorderWidgets = useCallback(
    (newWidgets: WidgetConfig[]) => {
      saveWidgetConfig(newWidgets);
    },
    [saveWidgetConfig]
  );

  // 위젯 활성화/비활성화
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      const newWidgets = widgets.map((widget) =>
        widget.id === widgetId
          ? { ...widget, enabled: !widget.enabled }
          : widget
      );
      saveWidgetConfig(newWidgets);
    },
    [widgets, saveWidgetConfig]
  );

  // 위젯 순서 초기화
  const resetWidgetOrder = useCallback(() => {
    saveWidgetConfig(DEFAULT_WIDGETS);
  }, [saveWidgetConfig]);

  // 위젯 이동 유틸리티 함수
  const moveWidget = useCallback(
    (widgetId: WidgetId, direction: "up" | "down") => {
      const currentIndex = widgets.findIndex((w) => w.id === widgetId);
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= widgets.length) return;

      const newWidgets = [...widgets];
      [newWidgets[currentIndex], newWidgets[newIndex]] = [
        newWidgets[newIndex],
        newWidgets[currentIndex],
      ];
      saveWidgetConfig(newWidgets);
    },
    [widgets, saveWidgetConfig]
  );

  // 위젯을 위로 이동
  const moveWidgetUp = useCallback(
    (widgetId: WidgetId) => {
      moveWidget(widgetId, "up");
    },
    [moveWidget]
  );

  // 위젯을 아래로 이동
  const moveWidgetDown = useCallback(
    (widgetId: WidgetId) => {
      moveWidget(widgetId, "down");
    },
    [moveWidget]
  );

  // 활성화된 위젯들만 필터링
  const enabledWidgets = useMemo(
    () => widgets.filter((widget) => widget.enabled || isEditMode),
    [widgets, isEditMode]
  );

  return {
    widgets,
    enabledWidgets,
    isEditMode,
    setIsEditMode,
    reorderWidgets,
    toggleWidget,
    resetWidgetOrder,
    moveWidgetUp,
    moveWidgetDown,
  };
};
