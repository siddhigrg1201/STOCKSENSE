import axios from 'axios';
import { FallbackHandler } from './fallbackHandler';

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  source: string;
  timestamp: string;
}

export const apiService = {
  async getWeather(lat: number, lon: number, forceCache: boolean = false) {
    return FallbackHandler.execute<WeatherData>([
      {
        name: 'Open-Meteo',
        fetch: () => axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`),
        normalize: (res) => ({
          temperature: res.data.current.temperature_2m,
          humidity: res.data.current.relative_humidity_2m,
          condition: `Code ${res.data.current.weather_code}`,
          source: 'Open-Meteo',
          timestamp: new Date().toISOString()
        })
      },
      {
        name: 'wttr.in',
        fetch: () => axios.get(`https://wttr.in/${lat},${lon}?format=j1`),
        normalize: (res) => ({
          temperature: parseInt(res.data.current_condition[0].temp_C),
          humidity: parseInt(res.data.current_condition[0].humidity),
          condition: res.data.current_condition[0].weatherDesc[0].value,
          source: 'wttr.in',
          timestamp: new Date().toISOString()
        })
      }
    ], {
      cacheKey: `weather_${lat}_${lon}`,
      cacheTtlMs: 5 * 60 * 1000, // 5 minutes
      timeoutMs: 3000, // 3 seconds timeout
      forceCache
    });
  }
};
