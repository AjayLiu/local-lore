/** True when publishing to the local `qstash-cli dev` server. */
export function isLocalQStash(): boolean {
  const url = process.env.QSTASH_URL?.trim() ?? "";
  return /localhost|127\.0\.0\.1/.test(url);
}

export function isQStashDevMode(): boolean {
  if (process.env.QSTASH_DEV === "true") {
    return true;
  }
  return isLocalQStash();
}
