import { Cloud, Sun, CloudRain, Wind, MapPin, Loader2 } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";

export const WeatherWidget = () => {
  const { weather, loading, error } = useWeather();

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny":
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case "partly-cloudy":
        return <Cloud className="h-8 w-8 text-blue-400" />;
      case "rainy":
        return <CloudRain className="h-8 w-8 text-blue-600" />;
      case "cloudy":
        return <Cloud className="h-8 w-8 text-gray-500" />;
      default:
        return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="widget-card h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-card h-full flex items-center justify-center">
        <div className="text-center">
          <Cloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Weather unavailable</p>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="widget-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Weather</h3>
        <div className="flex items-center gap-1 text-primary">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      {/* Current weather */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-3xl font-bold text-foreground">{weather.temperature}°</p>
          <p className="text-sm text-muted-foreground">{weather.condition}</p>
          <p className="text-xs text-muted-foreground">{weather.location}</p>
        </div>
        <div className="text-right">
          <div className="text-6xl">
            {getWeatherIcon(weather.forecast[0]?.icon || "sunny")}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-accent/30 rounded-lg p-3 text-center">
          <Wind className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Wind</p>
          <p className="text-sm font-medium">{weather.windSpeed} mph</p>
        </div>
        <div className="bg-accent/30 rounded-lg p-3 text-center">
          <div className="w-4 h-4 mx-auto mb-1 bg-blue-400 rounded-full opacity-60" />
          <p className="text-xs text-muted-foreground">Humidity</p>
          <p className="text-sm font-medium">{weather.humidity}%</p>
        </div>
      </div>

      {/* 4-day forecast */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">4-Day Forecast</h4>
        <div className="space-y-2">
          {weather.forecast.map((day, index) => (
            <div 
              key={day.day}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/20 fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3">
                {getWeatherIcon(day.icon)}
                <span className="text-sm font-medium">{day.day}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{day.high}°</span>
                <span className="text-muted-foreground">{day.low}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};