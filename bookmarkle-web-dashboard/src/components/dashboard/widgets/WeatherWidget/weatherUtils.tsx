import React from "react";
import { Cloud, CloudRain, Sun, CloudSnow, Wind } from "lucide-react";

// 날씨 아이콘 매핑
export const getWeatherIcon = (iconCode: string) => {
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

// 날씨 상태에 따른 배경 스타일
export const getWeatherBackground = (iconCode: string) => {
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
export const getWeatherAnimation = (iconCode: string) => {
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

// 날씨 아이콘 URL 가져오기
export const getWeatherIconUrl = (iconCode: string) => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};
