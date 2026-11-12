import type { PlaybackState, Player } from "./audio.ts";
import { element } from "./dom.ts";
import { marquee } from "./marquee.ts";

const room = element<HTMLElement>(".music-room");
const tracks = [...document.querySelectorAll<HTMLButtonElement>("[data-track]")];

let player: Promise<Player> | undefined;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let timeline: Animation | undefined;
let watched: ResizeObserver | undefined;
let current: HTMLButtonElement | null = null;
let playing = false;
// the measured size the running timeline was built from, so a resize can be told from the
// observer's own first call
let built: string | undefined;

interface Size {
  box: HTMLElement;
  line: HTMLElement;
  width: number;
  text: number;
}

function measure(button: HTMLButtonElement): Size | undefined {
  const box = button.querySelector<HTMLElement>(".music-title");
  const line = button.querySelector<HTMLElement>(".music-title-line");
  if (box === null || line === null) {
    return undefined;
  }
  return { box, line, width: box.clientWidth, text: line.scrollWidth };
}

function stopTimeline(): void {
  timeline?.cancel();
  timeline = undefined;
  built = undefined;
}

function stopMarquee(): void {
  stopTimeline();
  watched?.disconnect();
  watched = undefined;
}

function startMarquee(button: HTMLButtonElement): void {
  stopTimeline();
  const size = measure(button);
  if (size === undefined || reducedMotion.matches) {
    return;
  }

  const plan = marquee(size.width, size.text);
  if (plan === undefined) {
    return;
  }

  built = `${String(size.width)}x${String(size.text)}`;
  timeline = size.line.animate(plan.frames, {
    duration: plan.duration,
    iterations: Infinity,
    easing: "linear",
  });

  if (watched === undefined) {
    watched = new ResizeObserver(() => {
      if (current === null || !playing) {
        return;
      }
      const next = measure(current);
      if (next === undefined || `${String(next.width)}x${String(next.text)}` === built) {
        return;
      }
      startMarquee(current);
    });
    watched.observe(size.box);
  }
}

// the player reports what is actually running, so the page only has to draw it
function render({ file, playing: isPlaying }: PlaybackState): void {
  playing = isPlaying;
  let next: HTMLButtonElement | null = null;
  for (const button of tracks) {
    if (button.dataset.track === file) {
      button.setAttribute("aria-current", "true");
      next = button;
    } else {
      button.removeAttribute("aria-current");
    }
  }
  room.toggleAttribute("data-playing", isPlaying);

  if (next !== current) {
    current = next;
    stopMarquee();
    // An animation paused before its first frame stays pending for good, so it is only
    // created once there is something to play.
    if (next !== null && isPlaying) {
      startMarquee(next);
    }
    return;
  }
  if (current === null) {
    return;
  }
  if (!isPlaying) {
    timeline?.pause();
    return;
  }
  if (timeline === undefined) {
    startMarquee(current);
  } else {
    timeline.play();
  }
}

reducedMotion.addEventListener("change", () => {
  if (current !== null) {
    startMarquee(current);
  }
});

// The player drags the whole synth behind it — 430 kB — so it is fetched on the first
// click instead of holding up a page that is otherwise ready as soon as it renders.
function loadPlayer(): Promise<Player> {
  player ??= import("./audio.ts")
    .then(({ Player: SynthPlayer }) => {
      const synth = new SynthPlayer();
      synth.onState = render;
      return synth;
    })
    .catch((error: unknown) => {
      // a failed fetch must not leave a rejected promise cached: the next click tries again
      player = undefined;
      throw error;
    });
  return player;
}

for (const track of tracks) {
  track.addEventListener("click", () => {
    const file = track.dataset.track;
    if (file === undefined) {
      return;
    }

    // a new attempt supersedes any message left by a failed one
    for (const button of tracks) {
      button.removeAttribute("data-failed");
    }

    track.setAttribute("aria-busy", "true");
    loadPlayer()
      .then((synth) => synth.play(file))
      .catch((error: unknown) => {
        // the row says it failed, right where the click happened; the next click tries again
        console.error(error);
        track.setAttribute("data-failed", "播放失败");
      })
      .finally(() => {
        track.removeAttribute("aria-busy");
      });
  });
}

// CSS shows a busy cursor until this module has run, because a click before it lands on nothing
room.setAttribute("data-ready", "");

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}
