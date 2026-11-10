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

  it("renders footnotes into the notes section", () => {
    const html = renderDjot("Text[^1]\n\n[^1]: A note\n", file);
    assert.match(html, /role="doc-endnotes"/);
  });

  it("fails the build on an undefined reference", () => {
    assert.throws(() => renderDjot("see [missing][]\n", file), /post\.dj:/);
  });
});
