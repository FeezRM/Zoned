import { Cloud, Sun, CloudRain, Wind, MapPin, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useWeather } from "@/hooks/useWeather";
import useProfile from "@/lib/useProfile";
import { upsertProfile } from "@/lib/profiles";

export const WeatherWidget = () => {
  const { profile, refresh: refreshProfile } = useProfile()
  const [unit, setUnit] = useState<'c'|'f'>('c')
  const [initialized, setInitialized] = useState(false)
  const { weather, loading, error, refresh } = useWeather(unit);

  useEffect(() => {
    if (profile && !initialized) {
      const prefUnit = (profile.preferences?.weather_unit ?? 'c') as 'c'|'f'
      setUnit(prefUnit)
      setInitialized(true)
    }
  }, [profile, initialized])

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
          <div className="mt-2">
            <button className="btn-liquid text-xs px-3 py-1" onClick={refresh}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="widget-card h-full container-safe p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Weather</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`px-2 py-1 text-xs rounded-md btn-liquid ${unit==='c' ? 'text-foreground' : 'text-muted-foreground'}`}
              onClick={async ()=> {
                setUnit('c')
                if (profile) {
                  await upsertProfile({ id: profile.id, preferences: { ...(profile.preferences||{}), weather_unit: 'c' } })
                  refreshProfile()
                }
              }}
            >°C</button>
            <button
              className={`px-2 py-1 text-xs rounded-md btn-liquid ${unit==='f' ? 'text-foreground' : 'text-muted-foreground'}`}
              onClick={async ()=> {
                setUnit('f')
                if (profile) {
                  await upsertProfile({ id: profile.id, preferences: { ...(profile.preferences||{}), weather_unit: 'f' } })
                  refreshProfile()
                }
              }}
            >°F</button>
          </div>
        </div>
      </div>

  {/* Location is derived from geolocation only; no manual entry */}

      {/* Current weather */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-3xl font-bold text-foreground">{weather.temperature}°</p>
          <p className="text-sm text-muted-foreground text-break-safe">{weather.condition}</p>
          <p className="text-xs text-muted-foreground text-overflow-safe">{weather.location}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-6xl">
            {getWeatherIcon(weather.forecast[0]?.icon || "sunny")}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="liquid-surface liquid-border rounded-lg p-3 text-center liquid-highlight">
          <Wind className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Wind</p>
          <p className="text-sm font-medium">{weather.windSpeed} {unit==='f' ? 'mph' : 'km/h'}</p>
        </div>
        <div className="liquid-surface liquid-border rounded-lg p-3 text-center liquid-highlight">
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
              className="flex items-center justify-between py-2 px-3 rounded-lg liquid-surface liquid-border widget-interactive fade-in-liquid"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getWeatherIcon(day.icon)}
                <span className="text-sm font-medium text-overflow-safe">{day.day}</span>
              </div>
              <div className="flex items-center gap-2 text-sm flex-shrink-0">
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