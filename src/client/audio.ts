import { Sequencer, WorkletSynthesizer } from "spessasynth_lib";

import { cacheName } from "./cache.ts";

const fontUrl = "/assets/soundfont/GeneralUserGS.sf3";
const processorUrl = "/assets/js/spessasynth_processor.min.js";

async function loadFont(): Promise<ArrayBuffer> {
  try {
    const hit = await caches.match(fontUrl);
    if (hit !== undefined) {
      return await hit.arrayBuffer();
    }
  } catch {
    // no cache available, so fall through to the network
  }

  const response = await fetch(fontUrl);
  const bytes = await response.arrayBuffer();
  try {
    // cloning the 14 MB stream fails, so the cache gets a response built from the buffer
    await (await caches.open(cacheName)).put(fontUrl, new Response(bytes, { headers: response.headers }));
  } catch {
    // storing the font is an optimisation, never a requirement
  }
  return bytes;
}

// the first fetch has to land while the worker controls this page, or it bypasses the cache
function workerReady(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve();
  }
  const workers = navigator.serviceWorker;
  if (workers.controller !== null) {
    return Promise.resolve();
  }
  return Promise.race([
    new Promise<void>((resolve) => {
      workers.addEventListener(
        "controllerchange",
        () => {
          resolve();
        },
        { once: true },
      );
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);
}

export class Player {
  readonly #onEnd: () => void;
  #context: AudioContext | undefined;
  #sequencer: Sequencer | undefined;
  #starting: Promise<void> | undefined;
  #file = "";

  constructor(onEnd: () => void) {
    this.#onEnd = onEnd;
  }

  async #start(): Promise<void> {
    this.#starting ??= (async () => {
      await workerReady();

      const audio = new AudioContext();
      this.#context = audio;
      await audio.audioWorklet.addModule(processorUrl);

      const engine = new WorkletSynthesizer(audio);
      await engine.soundBankManager.addSoundBank(await loadFont(), "main");
      await engine.isReady;
      engine.connect(audio.destination);

      const sequencer = new Sequencer(engine);
      sequencer.eventHandler.addEvent("songEnded", "music-end", this.#onEnd);
      this.#sequencer = sequencer;
    })().catch((error: unknown) => {
      this.#starting = undefined;
      throw error;
    });

    return this.#starting;
  }

  async #load(file: string): Promise<void> {
    const sequencer = this.#sequencer;
    if (sequencer === undefined) {
      return;
    }

    const response = await fetch(`/assets/midi/${file}`);
    sequencer.loadNewSongList([{ binary: await response.arrayBuffer(), fileName: file }]);
    this.#file = file;
  }

  async toggle(file: string): Promise<boolean> {
    await this.#start();

    const audio = this.#context;
    const sequencer = this.#sequencer;
    if (audio === undefined || sequencer === undefined) {
      return false;
    }

    if (audio.state === "suspended") {
      await audio.resume();
    }

    if (file !== this.#file) {
      await this.#load(file);
      sequencer.play();
      return true;
    }

    if (sequencer.paused) {
      sequencer.play();
      return true;
    }

    sequencer.pause();
    return false;
  }
}
