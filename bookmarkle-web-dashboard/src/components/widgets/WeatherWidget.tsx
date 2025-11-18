import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "내일";
    } else {
      return date.toLocaleDateString("ko-KR", { weekday: "short" });
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
            이번주 날씨
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

export const WeatherWidget: React.FC = () => {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weeklyWeather, setWeeklyWeather] = useState<WeeklyWeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 사용자 위치 가져오기
  const getLocation = (): Promise<{ lat: number; lon: number }> => {
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
  };

  // 이번주 날씨 데이터 가져오기
  const fetchWeeklyWeather = async (lat: number, lon: number) => {
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

      const data = await response.json();

      // 5일간의 날씨 데이터를 일별로 그룹화
      const dailyData = new Map<string, any[]>();

      data.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toISOString().split("T")[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(item);
      });

      const weeklyData: WeeklyWeatherData[] = [];

      dailyData.forEach((dayItems, date) => {
        // 해당 날의 평균 온도와 가장 많이 나타나는 날씨 상태 계산
        const temperatures = dayItems.map((item: any) => item.main.temp);
        const minTemp = Math.round(Math.min(...temperatures));
        const maxTemp = Math.round(Math.max(...temperatures));

        // 가장 많이 나타나는 날씨 상태 찾기
        const weatherCounts = new Map<string, number>();
        dayItems.forEach((item: any) => {
          const weatherId = item.weather[0].id;
          weatherCounts.set(weatherId, (weatherCounts.get(weatherId) || 0) + 1);
        });

        const mostCommonWeather = Array.from(weatherCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0][0];

        const weatherItem = dayItems.find(
          (item: any) => item.weather[0].id === mostCommonWeather
        );

        weeklyData.push({
          date,
          temperature: { min: minTemp, max: maxTemp },
          description: weatherItem.weather[0].description,
          icon: weatherItem.weather[0].icon,
        });
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
  };

  // 특정 위치로 날씨 데이터 가져오기
  const fetchWeatherWithLocation = async (lat: number, lon: number) => {
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

      setWeather({
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        city: data.name,
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
  };

  // 날씨 데이터 가져오기
  const fetchWeather = async () => {
    const location = await getLocation();
    await fetchWeatherWithLocation(location.lat, location.lon);
  };

  // 현재 위치 새로고침
  const handleRefreshLocation = async () => {
    await fetchWeather();
  };

  useEffect(() => {
    fetchWeather();

    // 30분마다 날씨 정보 업데이트
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

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

        {/* 위치 새로고침 버튼 */}
        <div className="absolute bottom-2 right-2 z-20">
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
    </>
  );
};
