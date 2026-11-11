import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Assets } from "../src/lib/assets.ts";
import { nav, routes } from "../src/lib/config.ts";
import type { Post } from "../src/lib/content/index.ts";
import { formatDate } from "../src/lib/date.ts";
import { route } from "../src/lib/ids.ts";
import { paginate } from "../src/lib/paginate.ts";
import { feed } from "../src/pages/feed.ts";
import { postsPage } from "../src/pages/index.ts";
import { aboutPage } from "../src/pages/about.ts";
import { pagePage } from "../src/pages/page.ts";
import { postPage } from "../src/pages/post.ts";
import { searchPage } from "../src/pages/search.ts";
import { tagIndexPage, tagPage } from "../src/pages/tags.ts";

const assets: Assets = {
  css: "/assets/style.css",
  scripts: {
    music: "/assets/music.js",
    search: "/assets/search.js",
    oneko: "/assets/oneko.js",
    about: "/assets/about.js",
  },
  favicon: "/assets/favicon.ico",
  icons: [{ src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" }],
  art: "/assets/lineart.webp",
  siteAvatar: "/assets/cuskiy.svg",
  avatars: { "sakura.webp": "/assets/a0b1e4f593.webp" },
};

function post(slug: string, title: string): Post {
  return {
    slug,
    route: route(routes.posts, slug),
    title,
    date: "2025-06-12",
    tags: ["CSS"],
    summary: "Summary",
    html: "<p>Body</p>",
  };
}

describe("formatDate", () => {
  it("writes the date the way a diary does", () => {
    assert.equal(formatDate("2025-10-20"), "二〇二五年十月二十日");
    assert.equal(formatDate("2025-12-31"), "二〇二五年十二月三十一日");
  });

  it("keeps single-digit months and days short", () => {
    assert.equal(formatDate("2025-06-12"), "二〇二五年六月十二日");
    assert.equal(formatDate("2025-01-02"), "二〇二五年一月二日");
  });
});

describe("page shell", () => {
  const html = postsPage([post("a", "A")], { page: 1, total: 1 }, assets);

  it("links the stylesheet from the site root", () => {
    assert.match(html, /<link rel="stylesheet" href="\/assets\/style\.css">/);
  });

  it("renders one entry per configured nav item", () => {
    assert.equal((html.match(/<li><a href="[^"]*"/g) ?? []).length, nav.length);
  });

  it("marks the current nav entry", () => {
    assert.match(html, /<a href="\/" aria-current="page">文章<\/a>/);
    assert.match(html, /<a href="\/tags\/">标签<\/a>/);
  });

  it("links posts through the route they were given", () => {
    assert.ok(html.includes(`href="${post("a", "A").route.url}"`));
    assert.match(html, /href="\/about\/"/);
  });

  it("uses the configured footer", () => {
    assert.match(html, /<footer class="site-footer">[\s\S]*?<p>© 2026 Cuskiy<\/p>/);
  });

  it("declares the language", () => {
    assert.match(html, /<html lang="zh-CN">/);
  });
});

describe("postPage", () => {
  it("escapes the title", () => {
    const html = postPage({ post: post("x", "<script>alert(1)</script>"), older: undefined, newer: undefined }, assets);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  });

  it("links the neighbouring posts through their routes", () => {
    const older = post("older", "Older");
    const newer = post("newer", "Newer");
    const html = postPage({ post: post("x", "X"), older, newer }, assets);
    assert.ok(html.includes(`href="${older.route.url}"`));
    assert.ok(html.includes(`href="${newer.route.url}"`));
  });

  it("links the tags of a post through their routes, with nothing percent-encoded", () => {
    const html = postPage(
      { post: { ...post("x", "X"), tags: ["C++", "Web Dev"] }, older: undefined, newer: undefined },
      assets,
    );
    assert.ok(html.includes(`href="${route(routes.tags, "C++").url}"`));
    assert.ok(html.includes(`href="${route(routes.tags, "Web Dev").url}"`));
    assert.doesNotMatch(html, /%2B|%20/u);
  });

  it("omits the prev/next block for a lone post", () => {
    assert.doesNotMatch(postPage({ post: post("x", "X"), older: undefined, newer: undefined }, assets), /post-nav/);
  });
});

describe("tag pages", () => {
  it("marks the tags entry on the index", () => {
    const html = tagIndexPage([{ name: "CSS", route: route(routes.tags, "CSS"), posts: [post("a", "A")] }], assets);
    assert.match(html, /<a href="\/tags\/" aria-current="page">标签<\/a>/);
    assert.ok(html.includes(`href="${route(routes.tags, "CSS").url}"`));
  });

  it("says so when there is no tag at all, instead of an empty list", () => {
    const html = tagIndexPage([], assets);
    assert.match(html, /<p class="empty">还没有标签。<\/p>/);
    assert.doesNotMatch(html, /tag-list/);
  });

  it("keeps the tags entry marked on a tag page", () => {
    const html = tagPage({ name: "CSS", route: route(routes.tags, "CSS"), posts: [post("a", "A")] }, assets);
    assert.match(html, /<a href="\/tags\/" aria-current="page">标签<\/a>/);
  });

  it("links posts from a tag page", () => {
    const html = tagPage({ name: "CSS", route: route(routes.tags, "CSS"), posts: [post("a", "A")] }, assets);
    assert.ok(html.includes(`href="${post("a", "A").route.url}"`));
  });
});

describe("pagePage", () => {
  const page = { slug: "colophon", route: route(routes.pages, "colophon"), title: "Colophon", html: "<p>Body</p>" };

  it("is canonical at the address it was written to", () => {
    const html = pagePage(page, assets);
    assert.ok(html.includes(`<link rel="canonical" href="https://blog.ity.moe${page.route.url}">`));
  });
});

describe("aboutPage", () => {
  const html = aboutPage(assets);

  it("is the contact list, with the title kept for the outline", () => {
    assert.match(html, /<h1 class="visually-hidden">关于<\/h1>/);
    assert.doesNotMatch(html, /class="page-head"/);
    assert.match(html, /<h2 class="section-title">联系方式<\/h2>/);
    assert.match(html, /<script type="module" src="\/assets\/about\.js"><\/script>/);
  });

  it("keeps the encoded addresses out of the markup", () => {
    assert.match(html, /data-encoded="/);
    assert.doesNotMatch(html, /cuskiy@proton\.me/);
    assert.doesNotMatch(html, /yuru:unredacted/);
  });

  it("marks the about entry in the navigation", () => {
    assert.match(html, /<a href="\/about\/" aria-current="page">关于<\/a>/);
  });
});

describe("empty state", () => {
  it("says so instead of rendering an empty list", () => {
    const html = postsPage([], { page: 1, total: 1 }, assets);
    assert.match(html, /<p class="empty">还没有文章。<\/p>/);
    assert.doesNotMatch(html, /post-list/);
  });

  it("renders the list as a real list", () => {
    const html = postsPage([post("a", "A")], { page: 1, total: 1 }, assets);
    assert.match(html, /<ul class="post-list"/);
    assert.match(html, /<li class="post">/);
  });

  it("wraps the heading element, not just its text", () => {
    const html = postsPage([post("a", "A")], { page: 1, total: 1 }, assets);
    assert.match(html, /<li class="post">\s*<article>\s*<a href="[^"]+"><h2>A<\/h2><\/a>/u);
  });
});

describe("search page", () => {
  it("starts with an empty list, so nothing shows before a query", () => {
    const html = searchPage(assets);
    assert.match(html, /<ul class="post-list" data-search-results aria-label="搜索结果"><\/ul>/);
    assert.doesNotMatch(html, /<li class="post"/);
  });

  it("announces the result count, with no second message saying the same thing", () => {
    const html = searchPage(assets);
    assert.match(html, /data-search-count aria-live="polite"/);
    assert.doesNotMatch(html, /还没有文章/);
  });
});

describe("pagination", () => {
  it("splits a list into pages of the given size", () => {
    assert.deepEqual(paginate([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it("keeps one empty page so a bare list still renders", () => {
    assert.deepEqual(paginate([], 20), [[]]);
  });

  it("renders no navigation when everything fits on one page", () => {
    assert.doesNotMatch(postsPage([post("a", "A")], { page: 1, total: 1 }, assets), /page-nav/);
  });

  it("links to the next and previous page, and back to the first", () => {
    const html = postsPage([post("a", "A")], { page: 2, total: 3 }, assets);
    assert.match(html, /<a href="\/" rel="prev">← 较新<\/a>/);
    assert.match(html, /<a href="\/page\/3\/" rel="next">较旧 →<\/a>/);
    assert.match(html, /<span class="page-now">2 \/ 3<\/span>/);
  });
});

describe("accessibility", () => {
  it("gives pages without a visible heading a hidden one", () => {
    assert.match(postsPage([], { page: 1, total: 1 }, assets), /<h1 class="visually-hidden">文章<\/h1>/);
    assert.match(searchPage(assets), /<h1 class="visually-hidden">搜索<\/h1>/);
  });

  it("keeps the list entry marked on a later page of it", () => {
    const html = postsPage([post("a", "A")], { page: 2, total: 3 }, assets);
    assert.match(html, /<a href="\/" aria-current="page">文章<\/a>/);
    assert.ok(html.includes('<link rel="canonical" href="https://blog.ity.moe/page/2/">'));
  });

  it("marks the current page in the navigation", () => {
    assert.match(searchPage(assets), /<a href="\/search\/" aria-current="page">/);
  });
});

describe("feed", () => {
  const xml = feed([post("a", "A & B"), post("b", "B")]);

  it("links every entry absolutely", () => {
    assert.ok(xml.includes(`<link href="https://blog.ity.moe${post("a", "A").route.url}" rel="alternate"/>`));
  });

  it("escapes the title as XML", () => {
    assert.match(xml, /<title>A &amp; B<\/title>/);
  });

  it("carries the body as escaped html", () => {
    assert.match(xml, /<content type="html">&lt;p&gt;Body&lt;\/p&gt;<\/content>/);
  });

  it("stamps entries with RFC 3339 dates", () => {
    assert.match(xml, /<updated>2025-06-12T00:00:00Z<\/updated>/);
  });
});
