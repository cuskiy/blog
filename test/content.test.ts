import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectTags, loadPages, loadPosts } from "../src/lib/content/index.ts";

function source(options: { title: string; date: string; tags: string; draft?: boolean }): string {
  return `---
title: ${options.title}
date: ${options.date}
tags: ${options.tags}
summary: ${options.title} summary
draft: ${options.draft === true ? "true" : "false"}
---

## Body
`;
}

async function makeDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "blog-content-"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

describe("loadPosts", () => {
  let dir = "";

  before(async () => {
    dir = await makeDir({
      "older.dj": source({ title: "Older", date: "2025-01-02", tags: "CSS" }),
      "newer.dj": source({ title: "Newer", date: "2025-03-04", tags: "CSS, Layout" }),
      "hidden.dj": source({ title: "Hidden", date: "2025-05-06", tags: "CSS", draft: true }),
      "notes.txt": "not a post",
    });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("sorts newest first and skips drafts and other files", async () => {
    const posts = await loadPosts(dir);
    assert.deepEqual(
      posts.map((post) => post.slug),
      ["newer", "older"],
    );
  });

  it("renders the body as HTML", async () => {
    const [post] = await loadPosts(dir);
    assert.match(post?.html ?? "", /<h2/);
  });

  it("rejects a file name that is not a slug", async () => {
    const other = await makeDir({ "Bad_Name.dj": source({ title: "x", date: "2025-01-01", tags: "CSS" }) });
    await assert.rejects(() => loadPosts(other), /lowercase letters, digits and dashes/);
    await rm(other, { recursive: true, force: true });
  });
});

describe("loadPages", () => {
  it("takes the route from the file name", async () => {
    const dir = await makeDir({
      "colophon.dj": "---\ntitle: Colophon\n---\n\nBody\n",
    });
    assert.deepEqual(
      (await loadPages(dir)).map((page) => [page.slug, page.title]),
      [["colophon", "Colophon"]],
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("treats a directory that is not there as a site with no extra pages", async () => {
    assert.deepEqual(await loadPages(join(tmpdir(), "blog-no-such-pages-directory")), []);
  });
});

describe("collectTags", () => {
  it("counts posts per tag", async () => {
    const dir = await makeDir({
      "a.dj": source({ title: "A", date: "2025-01-01", tags: "CSS, Layout" }),
      "b.dj": source({ title: "B", date: "2025-01-02", tags: "CSS" }),
    });
    assert.deepEqual(
      collectTags(await loadPosts(dir)).map((tag) => [tag.name, tag.posts.length]),
      [
        ["CSS", 2],
        ["Layout", 1],
      ],
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("rejects tags that differ only by case", async () => {
    const dir = await makeDir({
      "a.dj": source({ title: "A", date: "2025-01-01", tags: "CSS" }),
      "b.dj": source({ title: "B", date: "2025-01-02", tags: "css" }),
    });
    const posts = await loadPosts(dir);
    assert.throws(() => collectTags(posts), /differ only by case/);
    await rm(dir, { recursive: true, force: true });
  });
});
