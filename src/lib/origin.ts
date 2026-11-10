const originPattern = /^https?:\/\/[^/?#]+$/u;

// The origin is a deployment fact, not source: the build reads it from SITE_URL so a
// preview and the live site can differ without a code change.
export function siteOrigin(): string {
  const value = (process.env.SITE_URL ?? "").trim();
  if (!originPattern.test(value)) {
    throw new Error(`SITE_URL must be an absolute origin such as https://ity.moe, got ${JSON.stringify(value)}`);
  }
  return value;
}
