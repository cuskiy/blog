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

function stopMarquee(): void {
  timeline?.cancel();
  timeline = undefined;
  watched?.disconnect();
  watched = undefined;
}

function startMarquee(button: HTMLButtonElement): void {
  stopMarquee();
  const box = button.querySelector<HTMLElement>(".music-title");
  const line = button.querySelector<HTMLElement>(".music-title-line");
  if (box === null || line === null || reducedMotion.matches) {
    return;
  }

  const plan = marquee(box.clientWidth, line.scrollWidth);
  if (plan === undefined) {
    return;
  }

  timeline = line.animate(plan.frames, {
    duration: plan.duration,
    iterations: Infinity,
    easing: "linear",
  });
  if (!playing) {
    timeline.pause();
  }

  watched = new ResizeObserver(() => {
    if (current !== null) {
      startMarquee(current);
    }
  });
  watched.observe(box);
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
    if (next === null) {
      stopMarquee();
    } else {
      startMarquee(next);
    }
    return;
  }
  if (timeline === undefined) {
    return;
  }
  if (isPlaying) {
    timeline.play();
  } else {
    timeline.pause();
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
