import type mapboxgl from "mapbox-gl";
import { DEFAULT_MAP_ZOOM } from "@/lib/mapbox/constants";

/** Viewport width at which `DEFAULT_MAP_ZOOM` is used without adjustment. */
export const REFERENCE_VIEWPORT_WIDTH_PX = 1280;

/** Maximum zoom-out applied on very narrow viewports (in zoom levels). */
export const MAX_VIEWPORT_ZOOM_OUT = 2.5;

/**
 * Mapbox zoom is geographic: at the same zoom, a narrow viewport covers less
 * ground, so bbox queries return fewer pins. Zoom out slightly on small screens
 * so the visible area (and pin count) is closer to a desktop viewport.
 */
export function getZoomForViewportWidth(
  viewportWidthPx: number,
  baseZoom: number = DEFAULT_MAP_ZOOM,
): number {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return baseZoom;
  }

  if (viewportWidthPx >= REFERENCE_VIEWPORT_WIDTH_PX) {
    return baseZoom;
  }

  const ratio = Math.max(
    viewportWidthPx / REFERENCE_VIEWPORT_WIDTH_PX,
    0.2,
  );
  const offset = Math.max(Math.log2(ratio), -MAX_VIEWPORT_ZOOM_OUT);
  return baseZoom + offset;
}

export function getZoomForMap(
  map: mapboxgl.Map,
  baseZoom: number = DEFAULT_MAP_ZOOM,
): number {
  return getZoomForViewportWidth(map.getContainer().clientWidth, baseZoom);
}
