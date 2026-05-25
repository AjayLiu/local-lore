import { MIN_QUERY_LENGTH, PHOTON_API_BASE } from "./constants";
import type { SelectedLocation } from "@/lib/types/location";

export type SearchSuggestion = {
  id: string;
  label: string;
  /** City or locality name for map-center / search CTAs */
  areaLabel: string;
  placeFormatted?: string;
  latitude: number;
  longitude: number;
};

type PhotonProperties = {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
};

type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: PhotonProperties;
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function buildSuggestionId(feature: PhotonFeature, index: number): string {
  const { osm_type, osm_id } = feature.properties;
  if (osm_type && osm_id != null) {
    return `${osm_type}:${osm_id}`;
  }
  const [longitude, latitude] = feature.geometry.coordinates;
  return `coord:${latitude},${longitude}:${index}`;
}

function buildLabel(properties: PhotonProperties): string {
  if (properties.name) {
    return properties.name;
  }
  if (properties.city) {
    return properties.city;
  }
  if (properties.street) {
    return properties.housenumber
      ? `${properties.street} ${properties.housenumber}`
      : properties.street;
  }
  return properties.country ?? "Unknown place";
}

/** Locality-focused label (city, district) for map center and search buttons */
function buildAreaLabel(properties: PhotonProperties): string {
  return (
    properties.city ??
    properties.district ??
    properties.name ??
    properties.state ??
    properties.country ??
    "Unknown place"
  );
}

function buildPlaceFormatted(properties: PhotonProperties): string | undefined {
  const name = properties.name;
  const streetLine =
    properties.street && properties.housenumber
      ? `${properties.street} ${properties.housenumber}`
      : properties.street;

  const parts = [
    streetLine && streetLine !== name ? streetLine : undefined,
    properties.postcode,
    properties.district && properties.district !== name
      ? properties.district
      : undefined,
    properties.city && properties.city !== name ? properties.city : undefined,
    properties.state,
    properties.country,
  ].filter((part): part is string => Boolean(part));

  const unique = [...new Set(parts)];
  if (unique.length === 0) {
    return undefined;
  }

  const formatted = unique.join(", ");
  return formatted === name ? undefined : formatted;
}

export async function fetchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (query.trim().length < MIN_QUERY_LENGTH) {
    return [];
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: "5",
    lang: "en",
  });

  const response = await fetch(`${PHOTON_API_BASE}?${params}`);

  if (!response.ok) {
    throw new Error(`Location search failed (${response.status})`);
  }

  const data = (await response.json()) as PhotonResponse;
  const features = data.features ?? [];

  return features.map((feature, index) => featureToSuggestion(feature, index));
}

export function suggestionToLocation(
  suggestion: SearchSuggestion,
): SelectedLocation {
  return {
    id: suggestion.id,
    label: suggestion.label,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}

function featureToSuggestion(
  feature: PhotonFeature,
  index: number,
): SearchSuggestion {
  const [longitude, latitude] = feature.geometry.coordinates;
  const properties = feature.properties;

  return {
    id: buildSuggestionId(feature, index),
    label: buildLabel(properties),
    areaLabel: buildAreaLabel(properties),
    placeFormatted: buildPlaceFormatted(properties),
    latitude,
    longitude,
  };
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<SearchSuggestion | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    limit: "1",
    lang: "en",
  });

  const reverseBase = PHOTON_API_BASE.replace(/\/api\/?$/, "/reverse");
  const response = await fetch(`${reverseBase}?${params}`);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PhotonResponse;
  const feature = data.features?.[0];
  if (!feature) {
    return null;
  }

  return featureToSuggestion(feature, 0);
}

function formatCoordinateLabel(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export function locationFromCoordinates(
  lat: number,
  lon: number,
  label?: string,
): SelectedLocation {
  return {
    id: `scan:${lat.toFixed(5)},${lon.toFixed(5)}:${Date.now()}`,
    label: label ?? formatCoordinateLabel(lat, lon),
    latitude: lat,
    longitude: lon,
  };
}

export async function locationFromMapCenter(
  lat: number,
  lon: number,
): Promise<SelectedLocation> {
  const suggestion = await reverseGeocode(lat, lon);
  const label =
    suggestion?.areaLabel ??
    suggestion?.label ??
    formatCoordinateLabel(lat, lon);
  return locationFromCoordinates(lat, lon, label);
}

const CENTER_LABEL_MOVE_THRESHOLD_DEG = 0.001;

export function mapCenterMovedEnough(
  prev: { latitude: number; longitude: number },
  next: { latitude: number; longitude: number },
): boolean {
  return (
    Math.abs(prev.latitude - next.latitude) > CENTER_LABEL_MOVE_THRESHOLD_DEG ||
    Math.abs(prev.longitude - next.longitude) >
      CENTER_LABEL_MOVE_THRESHOLD_DEG
  );
}
