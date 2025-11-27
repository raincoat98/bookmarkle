import React, { useState } from "react";
import { Cloud, RefreshCw, Settings, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWeather } from "./useWeather";
import {
  WeeklyWeatherModal,
  HourlyWeatherModal,
} from "./WeatherModals";
import { LocationSearchModal } from "./LocationSearchModal";
import {
  getWeatherBackground,
  getWeatherAnimation,
  getWeatherIconUrl,
} from "./weatherUtils";

export const WeatherWidget: React.FC = () => {
  const { t } = useTranslation();
  const {
    weather,
    weeklyWeather,
    hourlyWeather,
    loading,
    error,
    fetchWeather,
    handleSelectLocation,
  } = useWeather();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHourlyModalOpen, setIsHourlyModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full flex items-center justify-center">
        <div className="animate-pulse flex items-center space-x-3">
          <Cloud className="w-6 h-6 text-gray-400" />
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Cloud className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("weather.noWeatherData")}
          </span>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-soft cursor-pointer hover:shadow-lg transition-shadow min-h-[120px] sm:min-h-[140px] ${
          isModalOpen ? "pointer-events-none opacity-50" : ""
        }`}
        onClick={() => {
          if (!isModalOpen) {
            setIsModalOpen(true);
          }
        }}
      >
        {/* 동적 배경 */}
        <div
          className={`absolute inset-0 ${getWeatherBackground(
            weather.icon
          )} opacity-90`}
        />

        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm" />

        {/* 위치 새로고침 및 변경 버튼 */}
        <div className="absolute bottom-2 right-2 z-20 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHourlyModalOpen(true);
            }}
            className="p-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110"
            title={t("weather.hourlyWeather")}
          >
            <Clock className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocationModalOpen(true);
            }}
            className="p-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110"
            title={t("weather.changeLocation")}
          >
            <Settings className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchWeather();
            }}
            className="p-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-110"
            title={t("weather.refreshLocation")}
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="relative z-10 p-3 sm:p-4">
          <h3 className="text-sm sm:text-md font-semibold text-white mb-2 sm:mb-3 drop-shadow-lg">
            {t("weather.title")}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-200 text-sm mb-2 drop-shadow">{error}</p>
              <p className="text-xs text-white/80 drop-shadow">
                {t("weather.fetchError")}
              </p>
            </div>
          ) : weather ? (
            <div className="space-y-3">
              {/* 메인 날씨 정보 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`${getWeatherAnimation(weather.icon)}`}>
                    <img
                      src={getWeatherIconUrl(weather.icon)}
                      alt={weather.description}
                      className="w-10 sm:w-12 h-10 sm:h-12 drop-shadow-lg"
                    />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                      {weather.temperature}°C
                    </p>
                    <p className="text-xs text-white/90 capitalize drop-shadow">
                      {weather.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white drop-shadow-lg">
                    {weather.city}
                  </p>
                  <p className="text-xs text-white/80 drop-shadow">
                    {t("weather.feelsLike")} {weather.feelsLike}°C
                  </p>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/30">
                <div className="text-center">
                  <p className="text-xs text-white/80 mb-1 drop-shadow">
                    {t("weather.humidity")}
                  </p>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {weather.humidity}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/80 mb-1 drop-shadow">
                    {t("weather.windSpeed")}
                  </p>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {weather.windSpeed} km/h
                  </p>
                </div>
              </div>

              {/* 장식적 요소들 */}
              <div className="absolute top-3 right-3 opacity-20">
                {weather.icon.includes("01") && (
                  <div className="w-12 h-12 bg-yellow-300 rounded-full animate-pulse" />
                )}
                {(weather.icon.includes("09") ||
                  weather.icon.includes("10")) && (
                  <div className="flex space-x-1">
                    <div
                      className="w-0.5 h-4 bg-blue-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    />
                    <div
                      className="w-0.5 h-3 bg-blue-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-0.5 h-5 bg-blue-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                )}
                {weather.icon.includes("13") && (
                  <div className="grid grid-cols-3 gap-0.5">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/80 drop-shadow">
                날씨 정보를 불러올 수 없습니다
              </p>
            </div>
          )}
        </div>
      </div>

      <WeeklyWeatherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        weeklyWeather={weeklyWeather}
        city={weather.city}
      />

      <HourlyWeatherModal
        isOpen={isHourlyModalOpen}
        onClose={() => setIsHourlyModalOpen(false)}
        hourlyWeather={hourlyWeather}
        city={weather.city}
      />

      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
};
