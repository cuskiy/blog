import type { Post, Tag } from "./model.ts";

export function collectTags(posts: readonly Post[]): Tag[] {
  const named = posts.flatMap((post) => post.tags.map((name) => ({ name, post })));
  const byName = Object.groupBy(named, (entry) => entry.name);

  const seen = new Map<string, string>();
  for (const name of Object.keys(byName)) {
    const key = name.toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined && previous !== name) {
      throw new Error(`tags differ only by case: ${JSON.stringify(previous)} and ${JSON.stringify(name)}`);
    }
    seen.set(key, name);
  }

  return Object.entries(byName)
    .map(([name, entries]) => ({ name, posts: (entries ?? []).map((entry) => entry.post) }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}
