import { MIN_QUERY_LENGTH, SEARCH_BOX_BASE } from "./constants";
import type { SelectedLocation } from "@/lib/types/location";

export type SearchSuggestion = {
  mapboxId: string;
  label: string;
  placeFormatted?: string;
};

type MapboxSuggestResponse = {
  suggestions?: Array<{
    mapbox_id: string;
    name: string;
    place_formatted?: string;
  }>;
};

type MapboxRetrieveResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number];
    };
    properties?: {
      name?: string;
      full_address?: string;
      place_formatted?: string;
    };
  }>;
};

export function createSessionToken(): string {
  return crypto.randomUUID();
}

function getAccessToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Mapbox access token is missing. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment.",
    );
  }
  return token;
}

export async function fetchSuggestions(
  query: string,
  sessionToken: string,
): Promise<SearchSuggestion[]> {
  if (query.trim().length < MIN_QUERY_LENGTH) {
    return [];
  }

  const accessToken = getAccessToken();
  const params = new URLSearchParams({
    q: query.trim(),
    session_token: sessionToken,
    access_token: accessToken,
    limit: "5",
  });

  const response = await fetch(`${SEARCH_BOX_BASE}/suggest?${params}`);

  if (!response.ok) {
    throw new Error(`Mapbox suggest failed (${response.status})`);
  }

  const data = (await response.json()) as MapboxSuggestResponse;
  const suggestions = data.suggestions ?? [];

  return suggestions.map((item) => ({
    mapboxId: item.mapbox_id,
    label: item.name,
    placeFormatted: item.place_formatted,
  }));
}

export async function retrieveLocation(
  mapboxId: string,
  sessionToken: string,
): Promise<SelectedLocation> {
  const accessToken = getAccessToken();
  const params = new URLSearchParams({
    session_token: sessionToken,
    access_token: accessToken,
  });

  const response = await fetch(
    `${SEARCH_BOX_BASE}/retrieve/${encodeURIComponent(mapboxId)}?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Mapbox retrieve failed (${response.status})`);
  }

  const data = (await response.json()) as MapboxRetrieveResponse;
  const feature = data.features?.[0];

  if (!feature?.geometry?.coordinates) {
    throw new Error("Mapbox retrieve returned no coordinates");
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  const label =
    feature.properties?.name ??
    feature.properties?.place_formatted ??
    feature.properties?.full_address ??
    "Selected location";

  return {
    id: mapboxId,
    label,
    latitude,
    longitude,
  };
}
