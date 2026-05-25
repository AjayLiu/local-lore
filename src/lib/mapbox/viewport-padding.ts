/** Padding when easing to a pin; card sits above the pin in map space. */
export const LORE_CARD_MAP_PADDING = {
  top: 280,
  bottom: 200,
  left: 48,
  right: 48,
} as const;

/** Mapbox marker offset (px) — lifts card above the pin label. */
export const LORE_CARD_MARKER_OFFSET: [number, number] = [0, -48];

/**
 * Shifts the pin below the map viewport center (px) so the card above fits on screen.
 * Positive Y moves the target down on screen.
 */
export const LORE_CARD_CENTER_OFFSET: [number, number] = [0, 120];
