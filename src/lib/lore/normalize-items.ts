import type { DeepPartial } from "ai";
import type { LoreItem } from "./schema";

/** Normalize useObject output from `Output.array` (`{ elements }`) or legacy array shape. */
export function normalizeLoreItems(
  value: unknown,
): Array<DeepPartial<LoreItem> | undefined> {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    "elements" in value &&
    Array.isArray((value as { elements: unknown }).elements)
  ) {
    return (value as { elements: Array<DeepPartial<LoreItem> | undefined> })
      .elements;
  }

  return [];
}
