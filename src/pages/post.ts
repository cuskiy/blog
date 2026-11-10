import { layout } from "../components/layout.ts";
import { postMeta } from "../components/post-list.ts";
import type { Assets } from "../lib/assets.ts";
import type { Post } from "../lib/content/index.ts";
import { html, raw } from "../lib/html.ts";

export interface PostPage {
  readonly post: Post;
  readonly older: Post | undefined;
  readonly newer: Post | undefined;
}

export function postPage({ post, older, newer }: PostPage, assets: Assets): string {
  const olderLink = older === undefined ? "" : html`<a href="/posts/${older.slug}/">← 更早：${older.title}</a>`;
  const newerLink = newer === undefined ? "" : html`<a href="/posts/${newer.slug}/">更新：${newer.title} →</a>`;
  const neighbours =
    olderLink === "" && newerLink === ""
      ? ""
      : html`<nav class="page-nav" aria-label="相邻文章">${olderLink}${newerLink}</nav>`;

  return layout({
    assets,
    title: post.title,
    description: post.summary,
    path: `/posts/${post.slug}/`,
    body: html`  <article>
    <header class="page-head">
      <h1>${post.title}</h1>
      ${postMeta(post)}
    </header>
    <div class="prose">${raw(post.html)}</div>
  </article>
  ${neighbours}`,
  });
}
