import { MIN_QUERY_LENGTH, PHOTON_API_BASE } from "./constants";
import type { SelectedLocation } from "@/lib/types/location";

export type SearchSuggestion = {
  id: string;
  label: string;
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

  return features.map((feature, index) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const properties = feature.properties;

    return {
      id: buildSuggestionId(feature, index),
      label: buildLabel(properties),
      placeFormatted: buildPlaceFormatted(properties),
      latitude,
      longitude,
    };
  });
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
