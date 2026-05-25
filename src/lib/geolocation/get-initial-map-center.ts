import { LOS_ANGELES_CENTER } from "@/lib/mapbox/default-center";

const GEOLOCATION_TIMEOUT_MS = 8_000;

export type MapCenter = {
  latitude: number;
  longitude: number;
};

export function getInitialMapCenter(): Promise<MapCenter> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(LOS_ANGELES_CENTER);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(LOS_ANGELES_CENTER);
    }, GEOLOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        window.clearTimeout(timeoutId);
        resolve(LOS_ANGELES_CENTER);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}
