import { site } from "../lib/config.ts";
import type { Post } from "../lib/content/index.ts";
import { html } from "../lib/html.ts";
import { siteOrigin } from "../lib/origin.ts";

// Atom wants an updated stamp even when the feed carries no entries at all
const epoch = "1970-01-01";

export function feed(posts: readonly Post[]): string {
  const origin = siteOrigin();

  function absolute(path: string): string {
    return `${origin}${path}`;
  }

  function stamp(iso: string): string {
    return `${iso}T00:00:00Z`;
  }

  const entries = posts.map((post) => {
    const link = absolute(`/posts/${post.slug}/`);
    return html`  <entry>
    <title>${post.title}</title>
    <link href="${link}" rel="alternate"/>
    <id>${link}</id>
    <published>${stamp(post.date)}</published>
    <updated>${stamp(post.date)}</updated>
    <summary>${post.summary}</summary>
    <content type="html">${post.html}</content>
  </entry>`;
  });

  return html`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${site.title}</title>
  <subtitle>${site.motto}</subtitle>
  <link href="${absolute("/")}" rel="alternate"/>
  <link href="${absolute("/feed.xml")}" rel="self"/>
  <id>${absolute("/")}</id>
  <updated>${stamp(posts[0]?.date ?? epoch)}</updated>
${entries}
</feed>
`.value;
}
