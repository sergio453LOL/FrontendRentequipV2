export interface City {
  name: string
  latitude: number
  longitude: number
}

/**
 * Peruvian cities with the coordinates of their main square, used as default company locations and as the
 * catalogue's city filter: Lima first, then the rest alphabetically. Every city with machines is here.
 */
export const PERU_CITIES: readonly City[] = [
  { name: 'Lima', latitude: -12.04637, longitude: -77.04279 },
  { name: 'Arequipa', latitude: -16.39889, longitude: -71.535 },
  { name: 'Ayacucho', latitude: -13.15878, longitude: -74.22321 },
  { name: 'Cajamarca', latitude: -7.16378, longitude: -78.50027 },
  { name: 'Callao', latitude: -12.05659, longitude: -77.11814 },
  { name: 'Chiclayo', latitude: -6.77137, longitude: -79.84088 },
  { name: 'Chimbote', latitude: -9.07508, longitude: -78.59373 },
  { name: 'Cusco', latitude: -13.53195, longitude: -71.96746 },
  { name: 'Huancayo', latitude: -12.06513, longitude: -75.20486 },
  { name: 'Huaraz', latitude: -9.52779, longitude: -77.52778 },
  { name: 'Ica', latitude: -14.06777, longitude: -75.72861 },
  { name: 'Iquitos', latitude: -3.74912, longitude: -73.25383 },
  { name: 'Piura', latitude: -5.19449, longitude: -80.63282 },
  { name: 'Pucallpa', latitude: -8.37915, longitude: -74.55387 },
  { name: 'Puno', latitude: -15.84022, longitude: -70.02188 },
  { name: 'Tacna', latitude: -18.01465, longitude: -70.25362 },
  { name: 'Trujillo', latitude: -8.11599, longitude: -79.02998 },
]

export function findCity(name: string): City | undefined {
  return PERU_CITIES.find((city) => city.name === name)
}
