import { tool } from "ai";
import { z } from "zod";
import { fetchNearbyWikipediaArticles } from "@/lib/wikipedia/geosearch";

export const wikipediaGeosearchTool = tool({
  description:
    "Fetch geotagged Wikipedia articles near coordinates with introductory text summaries.",
  inputSchema: z.object({
    latitude: z.number().describe("Latitude of the search center"),
    longitude: z.number().describe("Longitude of the search center"),
    radiusMeters: z
      .number()
      .optional()
      .describe("Search radius in meters (default 2000)"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of articles to return (default 20)"),
  }),
  execute: async ({ latitude, longitude, radiusMeters, limit }) => {
    const articles = await fetchNearbyWikipediaArticles({
      latitude,
      longitude,
      radiusMeters,
      limit,
    });
    return { articles };
  },
});
