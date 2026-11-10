import { layout } from "../components/layout.ts";
import { pagination } from "../components/pagination.ts";
import type { PagePosition } from "../components/pagination.ts";
import type { Assets } from "../lib/assets.ts";
import type { Memo } from "../lib/content/index.ts";
import { formatDate } from "../lib/date.ts";
import { html, raw } from "../lib/html.ts";

export function memoPage(memos: readonly Memo[], position: PagePosition, assets: Assets): string {
  const items = memos.map(
    (memo) => html`    <li class="memo" id="m-${memo.id}">
      <p class="memo-date"><time datetime="${memo.date}">${formatDate(memo.date)}</time></p>
      <div class="prose">
${raw(memo.html)}
      </div>
    </li>`,
  );

  const body =
    memos.length === 0
      ? html`  <p class="empty">还没有随笔。</p>`
      : html`  <p class="post-count">共 ${memos.length} 条随笔</p>
  <ul class="memo-list">
${items}
  </ul>
${pagination({ ...position, base: "/memo/" })}`;

  return layout({
    assets,
    title: position.page === 1 ? "随笔" : `随笔 · 第 ${position.page} 页`,
    path: position.page === 1 ? "/memo/" : `/memo/page/${position.page}/`,
    heading: "随笔",
    body,
  });
}
