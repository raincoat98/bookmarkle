import { useState } from "react";
import * as LucideIcons from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useTranslation } from "react-i18next";

// 자주 사용되는 아이콘들만 선별
const POPULAR_ICONS = [
  "Folder",
  "FolderOpen",
  "BookOpen",
  "Book",
  "Bookmark",
  "Heart",
  "Star",
  "Home",
  "Work",
  "User",
  "Users",
  "Settings",
  "Globe",
  "Code",
  "Database",
  "Download",
  "Upload",
  "Camera",
  "Music",
  "Video",
  "Image",
  "FileText",
  "Mail",
  "Phone",
  "Calendar",
  "Clock",
  "Map",
  "MapPin",
  "Car",
  "Plane",
  "Coffee",
  "Gamepad2",
  "ShoppingCart",
  "CreditCard",
  "Briefcase",
  "GraduationCap",
  "Stethoscope",
  "Utensils",
  "Dumbbell",
  "Bike",
  "Mountain",
  "Sun",
  "Moon",
  "Cloud",
  "Zap",
  "Flame",
  "Droplets",
  "Leaf",
  "Flower",
  "Tree",
  "Bug",
  "Fish",
  "Bird",
  "Dog",
  "Cat",
  "Rabbit",
  "Package",
  "Gift",
  "Truck",
  "Bus",
  "Train",
  "Rocket",
  "Smartphone",
  "Laptop",
  "Monitor",
  "Headphones",
  "Mic",
  "Keyboard",
  "Mouse",
  "Printer",
  "HardDrive",
  "Cpu",
  "MemoryStick",
];

// 카테고리별 아이콘 그룹
const ICON_CATEGORIES: Record<string, string[]> = {
  general: [
    "Folder",
    "FolderOpen",
    "BookOpen",
    "Book",
    "Bookmark",
    "Heart",
    "Star",
  ],
  work: [
    "Briefcase",
    "Work",
    "Code",
    "Database",
    "Settings",
    "Calendar",
    "Clock",
  ],
  personal: ["User", "Home", "Coffee", "Music", "Camera", "Gamepad2", "Heart"],
  technology: [
    "Code",
    "Database",
    "Smartphone",
    "Laptop",
    "Monitor",
    "Cpu",
    "Globe",
  ],
  travel: ["Map", "MapPin", "Car", "Plane", "Train", "Mountain", "Camera"],
  health: ["Stethoscope", "Dumbbell", "Bike", "Utensils", "Apple", "Heart"],
  nature: ["Sun", "Moon", "Cloud", "Leaf", "Flower", "Tree", "Mountain"],
  shopping: ["ShoppingCart", "CreditCard", "Package", "Gift", "Truck"],
};

export type IconType = "emoji" | "lucide";

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const IconPicker = ({
  selectedIcon,
  onSelect,
  isOpen,
  onClose,
}: IconPickerProps) => {
  const { t } = useTranslation();
  const [iconType, setIconType] = useState<IconType>("emoji");
  const [activeCategory, setActiveCategory] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  // 검색 필터링 (lucide 아이콘만)
  const filteredIcons = searchQuery
    ? POPULAR_ICONS.filter((iconName) =>
        iconName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ICON_CATEGORIES[activeCategory] || [];

  const renderIcon = (iconName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;

    return (
      <button
        key={iconName}
        type="button"
        onClick={() => {
          onSelect(iconName);
          onClose();
        }}
        className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
          selectedIcon === iconName
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
            : "border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-500"
        }`}
        title={iconName}
      >
        <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
    );
  };

  const handleEmojiSelect = (emojiObject: { emoji: string }) => {
    onSelect(emojiObject.emoji);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("collections.selectIcon")}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LucideIcons.X className="w-5 h-5" />
            </button>
          </div>

          {/* 아이콘 타입 토글 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
            <button
              onClick={() => setIconType("lucide")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                iconType === "lucide"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <LucideIcons.Package className="w-4 h-4 inline mr-2" />
              {t("collections.lucideIcons")}
            </button>
            <button
              onClick={() => setIconType("emoji")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                iconType === "emoji"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              😀 {t("collections.emojis")}
            </button>
          </div>

          {/* 검색 (lucide 아이콘일 때만) */}
          {iconType === "lucide" && (
            <div className="relative">
              <LucideIcons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("collections.searchIcons")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* 컨텐츠 영역 */}
        {iconType === "lucide" ? (
          <div className="flex">
            {/* 카테고리 사이드바 (검색 중이 아닐 때만 표시) */}
            {!searchQuery && (
              <div className="w-32 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="p-2 space-y-1">
                  {Object.keys(ICON_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeCategory === category
                          ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {t(`collections.iconCategories.${category}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 아이콘 그리드 */}
            <div className="flex-1 p-4">
              <div className="grid grid-cols-6 gap-2 max-h-96 overflow-y-auto">
                {filteredIcons.map(renderIcon)}
              </div>

              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? t("collections.noSearchResults")
                    : t("collections.noIcons")}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 이모지 피커 */
          <div className="p-4">
            <div className="max-h-96 overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width="100%"
                height="350px"
                searchDisabled={false}
                skinTonesDisabled={false}
                previewConfig={{
                  showPreview: false,
                }}
              />
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("collections.selectedIcon")}:{" "}
              <span className="font-medium">
                {selectedIcon || t("collections.none")}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
