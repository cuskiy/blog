import { createHash } from "node:crypto";

const length = 10;

// The same input always yields the same id, and the input cannot be read back out of it.
// A name and a file's bytes both work as input; which one a caller passes is its policy.
export function hashId(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}

export function indexFile(prefix: string): string {
  return `${prefix.replace(/^\//u, "")}index.html`;
}

export interface Route {
  readonly id: string;
  readonly url: string;
  readonly file: string;
}

// A name plus the prefix it lives under become one address. The url and the file it lands
// in are both derived from the id, so the two can never drift apart.
export function route(prefix: string, name: string): Route {
  const id = hashId(name);
  return { id, url: `${prefix}${id}/`, file: indexFile(`${prefix}${id}/`) };
}

// Two names that collide would overwrite each other, so the build refuses to continue.
export function assertDistinct(entries: readonly { readonly name: string; readonly route: Route }[]): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.route.id);
    if (previous !== undefined) {
      throw new Error(`${JSON.stringify(previous)} and ${JSON.stringify(entry.name)} share the id ${entry.route.id}`);
    }
    seen.set(entry.route.id, entry.name);
  }
}
