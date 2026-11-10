import { formatDate } from "../date.ts";
import type { Memo, Post, SearchEntry } from "./model.ts";

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchIndex(posts: readonly Post[], memos: readonly Memo[]): SearchEntry[] {
  const postEntries: SearchEntry[] = posts.map((post) => ({
    kind: "post",
    title: post.title,
    url: `/posts/${post.slug}/`,
    date: post.date,
    dateLabel: formatDate(post.date),
    tags: post.tags,
    text: plainText(post.html),
  }));

  const memoEntries: SearchEntry[] = memos.map((memo) => ({
    kind: "memo",
    title: formatDate(memo.date),
    url: `/memo/#m-${memo.id}`,
    date: memo.date,
    dateLabel: formatDate(memo.date),
    tags: [],
    text: plainText(memo.html),
  }));

  return [...postEntries, ...memoEntries].toSorted((a, b) => (a.date < b.date ? 1 : -1));
}
