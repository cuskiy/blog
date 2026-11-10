import { layout } from "../components/layout.ts";
import { pagination } from "../components/pagination.ts";
import type { PagePosition } from "../components/pagination.ts";
import { postSection } from "../components/post-list.ts";
import type { Assets } from "../lib/assets.ts";
import { site } from "../lib/config.ts";
import type { Post } from "../lib/content/index.ts";
import { html } from "../lib/html.ts";

export function postsPage(posts: readonly Post[], position: PagePosition, assets: Assets): string {
  return layout({
    assets,
    title: position.page === 1 ? site.title : `文章 · 第 ${position.page} 页`,
    path: position.page === 1 ? "/" : `/page/${position.page}/`,
    heading: "文章",
    body: html`${postSection(posts)}
${pagination({ ...position, base: "/" })}`,
  });
}
