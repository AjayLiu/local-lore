import { Receiver } from "@upstash/qstash";
import { getLoreAppUrl } from "@/lib/app-url";
import { isQStashDevMode } from "@/lib/qstash/env";

export async function verifyQStashRequest(
  req: Request,
  body: string,
): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();

  if (!currentSigningKey || !nextSigningKey) {
    throw new Error(
      "QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY must be configured",
    );
  }

  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
    devMode: isQStashDevMode(),
  });
  const url = `${getLoreAppUrl()}/api/cron/process-lore`;

  return receiver.verify({ body, signature, url });
}
