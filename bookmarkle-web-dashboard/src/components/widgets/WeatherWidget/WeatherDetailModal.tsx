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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {city}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 오늘 시간별 날씨 - 가로 스크롤 */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("weather.hourlyWeather")}
            </h3>
            {hourlyWeather.length > 0 ? (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 min-w-max">
                  {hourlyWeather.map((hour, index) => (
                    <div
                      key={`${hour.time}-${index}`}
                      className="flex flex-col items-center min-w-[80px] p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {formatTime(hour.hour)}
                      </div>
                      <img
                        src={getWeatherIconUrl(hour.icon)}
                        alt={hour.description}
                        className="w-10 h-10 mb-2"
                      />
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {hour.temperature}°
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                        {hour.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("weather.noHourlyData")}
                </p>
              </div>
            )}
          </div>

          {/* 이번주 날씨 */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("weather.weeklyWeather")}
            </h3>
            {weeklyWeather.length > 0 ? (
              <div className="space-y-3">
                {weeklyWeather.map((day, index) => (
                  <div
                    key={`${day.date}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[60px]">
                        {getDayName(day.date)}
                      </div>
                      {getWeatherIcon(day.icon)}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {day.description}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {day.temperature.min}° / {day.temperature.max}°
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
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
