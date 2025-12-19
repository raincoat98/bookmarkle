import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "../../../stores/authStore";
import {
  getUserWeatherLocation,
  setUserWeatherLocation,
  auth,
} from "../../../firebase";
import type {
  WeatherData,
  WeeklyWeatherData,
  HourlyWeatherData,
  OpenWeatherForecastItem,
} from "./weatherTypes";

// 기본 주간 날씨 데이터
const getDefaultWeeklyWeather = (): WeeklyWeatherData[] => [
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
];

// 기본 날씨 데이터
const getDefaultWeather = (): WeatherData => ({
  temperature: 22,
  description: "맑음",
  icon: "01d",
  city: "서울역",
  humidity: 65,
  windSpeed: 12,
  feelsLike: 24,
});

export const useWeather = () => {
  const { user } = useAuthStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weeklyWeather, setWeeklyWeather] = useState<WeeklyWeatherData[]>([]);
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 사용자 위치 가져오기
  const getLocation = useCallback(async (): Promise<{
    lat: number;
    lon: number;
  }> => {
    // 먼저 저장된 위치 정보 확인 (Firebase Auth가 동기화된 경우에만)
    if (user && auth.currentUser?.uid === user.uid) {
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

  // 오늘 시간별 날씨 데이터 가져오기
  const fetchHourlyWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        setHourlyWeather([]);
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
      );

      if (!response.ok) {
        throw new Error("시간별 날씨 API 호출 실패");
      }

      const data = (await response.json()) as {
        list: OpenWeatherForecastItem[];
      };

      // 현재 시간부터 24시간 후까지의 데이터 필터링
      const now = new Date();
      const nowTime = now.getTime();
      const tomorrow24h = new Date(now);
      tomorrow24h.setHours(tomorrow24h.getHours() + 24);
      const tomorrow24hTime = tomorrow24h.getTime();

      // 현재 시간부터 24시간 후까지의 데이터
      const todayData = data.list.filter((item) => {
        const itemDate = new Date(item.dt * 1000);
        const itemTime = itemDate.getTime();

        // 현재 시간 이후이고 24시간 이내의 데이터
        return itemTime >= nowTime && itemTime <= tomorrow24hTime;
      });

      // 시간별 날씨 데이터 변환
      const hourlyData: HourlyWeatherData[] = todayData.map((item) => {
        const date = new Date(item.dt * 1000);
        return {
          time: date.toISOString(),
          hour: date.getHours(),
          temperature: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
        };
      });

      // 시간 순으로 정렬
      hourlyData.sort((a, b) => a.hour - b.hour);

      setHourlyWeather(hourlyData);
    } catch (error) {
      console.log("시간별 날씨 정보 가져오기 실패:", error);
      setHourlyWeather([]);
    }
  }, []);

  // 이번주 날씨 데이터 가져오기
  const fetchWeeklyWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!API_KEY) {
        setWeeklyWeather(getDefaultWeeklyWeather());
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
      setWeeklyWeather(getDefaultWeeklyWeather());
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

        // 주간 날씨 데이터와 시간별 날씨 데이터도 함께 가져오기
        await Promise.all([
          fetchWeeklyWeather(lat, lon),
          fetchHourlyWeather(lat, lon),
        ]);
      } catch (error) {
        console.log("날씨 정보 가져오기 실패:", error);
        setError("날씨 정보를 가져올 수 없습니다");

        // 기본 날씨 데이터 (API 실패 시)
        setWeather(getDefaultWeather());
        setWeeklyWeather(getDefaultWeeklyWeather());
      } finally {
        setLoading(false);
      }
    },
    [fetchWeeklyWeather, fetchHourlyWeather]
  );

  // 날씨 데이터 가져오기
  const fetchWeather = useCallback(async () => {
    const location = await getLocation();

    // 저장된 위치 정보가 있으면 도시 이름도 함께 가져오기 (Firebase Auth가 동기화된 경우에만)
    let savedCityName: string | undefined;
    if (user && auth.currentUser?.uid === user.uid) {
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

  // 위치 선택 핸들러
  const handleSelectLocation = useCallback(
    async (location: { lat: number; lon: number; city: string }) => {
      if (user && auth.currentUser?.uid === user.uid) {
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
          setError("위치 저장 중 오류가 발생했습니다");
          setLoading(false);
        }
      }
    },
    [user, fetchWeatherWithLocation]
  );

  useEffect(() => {
    fetchWeather();

    // 30분마다 날씨 정보 업데이트
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

  return {
    weather,
    weeklyWeather,
    hourlyWeather,
    loading,
    error,
    fetchWeather,
    handleSelectLocation,
  };
};
