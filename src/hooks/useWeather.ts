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

// Using OpenWeather APIs:
// - Current: https://api.openweathermap.org/data/2.5/weather
// - Forecast (5 day / 3 hour): https://api.openweathermap.org/data/2.5/forecast
// - Geocoding: https://api.openweathermap.org/geo/1.0/

type Unit = 'c' | 'f'

type CityCoords = { lat: number; lon: number; display: string }
const FALLBACK_CITY: CityCoords = { lat: 37.7749, lon: -122.4194, display: 'San Francisco, CA' }

export const useWeather = (unit: Unit = 'c', city?: string) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const iconFromOwMain = (main: string): string => {
    switch (main.toLowerCase()) {
      case 'clear': return 'sunny'
      case 'clouds': return 'partly-cloudy'
      case 'rain':
      case 'drizzle':
      case 'thunderstorm': return 'rainy'
      case 'snow': return 'cloudy'
      default: return 'cloudy'
    }
  }

  const getDayName = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const fetchWeatherData = async (lat: number, lon: number, locationName?: string) => {
    try {
      const key = import.meta.env.VITE_OPEN_WEATHER_API_KEY
      if (!key) throw new Error('Missing VITE_OPEN_WEATHER_API_KEY')
      const units = unit === 'c' ? 'metric' : 'imperial'

      const currentUrl = new URL('https://api.openweathermap.org/data/2.5/weather')
      currentUrl.searchParams.set('lat', String(lat))
      currentUrl.searchParams.set('lon', String(lon))
      currentUrl.searchParams.set('appid', key)
      currentUrl.searchParams.set('units', units)

      const forecastUrl = new URL('https://api.openweathermap.org/data/2.5/forecast')
      forecastUrl.searchParams.set('lat', String(lat))
      forecastUrl.searchParams.set('lon', String(lon))
      forecastUrl.searchParams.set('appid', key)
      forecastUrl.searchParams.set('units', units)

      const [curRes, fcRes] = await Promise.all([
        fetch(currentUrl.toString()),
        fetch(forecastUrl.toString())
      ])
      if (!curRes.ok) throw new Error(`Current weather failed: ${curRes.status}`)
      if (!fcRes.ok) throw new Error(`Forecast failed: ${fcRes.status}`)
      const cur = await curRes.json()
      const fc = await fcRes.json()

      const display = locationName || [cur.name, cur.sys?.country].filter(Boolean).join(', ')
      const nowTemp = Math.round(cur.main?.temp ?? 0)
      const nowHum = Math.round(cur.main?.humidity ?? 0)
      const nowWind = Math.round(cur.wind?.speed ?? 0)
      const nowIcon = iconFromOwMain(cur.weather?.[0]?.main || 'Clouds')

      // Build 4-day forecast by grouping 3-hour entries per day
      const byDay: Record<string, { high: number; low: number; icon: string; ts: number }> = {}
      for (const item of fc.list as Array<any>) {
        const ts = item.dt
        const day = new Date(ts * 1000).toDateString()
        const high = Math.round(item.main?.temp_max ?? item.main?.temp ?? 0)
        const low = Math.round(item.main?.temp_min ?? item.main?.temp ?? 0)
        const icon = iconFromOwMain(item.weather?.[0]?.main || 'Clouds')
        if (!byDay[day]) byDay[day] = { high, low, icon, ts }
        else {
          byDay[day].high = Math.max(byDay[day].high, high)
          byDay[day].low = Math.min(byDay[day].low, low)
          // prefer rainy if any period is rainy
          if (icon === 'rainy') byDay[day].icon = 'rainy'
        }
      }
      const daysSorted = Object.values(byDay).sort((a,b)=>a.ts-b.ts).slice(0,4)
      const days = daysSorted.map(d => ({
        day: getDayName(Math.floor(new Date(new Date(d.ts*1000).toDateString()).getTime()/1000)),
        high: d.high,
        low: d.low,
        icon: d.icon
      }))

      const processed: WeatherData = {
        location: display,
        temperature: nowTemp,
        condition: cur.weather?.[0]?.description || 'Clouds',
        humidity: nowHum,
        windSpeed: nowWind,
        forecast: days
      }

      setWeather(processed)
      setError(null)
    } catch (err) {
      setError('Failed to fetch weather data')
      console.error('Weather fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const geocodeCity = async (name: string): Promise<CityCoords | null> => {
    try {
      const key = import.meta.env.VITE_OPEN_WEATHER_API_KEY
      if (!key) return null
      const url = new URL('https://api.openweathermap.org/geo/1.0/direct')
      url.searchParams.set('q', name)
      url.searchParams.set('limit', '1')
      url.searchParams.set('appid', key)
      const res = await fetch(url.toString())
      if (!res.ok) return null
      const arr = await res.json()
      const g = arr?.[0]
      if (!g) return null
      const display = [g.name, g.state, g.country].filter(Boolean).join(', ')
      return { lat: g.lat, lon: g.lon, display }
    } catch {
      return null
    }
  }

  const getUserLocation = async () => {
    const override = (city || '').trim()
    if (override) {
      const hit = await geocodeCity(override)
      if (hit) return fetchWeatherData(hit.lat, hit.lon, hit.display)
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    const options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherData(pos.coords.latitude, pos.coords.longitude)
          resolve()
        },
        (err) => {
          console.error('Geolocation error:', err)
          // Fallback to a known valid location
          fetchWeatherData(FALLBACK_CITY.lat, FALLBACK_CITY.lon, FALLBACK_CITY.display)
          resolve()
        },
        options
      )
    })
  }

  const refresh = () => {
    setLoading(true)
    getUserLocation()
  }

  useEffect(() => {
    refresh()
    // re-fetch when unit or city changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, city]);

  return { weather, loading, error, refresh };
};