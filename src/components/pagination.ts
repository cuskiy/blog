import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";

export interface PagePosition {
  readonly page: number;
  readonly total: number;
}

export interface Pagination extends PagePosition {
  readonly base: string;
}

export function pagination({ page, total, base }: Pagination): Html {
  if (total < 2) {
    return html``;
  }

  const href = (number: number): string => (number === 1 ? base : `${base}page/${number}/`);

  return html`  <nav class="page-nav" aria-label="分页">
    ${page > 1 ? html`<a href="${href(page - 1)}" rel="prev">← 较新</a>` : html`<span></span>`}
    <span class="page-now">${page} / ${total}</span>
    ${page < total ? html`<a href="${href(page + 1)}" rel="next">较旧 →</a>` : html`<span></span>`}
  </nav>`;
}
