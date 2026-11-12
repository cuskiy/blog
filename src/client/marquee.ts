// A playing row reads its title from the start, runs past the last letter, leaves on the left,
// waits, and comes back in from the right for another pass. The three moves share one speed, so
// the distances are measured and the timeline is built from them; a stylesheet cannot give a
// fixed percentage to each segment when the segments are not the same length.

const SPEED = 60; // px per second, slow enough to read at a glance
const HOLD = 900; // ms still at the start, at the end, and out of sight between passes

export interface MarqueeFrame {
  transform: string;
  offset: number;
  [property: string]: string | number;
}

export interface Marquee {
  frames: MarqueeFrame[];
  duration: number;
}

/** The timeline of one pass, from the measured width of the box and of the text. */
export function marquee(width: number, text: number): Marquee | undefined {
  if (text <= width + 1) {
    return undefined;
  }

  const shift = width - text;
  const exit = -text;
  const enter = width;
  const scroll = Math.round(((text - width) / SPEED) * 1000);
  const edge = Math.round((width / SPEED) * 1000);
  const duration = HOLD + scroll + HOLD + edge + HOLD + edge;
  const at = (elapsed: number): number => elapsed / duration;
  const move = (x: number, offset: number): MarqueeFrame => ({
    transform: `translateX(${String(x)}px)`,
    offset,
  });

  // The step from the exit to the entry shares one offset, so the text is replaced on the far
  // side in a single frame instead of flying across the box.
  const jump = at(HOLD + scroll + HOLD + edge);
  return {
    duration,
    frames: [
      move(0, 0),
      move(0, at(HOLD)),
      move(shift, at(HOLD + scroll)),
      move(shift, at(HOLD + scroll + HOLD)),
      move(exit, jump),
      move(enter, jump),
      move(enter, at(HOLD + scroll + HOLD + edge + HOLD)),
      move(0, 1),
    ],
  };
}
