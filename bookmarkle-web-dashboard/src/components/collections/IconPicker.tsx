import { useState } from "react";
import * as LucideIcons from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useTranslation } from "react-i18next";

// 카테고리별 아이콘 그룹 (lucide-react 검증 완료)
const ICON_CATEGORIES: Record<string, string[]> = {
  general: [
    "Folder", "FolderOpen", "FolderHeart", "FolderCode", "FolderArchive",
    "FolderClosed", "FolderDot", "FolderInput", "FolderOutput", "FolderPlus",
    "BookOpen", "Book", "BookMarked", "BookCopy", "BookText",
    "BookHeart", "BookCheck",
    "Bookmark", "BookmarkCheck", "BookmarkPlus", "BookmarkX",
    "Heart", "HeartHandshake", "HeartPulse",
    "Star", "StarHalf", "Stars", "Sparkles",
    "Flag", "Tag", "Tags", "Hash", "AtSign",
    "Bell", "BellRing", "BellOff",
    "Pin", "PinOff", "Link", "Link2", "ExternalLink", "Globe", "Globe2",
    "Search", "Filter", "SlidersHorizontal",
    "LayoutGrid", "LayoutList", "LayoutDashboard",
    "Home", "House", "Archive", "Inbox", "Send", "Share2",
    "Eye", "EyeOff", "Lightbulb", "Megaphone",
  ],
  work: [
    "Briefcase", "BriefcaseBusiness", "Building", "Building2", "Factory",
    "Code", "Code2", "CodeXml", "Terminal", "SquareCode", "FileCode",
    "Database", "DatabaseZap", "ServerCog", "Server",
    "Settings", "Settings2", "Cog", "Wrench", "Hammer",
    "Calendar", "CalendarCheck", "CalendarClock", "CalendarDays",
    "Clock", "Timer", "Hourglass", "AlarmClock",
    "FileText", "FilePen", "FileCheck", "FileSearch", "Files",
    "ClipboardList", "ClipboardCheck", "ListTodo", "CheckSquare", "ListChecks",
    "BarChart", "BarChart2", "BarChart3", "LineChart", "PieChart", "TrendingUp",
    "Mail", "MailOpen", "MessageSquare", "MessageCircle", "Send",
    "Phone", "PhoneCall", "Video", "Users",
    "GraduationCap", "Award", "Trophy", "Medal",
    "Calculator", "Goal", "Target",
  ],
  personal: [
    "User", "UserCircle", "UserRound", "Users",
    "Home", "House", "Hotel", "DoorOpen",
    "Coffee", "Soup", "UtensilsCrossed", "Wine", "Beer", "Milk",
    "Pizza", "IceCream", "CakeSlice", "Cookie", "Cherry",
    "Music", "Music2", "Music4", "Headphones", "Radio", "Mic", "Disc",
    "Camera", "Image", "ImagePlay", "Film",
    "Gamepad", "Gamepad2", "Dice5", "Puzzle",
    "Heart", "Smile", "Laugh", "PartyPopper",
    "Baby", "PersonStanding", "HandHeart", "Handshake",
    "Shirt", "Watch", "Glasses", "Footprints",
    "Pencil", "PenLine", "NotebookPen", "Paintbrush", "Palette",
    "Bike", "Car", "Dumbbell",
  ],
  technology: [
    "Smartphone", "Tablet", "Laptop", "Monitor", "Tv",
    "Keyboard", "Mouse", "Printer", "HardDrive", "ScanLine",
    "Cpu", "MemoryStick", "Server", "Database", "Cloud",
    "Wifi", "WifiOff", "Bluetooth", "Usb", "BatteryFull",
    "Code", "Code2", "Terminal", "Bug", "GitBranch", "GitMerge", "GitFork",
    "Github", "Chrome",
    "Globe", "Globe2", "Network", "Share2", "Rss",
    "Shield", "ShieldCheck", "Lock", "Unlock", "Key", "Fingerprint",
    "Bot", "Zap", "CircuitBoard",
    "QrCode", "Barcode", "ScanQrCode",
    "Play", "Pause", "Rewind", "FastForward", "Volume2",
    "Webhook", "Workflow", "Boxes",
  ],
  travel: [
    "Map", "MapPin", "MapPinned", "Navigation", "Compass", "Route",
    "Plane", "PlaneTakeoff", "PlaneLanding", "Rocket",
    "Car", "CarFront", "Truck", "Bus", "Train", "TramFront",
    "Bike", "Ship", "Sailboat", "Anchor",
    "Mountain", "TreePine", "Tent", "MountainSnow",
    "Camera", "Luggage", "Backpack", "Ticket",
    "Hotel", "Landmark", "Church", "Castle",
    "Waves", "Sunset", "Sunrise",
    "Globe", "Globe2", "Earth",
  ],
  health: [
    "Stethoscope", "Pill", "Syringe", "Thermometer", "Activity",
    "HeartPulse", "Heart", "Brain", "Eye", "Ear", "Smile",
    "Dumbbell", "PersonStanding", "Bike",
    "Apple", "Salad", "Utensils", "UtensilsCrossed",
    "Droplets", "Wind", "Bone", "Accessibility",
    "BedDouble", "Moon", "Sun", "Clock",
    "Shield", "ShieldPlus", "Plus", "Cross",
    "Leaf", "Flower", "Sprout", "HandHeart",
  ],
  nature: [
    "Sun", "Sunrise", "Sunset", "Moon", "Star", "Stars", "Sparkles",
    "Cloud", "CloudRain", "CloudSnow", "CloudLightning", "Tornado", "Wind",
    "Snowflake", "Flame", "Droplets", "Waves",
    "Leaf", "Flower", "Flower2", "Clover", "Sprout",
    "TreePine", "TreeDeciduous", "Palmtree",
    "Mountain", "MountainSnow",
    "Bug", "Fish", "Bird", "Dog", "Cat", "Rabbit", "Squirrel",
    "Turtle", "Snail", "Worm", "Shell",
    "Banana", "Apple", "Cherry", "Grape", "Carrot",
    "Earth", "Globe", "Globe2",
  ],
  shopping: [
    "ShoppingCart", "ShoppingBag", "ShoppingBasket", "Store", "Warehouse",
    "CreditCard", "Wallet", "Banknote", "Coins", "DollarSign", "Euro",
    "Package", "Package2", "PackageOpen", "PackageCheck", "PackagePlus",
    "Gift",
    "Truck", "PartyPopper",
    "Tag", "Tags", "Percent", "TicketPercent", "Receipt",
    "Barcode", "QrCode", "Scale", "Ruler",
    "Shirt", "Watch", "Gem",
    "Home", "Sofa", "Lamp", "LampDesk", "Tv",
  ],
};

// 검색용 전체 아이콘 목록
const POPULAR_ICONS = [...new Set(Object.values(ICON_CATEGORIES).flat())];

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

  const handleEmojiSelect = (emojiObject: { emoji: string }) => {
    onSelect(emojiObject.emoji);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-hidden border-0 sm:border border-gray-100 dark:border-white/[0.06]">

        {/* 헤더 */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          {/* 모바일 드래그 핸들 */}
          <div className="w-10 h-1 bg-gray-200 dark:bg-white/[0.12] rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("collections.selectIcon")}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <LucideIcons.X className="w-4 h-4" />
            </button>
          </div>

          {/* 아이콘 타입 토글 */}
          <div className="flex bg-gray-50 dark:bg-white/[0.04] rounded-xl p-1 mb-3">
            <button
              onClick={() => setIconType("lucide")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                iconType === "lucide"
                  ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <LucideIcons.Package className="w-4 h-4" />
              {t("collections.lucideIcons")}
            </button>
            <button
              onClick={() => setIconType("emoji")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                iconType === "emoji"
                  ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              😀 {t("collections.emojis")}
            </button>
          </div>

          {/* 검색 */}
          {iconType === "lucide" && (
            <div className="relative">
              <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("collections.searchIcons")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* 카테고리 탭 (가로 스크롤, lucide + 검색 없을 때) */}
        {iconType === "lucide" && !searchQuery && (
          <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-gray-50 dark:border-white/[0.04] flex-shrink-0">
            {Object.keys(ICON_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeCategory === category
                    ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                }`}
              >
                {t(`collections.iconCategories.${category}`)}
              </button>
            ))}
          </div>
        )}

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          {iconType === "lucide" ? (
            <div className="p-4">
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {filteredIcons.map((iconName) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const IconComponent = (LucideIcons as any)[iconName];
                  if (!IconComponent) return null;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => { onSelect(iconName); onClose(); }}
                      className={`aspect-square flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 touch-manipulation ${
                        selectedIcon === iconName
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-500/20"
                          : "border-gray-100 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                      title={iconName}
                    >
                      <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                  {searchQuery ? t("collections.noSearchResults") : t("collections.noIcons")}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width="100%"
                height="320px"
                searchDisabled={false}
                skinTonesDisabled={false}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};
