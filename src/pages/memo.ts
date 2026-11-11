import { layout } from "../components/layout.ts";
import { pagination, pageUrl } from "../components/pagination.ts";
import type { PagePosition } from "../components/pagination.ts";
import type { Assets } from "../lib/assets.ts";
import { routes } from "../lib/config.ts";
import type { Memo } from "../lib/content/index.ts";
import { formatDate } from "../lib/date.ts";
import { html, raw } from "../lib/html.ts";

export function memoPage(memos: readonly Memo[], position: PagePosition, assets: Assets): string {
  const items = memos.map(
    (memo) => html`    <li class="memo" id="${memo.anchor}">
      <article>
        <p class="memo-date"><time datetime="${memo.date}">${formatDate(memo.date)}</time></p>
        <div class="prose">
${raw(memo.html)}
        </div>
      </article>
    </li>`,
  );

  const body =
    memos.length === 0
      ? html`  <p class="empty">还没有随笔。</p>`
      : html`  <p class="post-count">共 ${memos.length} 条随笔</p>
  <ul class="memo-list">
${items}
  </ul>
${pagination({ ...position, base: routes.memos })}`;

  return layout({
    assets,
    title: position.page === 1 ? "随笔" : `随笔 · 第 ${position.page} 页`,
    path: pageUrl(routes.memos, position.page),
    nav: routes.memos,
    heading: "随笔",
    body,
  });
}
