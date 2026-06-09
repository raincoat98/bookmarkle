import React, { useState } from "react";
import { Cloud, RefreshCw, Settings, Droplets, Wind } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWeather } from "./useWeather";
import { WeatherDetailModal } from "./WeatherDetailModal";
import { LocationSearchModal } from "./LocationSearchModal";
import { getWeatherBackground, getWeatherIconUrl } from "./weatherUtils";

export const WeatherWidget: React.FC = () => {
  const { t } = useTranslation();
  const { weather, weeklyWeather, hourlyWeather, loading, error, fetchWeather, handleSelectLocation } = useWeather();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="relative rounded-2xl overflow-hidden min-h-[130px] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-white/70">날씨 불러오는 중</span>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="relative rounded-2xl overflow-hidden min-h-[130px] bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-white/80">
          <Cloud className="w-8 h-8" />
          <span className="text-sm">{t("weather.noWeatherData")}</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const isDay = weather.icon?.endsWith("d") ?? true;

  return (
    <>
      <div
        className={`relative rounded-2xl overflow-hidden cursor-pointer min-h-[130px] sm:min-h-[140px] ${
          isDetailModalOpen ? "pointer-events-none opacity-50" : ""
        }`}
        onClick={() => { if (!isDetailModalOpen) setIsDetailModalOpen(true); }}
      >
        {/* 배경 그라데이션 */}
        <div className={`absolute inset-0 ${getWeatherBackground(weather.icon)}`} />

        {/* 장식 글로우 블롭 */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

        {/* 날씨 조건별 장식 */}
        {isDay && weather.icon?.includes("01") && (
          <>
            <div className="absolute top-3 right-16 w-16 h-16 bg-yellow-300/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute top-6 right-20 w-8 h-8 bg-yellow-200/30 rounded-full blur-md" />
          </>
        )}
        {(weather.icon?.includes("09") || weather.icon?.includes("10")) && (
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 bg-blue-300 rounded-full animate-bounce"
                style={{
                  height: `${12 + (i % 3) * 6}px`,
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 2) * 30}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        )}
        {weather.icon?.includes("13") && (
          <div className="absolute inset-0 opacity-20">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%`, animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="absolute top-3 right-3 z-20 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); fetchWeather(); }}
            className="w-7 h-7 flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg transition-all active:scale-95"
            title={t("weather.refreshLocation")}
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsLocationModalOpen(true); }}
            className="w-7 h-7 flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg transition-all active:scale-95"
            title={t("weather.changeLocation")}
          >
            <Settings className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="relative z-10 p-4 sm:p-5 flex flex-col h-full">
          {/* 상단: 메인 날씨 */}
          <div className="flex items-start justify-between flex-1">
            {/* 왼쪽: 아이콘 + 온도 */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 drop-shadow-2xl">
                <img
                  src={getWeatherIconUrl(weather.icon)}
                  alt={weather.description}
                  className="w-14 h-14 sm:w-16 sm:h-16"
                />
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-white leading-none tracking-tight drop-shadow-lg">
                  {weather.temperature}°
                </p>
                <p className="text-xs sm:text-sm text-white/80 mt-1 capitalize font-medium drop-shadow">
                  {weather.description}
                </p>
              </div>
            </div>

            {/* 오른쪽: 위치 정보 */}
            <div className="text-right mt-1 pr-20">
              <p className="text-sm sm:text-base font-semibold text-white drop-shadow-lg leading-tight">
                {weather.city}
              </p>
              <p className="text-xs text-white/70 mt-0.5 drop-shadow">
                체감 {weather.feelsLike}°C
              </p>
            </div>
          </div>

          {/* 하단: 습도 + 풍속 */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-xl flex-1 justify-center">
              <Droplets className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">{weather.humidity}%</span>
                <span className="text-[10px] text-white/70">{t("weather.humidity")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-xl flex-1 justify-center">
              <Wind className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-white">{weather.windSpeed}</span>
                <span className="text-[10px] text-white/70">km/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WeatherDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        weeklyWeather={weeklyWeather}
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
