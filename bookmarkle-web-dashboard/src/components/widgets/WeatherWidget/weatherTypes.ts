export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

export interface WeeklyWeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  icon: string;
}

export interface HourlyWeatherData {
  time: string;
  hour: number;
  temperature: number;
  description: string;
  icon: string;
}

export interface LocationSearchResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface OpenWeatherGeocodeResult {
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

export interface OpenWeatherForecastItem {
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
