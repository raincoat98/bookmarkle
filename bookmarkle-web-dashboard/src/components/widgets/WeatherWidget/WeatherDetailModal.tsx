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
    const localeMap: { [key: string]: string } = {
      ko: "ko-KR",
      en: "en-US",
      ja: "ja-JP",
    };
    const locale = localeMap[i18n.language] || "en-US";

    if (i18n.language === "ko") {
      return `${hour}시`;
    } else {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return date.toLocaleTimeString(locale, {
        hour: "numeric",
        hour12: false,
      });
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t("weather.today");
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t("weather.tomorrow");
    } else {
      const localeMap: { [key: string]: string } = {
        ko: "ko-KR",
        en: "en-US",
        ja: "ja-JP",
      };
      const locale = localeMap[i18n.language] || "en-US";
      return date.toLocaleDateString(locale, { weekday: "short" });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {city}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 오늘 시간별 날씨 - 가로 스크롤 */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t("weather.hourlyWeather")}
            </h3>
            {hourlyWeather.length > 0 ? (
              <div className="overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide">
                <div className="flex gap-2.5 min-w-max">
                  {hourlyWeather.map((hour, index) => (
                    <div
                      key={`${hour.time}-${index}`}
                      className="flex flex-col items-center w-20 min-h-[120px] p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-200 flex-shrink-0 hover:shadow-md"
                    >
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 whitespace-nowrap">
                        {formatTime(hour.hour)}
                      </div>
                      <img
                        src={getWeatherIconUrl(hour.icon)}
                        alt={hour.description}
                        className="w-9 h-9 mb-1.5 flex-shrink-0"
                      />
                      <div className="text-base font-bold text-gray-900 dark:text-white mb-1 whitespace-nowrap">
                        {hour.temperature}°
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight min-h-[2rem] w-full px-0.5 flex items-center justify-center">
                        {hour.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("weather.noHourlyData")}
                </p>
              </div>
            )}
          </div>

          {/* 이번주 날씨 */}
          <div className="px-6 py-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t("weather.weeklyWeather")}
            </h3>
            {weeklyWeather.length > 0 ? (
              <div className="overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide">
                <div className="flex gap-2.5 min-w-max">
                  {weeklyWeather.map((day, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="flex flex-col items-center w-28 h-36 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-200 flex-shrink-0 hover:shadow-md"
                    >
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2 whitespace-nowrap">
                        {getDayName(day.date)}
                      </div>
                      <div className="mb-2">{getWeatherIcon(day.icon)}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center line-clamp-2 max-h-[2rem] overflow-hidden w-full px-1">
                        {day.description}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mt-auto">
                        <span className="text-gray-500 dark:text-gray-400">
                          {day.temperature.min}°
                        </span>
                        <span className="mx-1 text-gray-400 dark:text-gray-500">
                          /
                        </span>
                        <span>{day.temperature.max}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("weather.noWeatherData")}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
