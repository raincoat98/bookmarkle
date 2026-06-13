import React from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HourlyWeatherData, WeeklyWeatherData } from "./weatherTypes";
import { getWeatherIcon, getWeatherIconUrl } from "./weatherUtils";

interface WeatherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyWeather: WeeklyWeatherData[];
  hourlyWeather: HourlyWeatherData[];
  city: string;
}

export const WeatherDetailModal: React.FC<WeatherDetailModalProps> = ({
  isOpen,
  onClose,
  weeklyWeather,
  hourlyWeather,
  city,
}) => {
  const { t, i18n } = useTranslation();
  const formatTime = (hour: number) => {
    if (i18n.language === "ko") return `${String(hour).padStart(2, "0")}시`;
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return t("weather.today");
    if (date.toDateString() === tomorrow.toDateString()) return t("weather.tomorrow");
    const localeMap: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };
    return date.toLocaleDateString(localeMap[i18n.language] || "en-US", { weekday: "short" });
  };

  const highlightIndex = React.useMemo(() => {
    if (!hourlyWeather.length) return 0;
    const currentHour = new Date().getHours();
    const idx = hourlyWeather.findIndex((item) => item.hour >= currentHour);
    if (idx !== -1) return idx;
    const minHour = Math.min(...hourlyWeather.map((i) => i.hour));
    return hourlyWeather.findIndex((i) => i.hour === minHour) || 0;
  }, [hourlyWeather]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-[780px] bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{city}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 시간별 날씨 */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t("weather.hourlyWeather")}
            </h3>
            {hourlyWeather.length > 0 ? (
              <div className="overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex gap-2 w-full">
                  {hourlyWeather.map((hour, index) => {
                    const isActive = index === highlightIndex;
                    return (
                      <div
                        key={`${hour.time}-${index}`}
                        className={`flex flex-col items-center flex-1 min-w-[64px] py-3 px-1 rounded-xl transition-all duration-150 ${
                          isActive
                            ? "bg-violet-50 dark:bg-violet-500/10 border border-violet-300 dark:border-violet-500/50 ring-1 ring-violet-400/30"
                            : "bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.07]"
                        }`}
                      >
                        <span className={`text-[11px] font-semibold mb-2 whitespace-nowrap ${
                          isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {formatTime(hour.hour)}
                        </span>
                        <img
                          src={getWeatherIconUrl(hour.icon)}
                          alt={hour.description}
                          className="w-8 h-8 mb-2 flex-shrink-0"
                        />
                        <span className={`text-sm font-bold mb-1 ${
                          isActive ? "text-violet-700 dark:text-violet-300" : "text-gray-900 dark:text-gray-100"
                        }`}>
                          {hour.temperature}°
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                          {hour.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                {t("weather.noHourlyData")}
              </p>
            )}
          </div>

          {/* 주간 날씨 */}
          <div className="px-5 py-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t("weather.weeklyWeather")}
            </h3>
            {weeklyWeather.length > 0 ? (
              <div className="overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex gap-2 w-full">
                  {weeklyWeather.map((day, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="flex flex-col items-center flex-1 min-w-[80px] py-3 px-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-all duration-150"
                    >
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 whitespace-nowrap">
                        {getDayName(day.date)}
                      </span>
                      <div className="mb-2">{getWeatherIcon(day.icon)}</div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 text-center leading-tight line-clamp-2">
                        {day.description}
                      </span>
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-auto">
                        <span className="text-gray-400 dark:text-gray-500">{day.temperature.min}°</span>
                        <span className="text-gray-300 dark:text-gray-600 mx-1">/</span>
                        <span>{day.temperature.max}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                {t("weather.noWeatherData")}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
