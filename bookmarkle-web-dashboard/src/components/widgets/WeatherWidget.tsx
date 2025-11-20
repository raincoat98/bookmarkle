import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Wind,
  MapPin,
  X,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";
import { getUserWeatherLocation, setUserWeatherLocation } from "../../firebase";

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface WeeklyWeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  icon: string;
}

interface LocationSearchResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface OpenWeatherGeocodeResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  local_names?: {
    ko?: string;
    [key: string]: string | undefined;
  };
}

interface OpenWeatherForecastItem {
  dt: number;
  main: {
    temp: number;
  };
  weather: Array<{
    id: number;
    description: string;
    icon: string;
  }>;
}

// 날씨 아이콘 매핑
const getWeatherIcon = (iconCode: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    "01d": <Sun className="w-6 h-6 text-yellow-500" />,
    "01n": <Sun className="w-6 h-6 text-yellow-500" />,
    "02d": <Cloud className="w-6 h-6 text-gray-500" />,
    "02n": <Cloud className="w-6 h-6 text-gray-500" />,
    "03d": <Cloud className="w-6 h-6 text-gray-500" />,
    "03n": <Cloud className="w-6 h-6 text-gray-500" />,
    "04d": <Cloud className="w-6 h-6 text-gray-500" />,
    "04n": <Cloud className="w-6 h-6 text-gray-500" />,
    "09d": <CloudRain className="w-6 h-6 text-blue-500" />,
    "09n": <CloudRain className="w-6 h-6 text-blue-500" />,
    "10d": <CloudRain className="w-6 h-6 text-blue-500" />,
    "10n": <CloudRain className="w-6 h-6 text-blue-500" />,
    "11d": <CloudRain className="w-6 h-6 text-blue-500" />,
    "11n": <CloudRain className="w-6 h-6 text-blue-500" />,
    "13d": <CloudSnow className="w-6 h-6 text-blue-300" />,
    "13n": <CloudSnow className="w-6 h-6 text-blue-300" />,
    "50d": <Wind className="w-6 h-6 text-gray-400" />,
    "50n": <Wind className="w-6 h-6 text-gray-400" />,
  };

  return iconMap[iconCode] || <Cloud className="w-6 h-6 text-gray-500" />;
};

// 이번주 날씨 팝업 컴포넌트
const WeeklyWeatherModal: React.FC<{
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

// 위치 검색 모달 컴포넌트
const LocationSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    lat: number;
    lon: number;
    city: string;
  }) => void;
}> = ({ isOpen, onClose, onSelectLocation }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        throw new Error("API 키가 설정되지 않았습니다");
      }

      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          query
        )}&limit=5&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error("위치 검색 API 호출 실패");
      }

      const data = (await response.json()) as OpenWeatherGeocodeResult[];
      setSearchResults(
        data.map((item) => {
          // 한국어 이름이 있으면 우선 사용, 없으면 원래 이름 사용
          const displayName = item.local_names?.ko || item.name;

          return {
            name: displayName,
            lat: item.lat,
            lon: item.lon,
            country: item.country,
            state: item.state,
          };
        })
      );
    } catch (error) {
      console.error("위치 검색 실패:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocation(searchQuery);
  };

  const handleSelectLocation = async (location: LocationSearchResult) => {
    setSaving(true);
    try {
      const cityName = `${location.name}${
        location.state ? `, ${location.state}` : ""
      }, ${location.country}`;
      await onSelectLocation({
        lat: location.lat,
        lon: location.lon,
        city: cityName,
      });
      onClose();
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("위치 저장 실패:", error);
      alert(t("weather.locationSaveError") || "위치 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t("weather.geolocationNotSupported"));
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
          if (!API_KEY) {
            throw new Error("API 키가 설정되지 않았습니다");
          }

          // 역 지오코딩으로 도시 이름 가져오기
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${API_KEY}`
          );

          if (!response.ok) {
            throw new Error("역 지오코딩 API 호출 실패");
          }

          const data = (await response.json()) as OpenWeatherGeocodeResult[];
          if (data.length > 0) {
            const location = data[0];
            // 한국어 이름이 있으면 우선 사용, 없으면 원래 이름 사용
            const displayName = location.local_names?.ko || location.name;

            // handleSelectLocation 호출 전에 로딩 상태 해제
            setIsSearching(false);
            await handleSelectLocation({
              name: displayName,
              lat: location.lat,
              lon: location.lon,
              country: location.country,
              state: location.state,
            });
          } else {
            // 위치를 찾을 수 없어도 좌표만 저장
            // handleSelectLocation 호출 전에 로딩 상태 해제
            setIsSearching(false);
            await handleSelectLocation({
              name: t("weather.currentLocation"),
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              country: "",
            });
          }
        } catch (error) {
          console.error("현재 위치 가져오기 실패:", error);
          setIsSearching(false);
          alert(t("weather.locationFetchError") || "위치 정보를 가져올 수 없습니다.");
        }
      },
      (error) => {
        console.error("위치 정보 가져오기 실패:", error);
        setIsSearching(false);
        let errorMessage = t("weather.geolocationError") || "위치 정보를 가져올 수 없습니다.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = t("weather.geolocationPermissionDenied") || "위치 권한이 거부되었습니다.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = t("weather.geolocationUnavailable") || "위치 정보를 사용할 수 없습니다.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = t("weather.geolocationTimeout") || "위치 정보 요청 시간이 초과되었습니다.";
        }
        alert(errorMessage);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
      }
    );
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("weather.changeLocation")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchLocation(e.target.value);
                  }}
                  placeholder={t("weather.searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </form>

          <button
            onClick={handleUseCurrentLocation}
            disabled={isSearching}
            className="w-full mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {t("weather.useCurrentLocation")}
          </button>

          {isSearching && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("weather.searching")}
              </p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("weather.selectLocation")}
              </p>
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(result)}
                  disabled={saving}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.name}
                        {result.state && `, ${result.state}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {result.country}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isSearching &&
            searchQuery &&
            searchResults.length === 0 &&
            searchQuery.trim() && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("weather.noResults")}
                </p>
              </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export const WeatherWidget: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weeklyWeather, setWeeklyWeather] = useState<WeeklyWeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // 사용자 위치 가져오기
  const getLocation = useCallback(async (): Promise<{
    lat: number;
    lon: number;
  }> => {
    // 먼저 저장된 위치 정보 확인
    if (user) {
      try {
        const savedLocation = await getUserWeatherLocation(user.uid);
        if (savedLocation) {
          return { lat: savedLocation.lat, lon: savedLocation.lon };
        }
      } catch (error) {
        console.error("저장된 위치 정보 불러오기 실패:", error);
      }
    }

    // 저장된 위치가 없으면 브라우저 위치 또는 기본값 사용
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // 서울역 좌표로 기본값 설정
        resolve({ lat: 37.5547, lon: 126.9706 });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          resolve(newLocation);
        },
        (error) => {
          console.log("위치 정보 가져오기 실패:", error);
          // 서울역 좌표로 기본값 설정
          resolve({ lat: 37.5547, lon: 126.9706 });
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }, [user]);

  // 이번주 날씨 데이터 가져오기
  const fetchWeeklyWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        // API 키가 없으면 기본 데이터 사용
        setWeeklyWeather([
          {
            date: new Date().toISOString().split("T")[0],
            temperature: { min: 15, max: 25 },
            description: "맑음",
            icon: "01d",
          },
          {
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            temperature: { min: 16, max: 26 },
            description: "구름 많음",
            icon: "02d",
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
            temperature: { min: 14, max: 24 },
            description: "비",
            icon: "10d",
          },
          {
            date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
            temperature: { min: 13, max: 23 },
            description: "맑음",
            icon: "01d",
          },
          {
            date: new Date(Date.now() + 345600000).toISOString().split("T")[0],
            temperature: { min: 12, max: 22 },
            description: "구름 많음",
            icon: "02d",
          },
        ]);
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
      );

      if (!response.ok) {
        throw new Error("주간 날씨 API 호출 실패");
      }

      const data = (await response.json()) as {
        list: OpenWeatherForecastItem[];
      };

      // 5일간의 날씨 데이터를 일별로 그룹화
      const dailyData = new Map<string, OpenWeatherForecastItem[]>();

      data.list.forEach((item) => {
        const date = new Date(item.dt * 1000).toISOString().split("T")[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(item);
      });

      const weeklyData: WeeklyWeatherData[] = [];

      dailyData.forEach((dayItems, date) => {
        // 해당 날의 평균 온도와 가장 많이 나타나는 날씨 상태 계산
        const temperatures = dayItems.map((item) => item.main.temp);
        const minTemp = Math.round(Math.min(...temperatures));
        const maxTemp = Math.round(Math.max(...temperatures));

        // 가장 많이 나타나는 날씨 상태 찾기
        const weatherCounts = new Map<string, number>();
        dayItems.forEach((item) => {
          const weatherId = item.weather[0].id.toString();
          weatherCounts.set(weatherId, (weatherCounts.get(weatherId) || 0) + 1);
        });

        const mostCommonWeather = Array.from(weatherCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0][0];

        const weatherItem = dayItems.find(
          (item) => item.weather[0].id.toString() === mostCommonWeather
        );

        if (weatherItem) {
          weeklyData.push({
            date,
            temperature: { min: minTemp, max: maxTemp },
            description: weatherItem.weather[0].description,
            icon: weatherItem.weather[0].icon,
          });
        }
      });

      setWeeklyWeather(weeklyData.slice(0, 7)); // 최대 7일
    } catch (error) {
      console.log("주간 날씨 정보 가져오기 실패:", error);
      // 기본 주간 날씨 데이터
      setWeeklyWeather([
        {
          date: new Date().toISOString().split("T")[0],
          temperature: { min: 15, max: 25 },
          description: "맑음",
          icon: "01d",
        },
        {
          date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          temperature: { min: 16, max: 26 },
          description: "구름 많음",
          icon: "02d",
        },
        {
          date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
          temperature: { min: 14, max: 24 },
          description: "비",
          icon: "10d",
        },
        {
          date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
          temperature: { min: 13, max: 23 },
          description: "맑음",
          icon: "01d",
        },
        {
          date: new Date(Date.now() + 345600000).toISOString().split("T")[0],
          temperature: { min: 12, max: 22 },
          description: "구름 많음",
          icon: "02d",
        },
      ]);
    }
  }, []);

  // 특정 위치로 날씨 데이터 가져오기
  const fetchWeatherWithLocation = useCallback(
    async (lat: number, lon: number, savedCityName?: string) => {
      try {
        setLoading(true);
        setError(null);

        const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!API_KEY) {
          throw new Error("API 키가 설정되지 않았습니다");
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
        );

        if (!response.ok) {
          throw new Error("날씨 API 호출 실패");
        }

        const data = await response.json();

        // 저장된 도시 이름이 있으면 우선 사용, 없으면 API 응답의 도시 이름 사용
        const cityName = savedCityName || data.name;

        setWeather({
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          city: cityName,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // m/s를 km/h로 변환
          feelsLike: Math.round(data.main.feels_like),
        });

        // 주간 날씨 데이터도 함께 가져오기
        await fetchWeeklyWeather(lat, lon);
      } catch (error) {
        console.log("날씨 정보 가져오기 실패:", error);
        setError("날씨 정보를 가져올 수 없습니다");

        // 기본 날씨 데이터 (API 실패 시)
        setWeather({
          temperature: 22,
          description: "맑음",
          icon: "01d",
          city: "서울역",
          humidity: 65,
          windSpeed: 12,
          feelsLike: 24,
        });

        // 기본 주간 날씨 데이터도 설정
        setWeeklyWeather([
          {
            date: new Date().toISOString().split("T")[0],
            temperature: { min: 15, max: 25 },
            description: "맑음",
            icon: "01d",
          },
          {
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            temperature: { min: 16, max: 26 },
            description: "구름 많음",
            icon: "02d",
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
            temperature: { min: 14, max: 24 },
            description: "비",
            icon: "10d",
          },
          {
            date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
            temperature: { min: 13, max: 23 },
            description: "맑음",
            icon: "01d",
          },
          {
            date: new Date(Date.now() + 345600000).toISOString().split("T")[0],
            temperature: { min: 12, max: 22 },
            description: "구름 많음",
            icon: "02d",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [fetchWeeklyWeather]
  );

  // 날씨 데이터 가져오기
  const fetchWeather = useCallback(async () => {
    const location = await getLocation();

    // 저장된 위치 정보가 있으면 도시 이름도 함께 가져오기
    let savedCityName: string | undefined;
    if (user) {
      try {
        const savedLocation = await getUserWeatherLocation(user.uid);
        if (savedLocation) {
          savedCityName = savedLocation.city;
        }
      } catch (error) {
        console.error("저장된 위치 정보 불러오기 실패:", error);
      }
    }

    await fetchWeatherWithLocation(location.lat, location.lon, savedCityName);
  }, [getLocation, fetchWeatherWithLocation, user]);

  // 현재 위치 새로고침
  const handleRefreshLocation = useCallback(async () => {
    await fetchWeather();
  }, [fetchWeather]);

  // 위치 선택 핸들러
  const handleSelectLocation = useCallback(
    async (location: { lat: number; lon: number; city: string }) => {
      if (user) {
        try {
          // 먼저 Firestore에 저장
          await setUserWeatherLocation(user.uid, location);
          console.log("위치 저장 완료:", location);

          // 저장 후 즉시 날씨 정보 업데이트 (저장한 위치와 도시 이름 사용)
          await fetchWeatherWithLocation(
            location.lat,
            location.lon,
            location.city
          );

          // 에러 상태 초기화
          setError(null);
        } catch (error) {
          console.error("위치 저장 또는 날씨 업데이트 실패:", error);
          setError(t("weather.locationSaveError"));
          setLoading(false);
        }
      }
    },
    [user, t, fetchWeatherWithLocation]
  );

  useEffect(() => {
    fetchWeather();

    // 30분마다 날씨 정보 업데이트
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

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

  // 날씨 상태에 따른 배경 스타일
  const getWeatherBackground = (iconCode: string) => {
    const weatherType = iconCode.substring(0, 2);
    const isDay = iconCode.endsWith("d");

    switch (weatherType) {
      case "01": // 맑음
        return isDay
          ? "bg-gradient-to-br from-blue-400 via-blue-500 to-yellow-400"
          : "bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900";
      case "02": // 약간 구름
      case "03": // 구름 많음
        return isDay
          ? "bg-gradient-to-br from-blue-300 via-gray-400 to-blue-400"
          : "bg-gradient-to-br from-gray-800 via-blue-900 to-gray-900";
      case "04": // 구름 많음
        return "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600";
      case "09": // 소나기
      case "10": // 비
        return "bg-gradient-to-br from-gray-600 via-blue-800 to-gray-900";
      case "11": // 번개
        return "bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800";
      case "13": // 눈
        return "bg-gradient-to-br from-blue-100 via-white to-blue-200";
      case "50": // 안개
        return "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500";
      default:
        return "bg-gradient-to-br from-blue-400 to-blue-600";
    }
  };

  // 날씨 상태에 따른 애니메이션 클래스
  const getWeatherAnimation = (iconCode: string) => {
    const weatherType = iconCode.substring(0, 2);

    switch (weatherType) {
      case "01": // 맑음
        return "animate-pulse";
      case "09": // 소나기
      case "10": // 비
        return "animate-bounce";
      case "11": // 번개
        return "animate-pulse";
      case "13": // 눈
        return "animate-pulse";
      default:
        return "";
    }
  };

  const getWeatherIconUrl = (iconCode: string) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

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
        {weather && (
          <div
            className={`absolute inset-0 ${getWeatherBackground(
              weather.icon
            )} opacity-90`}
          />
        )}

        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm" />

        {/* 위치 새로고침 및 변경 버튼 */}
        <div className="absolute bottom-2 right-2 z-20 flex gap-2">
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
              handleRefreshLocation();
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

      <LocationSearchModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
};
