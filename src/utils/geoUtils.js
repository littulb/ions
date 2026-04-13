export const getAddressFromCoords = async (latLngString) => {
  const [lat, lng] = latLngString.split(',');
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    return data.results[0]?.formatted_address || "Unknown Location";
  } catch (error) {
    console.error("Geocoding error:", error);
    return "Unknown Location";
  }
};
