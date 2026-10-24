import { GeolocationErrorResult, GeolocationPositionResult } from "@/types/station";

export interface GeolocationState {
  coords: GeolocationPositionResult | null;
  error: GeolocationErrorResult | null;
  loading: boolean;
}

export const LOCATION_DISABLED_MESSAGE =
  "Location access is disabled. Search for a city, PIN code, or area to find charging stations.";

/**
 * Safely requests current position from browser Geolocation API with comprehensive error handling.
 */
export function getCurrentBrowserLocation(): Promise<GeolocationPositionResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
      return reject({
        code: 0,
        message: "Geolocation is not supported by your browser environment.",
        userFriendlyMessage:
          "Geolocation is not supported in this browser. Please use manual search.",
      } as GeolocationErrorResult);
    }

    // Check for insecure context (Geolocation requires HTTPS or localhost)
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      console.warn("Geolocation API requires a secure HTTPS connection or localhost.");
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute cache
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let userFriendly = "Could not retrieve your location. Please use manual search.";

        switch (err.code) {
          case err.PERMISSION_DENIED:
            userFriendly = LOCATION_DISABLED_MESSAGE;
            break;
          case err.POSITION_UNAVAILABLE:
            userFriendly =
              "Your location is currently unavailable. Please verify device GPS or search manually.";
            break;
          case err.TIMEOUT:
            userFriendly =
              "Location request timed out. Please try again or search by city name.";
            break;
        }

        reject({
          code: err.code,
          message: err.message,
          userFriendlyMessage: userFriendly,
        } as GeolocationErrorResult);
      },
      options
    );
  });
}
