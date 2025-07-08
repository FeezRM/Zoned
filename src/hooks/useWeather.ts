import { useState, useEffect } from 'react';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    icon: string;
  }>;
}

interface WeatherResponse {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
  };
}

interface ForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp_max: number;
      temp_min: number;
    };
    weather: Array<{
      main: string;
    }>;
  }>;
}

const API_KEY = 'demo'; // Using demo mode for now

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getWeatherIcon = (main: string): string => {
    switch (main.toLowerCase()) {
      case 'clear':
        return 'sunny';
      case 'clouds':
        return 'partly-cloudy';
      case 'rain':
      case 'drizzle':
        return 'rainy';
      default:
        return 'cloudy';
    }
  };

  const getDayName = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      // For demo purposes, we'll use mock data based on coordinates
      // In production, you would use: 
      // const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
      // const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
      
      // Mock data based on general location
      const mockCurrentWeather: WeatherResponse = {
        name: lat > 40 ? 'New York, NY' : lat > 30 ? 'Los Angeles, CA' : 'Miami, FL',
        main: {
          temp: lat > 40 ? 65 : lat > 30 ? 72 : 82,
          humidity: 65
        },
        weather: [{ main: 'Clear', description: 'Clear sky' }],
        wind: { speed: 8 }
      };

      const mockForecast: ForecastResponse = {
        list: [
          { dt: Date.now() / 1000, main: { temp_max: 75, temp_min: 60 }, weather: [{ main: 'Clear' }] },
          { dt: Date.now() / 1000 + 86400, main: { temp_max: 73, temp_min: 58 }, weather: [{ main: 'Clear' }] },
          { dt: Date.now() / 1000 + 172800, main: { temp_max: 69, temp_min: 55 }, weather: [{ main: 'Rain' }] },
          { dt: Date.now() / 1000 + 259200, main: { temp_max: 71, temp_min: 57 }, weather: [{ main: 'Clouds' }] }
        ]
      };

      const processedWeather: WeatherData = {
        location: mockCurrentWeather.name,
        temperature: Math.round(mockCurrentWeather.main.temp),
        condition: mockCurrentWeather.weather[0].description,
        humidity: mockCurrentWeather.main.humidity,
        windSpeed: Math.round(mockCurrentWeather.wind.speed),
        forecast: mockForecast.list.map((item, index) => ({
          day: getDayName(item.dt),
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          icon: getWeatherIcon(item.weather[0].main)
        }))
      };

      setWeather(processedWeather);
      setError(null);
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherData(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Fallback to default location (San Francisco)
        fetchWeatherData(37.7749, -122.4194);
      }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  return { weather, loading, error };
};