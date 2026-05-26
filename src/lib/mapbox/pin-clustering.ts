import type mapboxgl from "mapbox-gl";

/** Below this zoom, nearby pins collapse into count clusters. */
export const LORE_PIN_CLUSTER_MAX_ZOOM = 9;

/** Screen-space radius used to group pins while clustered. */
export const LORE_PIN_CLUSTER_PIXEL_RADIUS = 52;

export type MapPinInput = {
  id: string;
  lngLat: [number, number];
};

export type ClusteredPinDisplay =
  | { kind: "pin"; id: string; lngLat: [number, number] }
  | {
      kind: "cluster";
      id: string;
      lngLat: [number, number];
      count: number;
      memberIds: string[];
    };

export function clusterPinsForMap(
  pins: MapPinInput[],
  map: mapboxgl.Map,
  pixelRadius = LORE_PIN_CLUSTER_PIXEL_RADIUS,
): ClusteredPinDisplay[] {
  if (pins.length === 0) {
    return [];
  }

  const radiusSq = pixelRadius * pixelRadius;

  type Projected = MapPinInput & { point: mapboxgl.Point };

  const projected: Projected[] = pins.map((pin) => ({
    ...pin,
    point: map.project(pin.lngLat),
  }));

  const used = new Set<string>();
  const result: ClusteredPinDisplay[] = [];

  for (const seed of projected) {
    if (used.has(seed.id)) {
      continue;
    }

    const members: Projected[] = [seed];
    used.add(seed.id);

    for (const candidate of projected) {
      if (used.has(candidate.id)) {
        continue;
      }

      const dx = seed.point.x - candidate.point.x;
      const dy = seed.point.y - candidate.point.y;
      if (dx * dx + dy * dy <= radiusSq) {
        members.push(candidate);
        used.add(candidate.id);
      }
    }

    if (members.length === 1) {
      result.push({ kind: "pin", id: seed.id, lngLat: seed.lngLat });
      continue;
    }

    const lng =
      members.reduce((sum, member) => sum + member.lngLat[0], 0) / members.length;
    const lat =
      members.reduce((sum, member) => sum + member.lngLat[1], 0) / members.length;
    const memberIds = members.map((member) => member.id).sort();

    result.push({
      kind: "cluster",
      id: `cluster:${memberIds.join("|")}`,
      lngLat: [lng, lat],
      count: members.length,
      memberIds,
    });
  }

  return result;
}
