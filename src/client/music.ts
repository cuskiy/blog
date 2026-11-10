import { Player } from "./audio.ts";
import { element } from "./dom.ts";

const room = element<HTMLElement>(".music-room");
const tracks = [...document.querySelectorAll<HTMLButtonElement>("[data-track]")];

const player = new Player(() => {
  room.toggleAttribute("data-playing", false);
});

async function select(index: number): Promise<void> {
  const track = tracks[index];
  const file = track?.dataset.track;
  if (track === undefined || file === undefined) {
    return;
  }

  for (const button of tracks) {
    // aria-current takes a token, not an empty attribute: "true", or the attribute goes away
    if (Number(button.dataset.index) === index) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  }
  room.toggleAttribute("data-playing", await player.toggle(file));
}

for (const track of tracks) {
  track.addEventListener("click", () => {
    // a failed load leaves no player behind, so the error only has to be reported
    select(Number(track.dataset.index)).catch((error: unknown) => {
      console.error(error);
    });
  });
}

// CSS shows a busy cursor until this module has run, because a click before it lands on nothing
room.setAttribute("data-ready", "");

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}
