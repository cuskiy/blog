import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readPostMeta, splitFrontmatter } from "../src/lib/frontmatter.ts";

const file = "post.dj";

function meta(source: string) {
  return readPostMeta(splitFrontmatter(source, file).fields, file);
}

const valid = `---
title: A title
date: 2025-06-12
tags: CSS, Layout
summary: One line summary
---
Body
`;

describe("splitFrontmatter", () => {
  it("strips the block and keeps the body", () => {
    const { fields, body } = splitFrontmatter("---\ntitle: A\n---\n\nBody\n", file);
    assert.equal(fields.title, "A");
    assert.equal(body, "\nBody\n");
  });

  it("accepts quoted values and skips comments", () => {
    const { fields } = splitFrontmatter('---\n# note\ntitle: "a: b"\n---\n', file);
    assert.equal(fields.title, "a: b");
  });

  it("rejects a file without a leading fence", () => {
    assert.throws(() => splitFrontmatter("title: x\n", file), /must start with ---/);
  });

  it("rejects an unclosed block", () => {
    assert.throws(() => splitFrontmatter("---\ntitle: x\n", file), /never closed/);
  });

  it("rejects a field that is written twice", () => {
    assert.throws(() => splitFrontmatter("---\ntitle: A\ntitle: B\n---\n", file), /repeats the field title/);
  });

  it("rejects a line that is not key: value", () => {
    assert.throws(() => splitFrontmatter("---\nnonsense\n---\n", file), /not a key: value pair/);
  });
});

describe("readPostMeta", () => {
  it("reads every field", () => {
    assert.deepEqual(meta(valid), {
      title: "A title",
      date: "2025-06-12",
      tags: ["CSS", "Layout"],
      summary: "One line summary",
      draft: false,
    });
  });

  it("reports a missing field with the file name", () => {
    assert.throws(() => meta("---\ntitle: A\n---\n"), /post\.dj: frontmatter is missing date/);
  });

  it("rejects an impossible date", () => {
    assert.throws(() => meta(valid.replace("2025-06-12", "2025-02-30")), /real date/);
    assert.throws(() => meta(valid.replace("2025-06-12", "2025-6-2")), /real date/);
  });

  it("rejects unknown keys", () => {
    assert.throws(() => meta(valid.replace("summary:", "summry:")), /unknown frontmatter field summry/);
  });

  it("rejects a draft value that is not true or false", () => {
    assert.throws(
      () => meta(valid.replace("summary: One line summary", "summary: One line summary\ndraft: yes")),
      /draft must be true or false/,
    );
  });

  it("reads draft: true", () => {
    assert.equal(meta(valid.replace("summary:", "draft: true\nsummary:")).draft, true);
  });

  it("splits tags on both comma styles and trims them", () => {
    assert.deepEqual(meta(valid.replace("CSS, Layout", "CSS， Layout , Grid")).tags, ["CSS", "Layout", "Grid"]);
  });

  it("rejects duplicate tags", () => {
    assert.throws(() => meta(valid.replace("CSS, Layout", "CSS, CSS")), /duplicate/);
  });

  it("keeps a tag that would be a path elsewhere, because it is only text now", () => {
    assert.deepEqual(meta(valid.replace("CSS, Layout", "C/C++, ..")).tags, ["C/C++", ".."]);
  });
});
