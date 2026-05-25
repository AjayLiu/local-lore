import { LOS_ANGELES_CENTER } from "@/lib/mapbox/default-center";

const GEOLOCATION_TIMEOUT_MS = 8_000;

export type MapCenter = {
  latitude: number;
  longitude: number;
};

/** Default map center before geolocation resolves or if the user declines. */
export function getDefaultMapCenter(): MapCenter {
  return LOS_ANGELES_CENTER;
}

/** Resolves with the user's coordinates only when permission is granted. */
export function tryGetUserMapCenter(): Promise<MapCenter | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (center: MapCenter | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(center);
    };

    const timeoutId = window.setTimeout(() => {
      finish(null);
    }, GEOLOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        finish(null);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );
  });
}
