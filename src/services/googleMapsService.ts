export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyACaO4D9-cgPFKJtWjAkGs75sfb9i5Tb4M';

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

/**
 * Perform reverse geocoding via Google Maps Geocoding API with fallback
 */
export async function googleReverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=ar`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Find the most relevant village/sublocality/locality component
      const result = data.results[0];
      const components = result.address_components || [];
      
      let village = '';
      let sublocality = '';
      let locality = '';

      for (const comp of components) {
        if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1') || comp.types.includes('neighborhood')) {
          sublocality = comp.long_name;
        } else if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
          locality = comp.long_name;
        } else if (comp.types.includes('administrative_area_level_3') || comp.types.includes('village')) {
          village = comp.long_name;
        }
      }

      const bestName = village || sublocality || locality || result.formatted_address?.split(',')[0];
      return bestName || null;
    }
  } catch (e) {
    console.warn('Google Maps reverse geocoding error:', e);
  }
  return null;
}

/**
 * Search location using Google Geocoding API with fallback
 */
export async function googleSearchAddress(query: string): Promise<GooglePlaceResult[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&key=${GOOGLE_MAPS_API_KEY}&language=ar`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === 'OK' && data.results) {
      return data.results.map((r: any) => ({
        placeId: r.place_id,
        name: r.formatted_address?.split(',')[0] || query,
        formattedAddress: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      }));
    }
  } catch (e) {
    console.warn('Google Maps search address error:', e);
  }
  return [];
}
