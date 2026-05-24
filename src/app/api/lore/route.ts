import { runLoreResearch, streamLoreSynthesis } from "@/lib/lore/agent";
import { loreRequestSchema } from "@/lib/lore/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { latitude, longitude, label } = parsed.data;

  let articles;
  try {
    articles = await runLoreResearch({ latitude, longitude, label });
  } catch (error) {
    console.error("Lore research failed:", error);
    return Response.json(
      { error: "Failed to fetch Wikipedia articles" },
      { status: 502 },
    );
  }

  if (articles.length === 0) {
    return Response.json(
      { error: "No nearby Wikipedia articles found" },
      { status: 404 },
    );
  }

  try {
    const result = streamLoreSynthesis({ label, articles });

    // TODO(M2): persist lore to Supabase on finish

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Lore synthesis failed:", error);
    return Response.json(
      { error: "Failed to generate lore" },
      { status: 500 },
    );
  }
}
