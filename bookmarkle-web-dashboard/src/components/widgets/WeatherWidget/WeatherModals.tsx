import React from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HourlyWeatherData, WeeklyWeatherData } from "./weatherTypes";
import { getWeatherIcon } from "./weatherUtils";

// 시간별 날씨 팝업 컴포넌트
export const HourlyWeatherModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  hourlyWeather: HourlyWeatherData[];
  city: string;
}> = ({ isOpen, onClose, hourlyWeather, city }) => {
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("weather.hourlyWeather")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {city}
            </span>
          </div>

          <div className="space-y-3">
            {hourlyWeather.length > 0 ? (
              hourlyWeather.map((hour, index) => (
                <div
                  key={`${hour.time}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[60px]">
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
        </div>
      </motion.div>
    </div>
  );
};

// 이번주 날씨 팝업 컴포넌트
export const WeeklyWeatherModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  weeklyWeather: WeeklyWeatherData[];
  city: string;
}> = ({ isOpen, onClose, weeklyWeather, city }) => {
  const { t, i18n } = useTranslation();

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("weather.weeklyWeather")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {city}
            </span>
          </div>

          <div className="space-y-3">
            {weeklyWeather.map((day, index) => (
              <div
                key={`${day.date}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white min-w-[40px]">
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
        </div>
      </motion.div>
    </div>
  );
};

// 확인 모달 컴포넌트
export const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, message, confirmText = "확인", onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// LocationSearchModal은 별도 파일로 분리됨
