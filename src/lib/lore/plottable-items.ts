import type { DeepPartial } from "ai";
import type { LoreItem } from "./schema";

export type PlottableLoreItem = DeepPartial<LoreItem> & {
  latitude: number;
  longitude: number;
};

export function isPlottableLoreItem(
  item: DeepPartial<LoreItem> | undefined,
): item is PlottableLoreItem {
  return (
    item != null &&
    typeof item.latitude === "number" &&
    typeof item.longitude === "number"
  );
}

export function getLoreItemKey(item: PlottableLoreItem, index: number): string {
  if (item.pageId != null) {
    return String(item.pageId);
  }

  return `${item.latitude}-${item.longitude}-${item.title ?? index}`;
}

export function getLoreHeadline(item: PlottableLoreItem): string {
  return item.headline ?? item.title ?? "Local story";
}
