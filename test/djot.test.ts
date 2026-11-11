import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderDjot } from "../src/lib/djot.ts";

const file = "post.dj";

describe("renderDjot", () => {
  it("escapes text instead of passing markup through", () => {
    assert.equal(renderDjot("a < b & c\n", file).trim(), "<p>a &lt; b &amp; c</p>");
  });

  it("turns table alignment into a class, never an inline style", () => {
    const html = renderDjot("| a | b |\n|---|--:|\n| 1 | 2 |\n", file);
    assert.match(html, /class="align-right"/);
    assert.doesNotMatch(html, /style=/);
  });

  it("keeps the header cell as th", () => {
    const html = renderDjot("| a | b |\n|---|---|\n| 1 | 2 |\n", file);
    assert.match(html, /<th>/);
  });

  it("groups the header rows apart from the body rows", () => {
    const html = renderDjot("| a | b |\n|---|---|\n| 1 | 2 |\n", file);
    assert.match(html, /<thead>\s*<tr>[\s\S]*<\/thead>\s*<tbody>/);
    assert.equal((html.match(/<tr>/gu) ?? []).length, 2);
  });

  it("gives a heading an id a fragment and a selector can both carry", () => {
    const html = renderDjot("## 中文标题\n\n## 中文标题\n", file);
    assert.deepEqual(
      [...html.matchAll(/id="([^"]+)"/gu)].map((match) => match[1]),
      ["section-1", "section-2"],
    );
  });

  it("follows a link that pointed at the heading before it was renamed", () => {
    assert.match(renderDjot("## 中文标题\n\n[jump](#中文标题)\n", file), /href="#section-1"/u);
  });

  it("renders footnotes into the notes section", () => {
    const html = renderDjot("Text[^1]\n\n[^1]: A note\n", file);
    assert.match(html, /role="doc-endnotes"/);
  });

  it("fails the build on an undefined reference", () => {
    assert.throws(() => renderDjot("see [missing][]\n", file), /post\.dj:/);
  });
});
