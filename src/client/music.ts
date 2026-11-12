import type { PlaybackState, Player } from "./audio.ts";
import { element } from "./dom.ts";

const room = element<HTMLElement>(".music-room");
const tracks = [...document.querySelectorAll<HTMLButtonElement>("[data-track]")];

let player: Promise<Player> | undefined;

// A title only overflows once it is laid out, so the distances it has to travel are measured
// here rather than decided at build time: to the end of the text, out of the box, and back in.
function measure(button: HTMLButtonElement): void {
  const box = button.querySelector<HTMLElement>(".music-title");
  if (box === null) {
    return;
  }
  const text = box.scrollWidth;
  const width = box.clientWidth;
  box.style.setProperty("--marquee-shift", `${String(width - text)}px`);
  box.style.setProperty("--marquee-exit", `${String(-text)}px`);
  box.style.setProperty("--marquee-enter", `${String(width)}px`);
  box.style.setProperty("--marquee-duration", `${String(Math.max(6, Math.round((text + width) / 60)))}s`);
}

// the player reports what is actually running, so the page only has to draw it
function render({ file, playing }: PlaybackState): void {
  for (const button of tracks) {
    if (button.dataset.track === file) {
      button.setAttribute("aria-current", "true");
      measure(button);
    } else {
      button.removeAttribute("aria-current");
    }
  }
  room.toggleAttribute("data-playing", playing);
}

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
