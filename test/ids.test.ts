import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertDistinct, hashId, route } from "../src/lib/ids.ts";

describe("hashId", () => {
  it("gives the same answer for the same input", () => {
    assert.equal(hashId("style-test"), hashId("style-test"));
    assert.equal(
      hashId(new TextEncoder().encode("body { margin: 0 }")),
      hashId(new TextEncoder().encode("body { margin: 0 }")),
    );
  });

  it("gives different answers for different input", () => {
    assert.notEqual(hashId("style-test"), hashId("style-test-2"));
    assert.notEqual(hashId("a"), hashId("b"));
  });

  it("hashes a name the same way as the bytes of that name", () => {
    // a name and its bytes are one input: the id only depends on the octets
    assert.equal(hashId("a"), hashId(new TextEncoder().encode("a")));
  });

  it("is a short lowercase hex string", () => {
    assert.match(hashId("anything"), /^[0-9a-f]{10}$/u);
  });
});

describe("route", () => {
  it("derives the address and the file from one id", () => {
    const { id, url, file } = route("/posts/", "style-test");
    assert.equal(url, `/posts/${id}/`);
    assert.equal(file, `posts/${id}/index.html`);
  });

  it("follows the prefix it is given", () => {
    assert.equal(route("/p/", "love").file, `p/${hashId("love")}/index.html`);
  });

  it("stays put when called again", () => {
    assert.deepEqual(route("/tags/", "Djot"), route("/tags/", "Djot"));
  });
});

describe("assertDistinct", () => {
  it("rejects two entries that would write the same file", () => {
    const shared = route("/posts/", "a");
    assert.throws(() => {
      assertDistinct([
        { name: "first", route: shared },
        { name: "second", route: { ...shared } },
      ]);
    }, /both write/u);
  });

  it("accepts distinct names", () => {
    assert.doesNotThrow(() => {
      assertDistinct([
        { name: "a", route: route("/posts/", "a") },
        { name: "b", route: route("/posts/", "b") },
      ]);
    });
  });
});
