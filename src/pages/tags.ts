import { layout } from "../components/layout.ts";
import { postSection } from "../components/post-list.ts";
import type { Assets } from "../lib/assets.ts";
import { routes } from "../lib/config.ts";
import type { Tag } from "../lib/content/index.ts";
import { html } from "../lib/html.ts";

export function tagIndexPage(tags: readonly Tag[], assets: Assets): string {
  const items = tags.map(
    (tag) =>
      html`    <li><a href="${tag.route.url}">${tag.name}<span class="count">${tag.posts.length}</span></a></li>`,
  );

  return layout({
    assets,
    title: "标签",
    path: routes.tags,
    nav: routes.tags,
    heading: "标签",
    body:
      tags.length === 0
        ? html`  <p class="empty">还没有标签。</p>`
        : html`  <p class="post-count">共 ${tags.length} 个标签</p>
  <ul class="tag-list">
${items}
  </ul>`,
  });
}

export function tagPage(tag: Tag, assets: Assets): string {
  return layout({
    assets,
    title: tag.name,
    path: tag.route.url,
    nav: routes.tags,
    heading: tag.name,
    body: postSection(tag.posts),
  });
}
