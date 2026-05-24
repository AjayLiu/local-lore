import { generateText, Output, stepCountIs, streamText } from "ai";
import {
  fetchNearbyWikipediaArticles,
  type WikipediaArticle,
} from "@/lib/wikipedia/geosearch";
import { loreModel } from "./model";
import { loreItemSchema } from "./schema";
import { wikipediaGeosearchTool } from "./tools";

function extractArticlesFromSteps(
  steps: Array<{ toolResults?: Array<{ toolName: string; output: unknown }> }>,
): WikipediaArticle[] {
  for (const step of steps) {
    for (const toolResult of step.toolResults ?? []) {
      if (toolResult.toolName !== "wikipediaGeosearch") {
        continue;
      }

      const output = toolResult.output as { articles?: WikipediaArticle[] };
      if (output.articles?.length) {
        return output.articles;
      }
    }
  }

  return [];
}

export async function runLoreResearch(options: {
  latitude: number;
  longitude: number;
  label: string;
}): Promise<WikipediaArticle[]> {
  const { latitude, longitude, label } = options;

  const result = await generateText({
    model: loreModel,
    tools: { wikipediaGeosearch: wikipediaGeosearchTool },
    stopWhen: stepCountIs(3),
    prompt: `You are researching local history near "${label}" at coordinates (${latitude}, ${longitude}). Call the wikipediaGeosearch tool once with these exact coordinates to fetch nearby Wikipedia articles.`,
  });

  const fromTool = extractArticlesFromSteps(result.steps);
  if (fromTool.length > 0) {
    return fromTool;
  }

  return fetchNearbyWikipediaArticles({ latitude, longitude });
}

export function streamLoreSynthesis(options: {
  label: string;
  articles: WikipediaArticle[];
}) {
  const { label, articles } = options;

  return streamText({
    model: loreModel,
    output: Output.array({ element: loreItemSchema }),
    system: `You are LocalLore, curating fascinating historical and cultural stories from Wikipedia articles near a location.

Rules:
- Select only the 3–8 most interesting articles. Skip mundane entries (generic streets, minor buildings, parking, duplicate topics).
- For each selected article, keep the original pageId, title, latitude, longitude, and wikipediaUrl exactly as provided.
- Write a punchy headline (max 80 characters) and a hook of 2–3 engaging sentences based on the extract.
- Do not invent facts beyond what the extract supports.`,
    prompt: `Location: ${label}

Wikipedia articles (JSON):
${JSON.stringify(articles, null, 2)}`,
  });
}
