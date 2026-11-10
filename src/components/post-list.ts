import { tagPath } from "../lib/config.ts";
import type { Post } from "../lib/content/index.ts";
import { formatDate } from "../lib/date.ts";
import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";

export function postMeta(post: Post): Html {
  return html`<p class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time>${post.tags.map(
    (tag) => html`<a href="${tagPath(tag)}">${tag}</a>`,
  )}</p>`;
}

function postCard(post: Post): Html {
  return html`    <li class="post">
      <a href="/posts/${post.slug}/"><h2>${post.title}</h2></a>
      ${postMeta(post)}
      <p class="post-excerpt">${post.summary}</p>
    </li>`;
}

export function postSection(posts: readonly Post[]): Html {
  if (posts.length === 0) {
    return html`  <p class="empty">还没有文章。</p>`;
  }

  return html`  <p class="post-count">共 ${posts.length} 篇文章</p>
  <ul class="post-list" aria-label="文章列表">
${posts.map((post) => postCard(post))}
  </ul>`;
}
