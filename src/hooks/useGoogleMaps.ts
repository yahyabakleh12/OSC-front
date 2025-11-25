import { useJsApiLoader } from '@react-google-maps/api'
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
const libraries: ('drawing' | 'places' | 'geometry')[] = ['drawing', 'places', 'geometry']
const LOADER_ID = 'google-map-script'
export const useGoogleMaps = () => {
  return useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    language: 'en',
    region: 'AE',
  })
}