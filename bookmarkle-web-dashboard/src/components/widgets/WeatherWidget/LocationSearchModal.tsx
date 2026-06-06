import React, { useState } from "react";
import { MapPin, X, Search, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  LocationSearchResult,
  OpenWeatherGeocodeResult,
} from "./weatherTypes";

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    lat: number;
    lon: number;
    city: string;
  }) => Promise<void>;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState(false);

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSaving(false);
    setError(null);
    setConfirmTimeout(false);
    onClose();
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    setError(null);
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) throw new Error("API 키 없음");
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
      );
      if (!res.ok) throw new Error("검색 실패");
      const data = (await res.json()) as OpenWeatherGeocodeResult[];
      setSearchResults(
        data.map((item) => ({
          name: item.local_names?.ko || item.name,
          lat: item.lat,
          lon: item.lon,
          country: item.country,
          state: item.state,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = async (location: LocationSearchResult) => {
    setSaving(true);
    try {
      const cityName = `${location.name}${location.state ? `, ${location.state}` : ""}${location.country ? `, ${location.country}` : ""}`;
      await onSelectLocation({ lat: location.lat, lon: location.lon, city: cityName });
      handleClose();
    } catch {
      setError(t("weather.locationSaveError") ?? "위치 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t("weather.geolocationNotSupported") ?? "이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }
    setIsSearching(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
          if (!API_KEY) throw new Error("API 키 없음");
          const res = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${API_KEY}`
          );
          if (!res.ok) throw new Error("역지오코딩 실패");
          const data = (await res.json()) as OpenWeatherGeocodeResult[];
          const loc = data[0];
          const name = loc ? (loc.local_names?.ko || loc.name) : (t("weather.currentLocation") ?? "현재 위치");
          await onSelectLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            city: name + (loc?.country ? `, ${loc.country}` : ""),
          });
          handleClose();
        } catch {
          setError(t("weather.locationFetchError") ?? "위치 정보를 가져올 수 없습니다.");
        } finally {
          setIsSearching(false);
        }
      },
      (err) => {
        setIsSearching(false);
        if (err.code === err.TIMEOUT) {
          setConfirmTimeout(true);
        } else if (err.code === err.PERMISSION_DENIED) {
          setError(t("weather.geolocationPermissionDenied") ?? "위치 권한이 거부되었습니다.");
        } else {
          setError(t("weather.geolocationError") ?? "위치 정보를 가져올 수 없습니다.");
        }
      },
      { timeout: 20000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  const handleUseDefaultLocation = async () => {
    setConfirmTimeout(false);
    try {
      await onSelectLocation({ lat: 37.5547, lon: 126.9706, city: "서울역, 대한민국" });
      handleClose();
    } catch {
      setError(t("weather.locationSaveError"));
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-150";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("weather.changeLocation")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* 검색 인풋 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); searchLocation(e.target.value); }}
              placeholder={t("weather.searchPlaceholder")}
              className={inputClass}
              autoFocus
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>

          {/* 현재 위치 버튼 */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isSearching}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.10] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Navigation className="w-4 h-4" />
            {t("weather.useCurrentLocation")}
          </button>

          {/* 에러 메시지 */}
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 타임아웃 확인 */}
          {confirmTimeout && (
            <div className="px-3 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t("weather.geolocationTimeout") ?? "위치 요청 시간이 초과됐습니다. 기본 위치(서울역)를 사용할까요?"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmTimeout(false)}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleUseDefaultLocation}
                  className="flex-1 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
                >
                  {t("common.confirm") ?? "사용"}
                </button>
              </div>
            </div>
          )}

          {/* 로딩 */}
          {isSearching && (
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("weather.searching")}</p>
            </div>
          )}

          {/* 검색 결과 */}
          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(result)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.07] border border-gray-200 dark:border-white/[0.06] disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.name}{result.state && `, ${result.state}`}
                      </p>
                      {result.country && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{result.country}</p>
                      )}
                    </div>
                    {saving && (
                      <div className="ml-auto w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 결과 없음 */}
          {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              {t("weather.noResults")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
