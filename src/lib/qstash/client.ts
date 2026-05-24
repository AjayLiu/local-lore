import { Client } from "@upstash/qstash";
import { getLoreAppUrl } from "@/lib/app-url";
import { isLocalQStash, isQStashDevMode } from "@/lib/qstash/env";

const FLOW_CONTROL_KEY = "local-lore-gemini";

let client: Client | null = null;

function getQStashClient(): Client {
  const token = process.env.QSTASH_TOKEN?.trim();
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }

  const baseUrl = process.env.QSTASH_URL?.trim();

  if (!client) {
    client = new Client({
      token,
      ...(baseUrl ? { baseUrl } : {}),
      devMode: isQStashDevMode(),
    });
  }

  return client;
}

export function isQStashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN?.trim());
}

export async function enqueueLoreJob(jobId: string): Promise<void> {
  const callbackUrl = `${getLoreAppUrl()}/api/cron/process-lore`;

  if (isLocalQStash() && process.env.NODE_ENV === "development") {
    console.info(
      `[LocalLore] Enqueueing job ${jobId} → local QStash → ${callbackUrl}`,
    );
  }

  await getQStashClient().publishJSON({
    url: callbackUrl,
    body: { jobId },
    flowControl: {
      key: FLOW_CONTROL_KEY,
      rate: 15,
      period: "60s",
      parallelism: 5,
    },
  });
}
