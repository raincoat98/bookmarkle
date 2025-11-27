import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, X, Clock, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HourlyWeatherData, WeeklyWeatherData } from "./weatherTypes";
import { getWeatherIcon } from "./weatherUtils";

type TabType = "weekly" | "hourly";

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
  const [activeTab, setActiveTab] = useState<TabType>("weekly");

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
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

        {/* 탭 버튼 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "weekly"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            {t("weather.weeklyWeather")}
          </button>
          <button
            onClick={() => setActiveTab("hourly")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "hourly"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <Clock className="w-4 h-4" />
            {t("weather.hourlyWeather")}
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "weekly" ? (
            <div className="space-y-3">
              {weeklyWeather.length > 0 ? (
                weeklyWeather.map((day, index) => (
                  <div
                    key={`${day.date}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[50px]">
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
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("weather.noWeatherData")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {hourlyWeather.length > 0 ? (
                hourlyWeather.map((hour, index) => (
                  <div
                    key={`${hour.time}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[70px]">
                        {formatTime(hour.hour)}
                      </div>
                      {getWeatherIcon(hour.icon)}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {hour.description}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {hour.temperature}°C
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("weather.noHourlyData")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

