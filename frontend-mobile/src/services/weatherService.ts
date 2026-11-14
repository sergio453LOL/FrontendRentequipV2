import { create } from 'axios'
import type { Coordinates } from '../utils/format'

/**
 * Site weather from Open-Meteo (free, no API key). Rain and wind decide whether earthworks, concrete
 * pours or crane lifts can go ahead, so the catalogue shows the forecast for where the user is.
 */
const openMeteo = create({ baseURL: 'https://api.open-meteo.com/v1', timeout: 10_000 })

interface OpenMeteoResponse {
  current: { temperature_2m: number; precipitation: number; weather_code: number; wind_speed_10m: number }
  daily: {
    time: string[]
    precipitation_probability_max: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export interface SiteWeather {
  temperature: number
  windSpeedKmh: number
  /** i18n keys, translated where the card shows them so a language switch applies at once. */
  descriptionKey: ReturnType<typeof describe>
  rainProbabilityToday: number
  rainProbabilityTomorrow: number
  adviceKey: ReturnType<typeof adviceFor>
}

/** WMO weather interpretation codes, grouped. Returns the i18n key of the description. */
function describe(code: number) {
  if (code === 0) return 'weather.clear' as const
  if (code <= 3) return 'weather.partlyCloudy' as const
  if (code <= 48) return 'weather.fog' as const
  if (code <= 57) return 'weather.drizzle' as const
  if (code <= 67) return 'weather.rain' as const
  if (code <= 77) return 'weather.snow' as const
  if (code <= 82) return 'weather.showers' as const
  return 'weather.storm' as const
}

function adviceFor(rainToday: number, rainTomorrow: number, wind: number) {
  if (wind >= 40) return 'weather.adviceWind' as const
  if (rainToday >= 60) return 'weather.adviceRainToday' as const
  if (rainTomorrow >= 60) return 'weather.adviceRainTomorrow' as const
  return 'weather.adviceGood' as const
}

export const weatherService = {
  async forSite({ latitude, longitude }: Coordinates, signal?: AbortSignal): Promise<SiteWeather> {
    const { data } = await openMeteo.get<OpenMeteoResponse>('/forecast', {
      signal,
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
        daily: 'precipitation_probability_max,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: 2,
      },
    })
    const rainToday = data.daily.precipitation_probability_max[0] ?? 0
    const rainTomorrow = data.daily.precipitation_probability_max[1] ?? 0
    return {
      temperature: Math.round(data.current.temperature_2m),
      windSpeedKmh: Math.round(data.current.wind_speed_10m),
      descriptionKey: describe(data.current.weather_code),
      rainProbabilityToday: rainToday,
      rainProbabilityTomorrow: rainTomorrow,
      adviceKey: adviceFor(rainToday, rainTomorrow, data.current.wind_speed_10m),
    }
  },
}
