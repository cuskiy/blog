import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { marquee, type MarqueeFrame } from "../src/client/marquee.ts";

const px = (frame: MarqueeFrame): number => Number(/(-?[\d.]+)px/u.exec(frame.transform)?.[1] ?? 0);

const frame = (frames: MarqueeFrame[], index: number): MarqueeFrame => {
  const found = frames[index];
  assert.ok(found, `frame ${index} is missing`);
  return found;
};

describe("marquee", () => {
  it("does not move text that fits", () => {
    assert.equal(marquee(400, 400), undefined);
    assert.equal(marquee(400, 380), undefined);
  });

  it("moves the scroll, the exit and the entry at one speed", () => {
    const plan = marquee(240, 900);
    assert.ok(plan);
    const { frames, duration } = plan;
    const speed = (start: number, end: number): number => {
      const span = (frame(frames, end).offset - frame(frames, start).offset) * duration;
      const distance = Math.abs(px(frame(frames, end)) - px(frame(frames, start)));
      return Math.round((distance / span) * 1000);
    };
    for (const [start, end] of [
      [1, 2],
      [3, 4],
      [6, 7],
    ] as const) {
      const measured = speed(start, end);
      assert.ok(Math.abs(measured - 60) <= 1, `segment ${start}->${end} runs at ${measured}px per second`);
    }
  });

  it("waits at the start, at the end and out of sight", () => {
    const plan = marquee(240, 900);
    assert.ok(plan);
    const { frames, duration } = plan;
    const span = (start: number, end: number): number =>
      (frame(frames, end).offset - frame(frames, start).offset) * duration;
    assert.ok(Math.abs(span(0, 1) - 900) <= 1, "the start hold is 900ms");
    assert.ok(Math.abs(span(2, 3) - 900) <= 1, "the end hold is 900ms");
    assert.ok(Math.abs(span(5, 6) - 900) <= 1, "the beat between passes is 900ms");
  });

  it("steps from the far left to the far right in one frame", () => {
    const plan = marquee(240, 900);
    assert.ok(plan);
    const { frames } = plan;
    assert.equal(px(frame(frames, 4)), -900);
    assert.equal(px(frame(frames, 5)), 240);
    assert.equal(frame(frames, 4).offset, frame(frames, 5).offset);
    assert.equal(px(frame(frames, frames.length - 1)), 0);
  });
});
