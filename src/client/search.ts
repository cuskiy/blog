import { tagPath } from "../lib/config.ts";
import type { SearchEntry } from "../lib/content/model.ts";
import { element } from "./dom.ts";

const contextChars = 60;

const form = element<HTMLFormElement>(".search-form");
const input = element<HTMLInputElement>("[data-search]");
const count = element<HTMLElement>("[data-search-count]");
const list = element<HTMLUListElement>("[data-search-results]");

let entries: readonly SearchEntry[] = [];

function markMatches(parent: HTMLElement, text: string, needle: string): void {
  const haystack = text.toLowerCase();
  let from = 0;

  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) {
      parent.append(text.slice(from));
      return;
    }

    const end = at + needle.length;
    if (at > from) {
      parent.append(text.slice(from, at));
    }
    const mark = document.createElement("mark");
    mark.textContent = text.slice(at, end);
    parent.append(mark);
    from = end;
  }
}

function snippet(text: string, needle: string): string {
  const at = text.toLowerCase().indexOf(needle);
  const start = Math.max(0, at - contextChars);
  const end = Math.min(text.length, at + needle.length + contextChars);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function card(entry: SearchEntry, needle: string): HTMLLIElement {
  const isMemo = entry.kind === "memo";
  const item = document.createElement("li");
  item.className = isMemo ? "memo" : "post";

  const link = document.createElement("a");
  link.href = entry.url;

  if (isMemo) {
    const date = document.createElement("p");
    date.className = "memo-date";
    markMatches(date, entry.title, needle);
    link.append(date);
  } else {
    const heading = document.createElement("h2");
    markMatches(heading, entry.title, needle);
    link.append(heading);
  }
  item.append(link);

  if (!isMemo) {
    const meta = document.createElement("p");
    meta.className = "post-meta";
    const time = document.createElement("time");
    time.dateTime = entry.date;
    time.textContent = entry.dateLabel;
    meta.append(time);
    for (const tag of entry.tags) {
      const anchor = document.createElement("a");
      anchor.href = tagPath(tag);
      markMatches(anchor, tag, needle);
      meta.append(anchor);
    }
    item.append(meta);
  }

  if (entry.text.toLowerCase().includes(needle)) {
    const excerpt = document.createElement("p");
    excerpt.className = "post-excerpt";
    markMatches(excerpt, snippet(entry.text, needle), needle);
    item.append(excerpt);
  }

  return item;
}

function searchable(entry: SearchEntry): string {
  return [entry.title, entry.text, ...entry.tags].join(" ").toLowerCase();
}

function filter(query: string): void {
  const needle = query.trim().toLowerCase();
  const hits = needle === "" ? [] : entries.filter((entry) => searchable(entry).includes(needle));

  list.replaceChildren(...hits.map((entry) => card(entry, needle)));
  count.textContent = needle === "" ? "" : `找到 ${hits.length} 条结果`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  filter(input.value);
});

void fetch("/assets/search.json")
  .then((response) => response.json() as Promise<readonly SearchEntry[]>)
  .then((data) => {
    entries = data;
    filter(input.value);
  })
  .catch((error: unknown) => {
    // without the index there is nothing to search, and the count says so
    console.error(error);
    count.textContent = "搜索索引未能加载";
  });
