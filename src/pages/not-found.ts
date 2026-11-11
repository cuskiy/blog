import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import { html } from "../lib/html.ts";

export function notFoundPage(assets: Assets): string {
  return layout({
    assets,
    title: "404",
    path: "/404/",
    body: html`  <div class="prose">
    <h1>404</h1>
    <p>页面不存在。</p>
    <p><a href="/">返回首页</a></p>
  </div>`,
    script: assets.scripts.oneko,
    // an error page has nothing canonical about it
    canonical: false,
  });
}
