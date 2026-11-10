import { Sequencer, WorkletSynthesizer } from "spessasynth_lib";

import { dataCache } from "./cache.ts";

const fontUrl = "/assets/soundfont/GeneralUserGS.sf3";

// a switch is heard as a stop and a start, so the two tracks never run into each other
const gap = 220;

// replaced at build time with the hashed URL of the worklet
declare const __PROCESSOR_URL__: string;

export interface PlaybackState {
  readonly file: string | undefined;
  readonly playing: boolean;
}

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
    await (await caches.open(dataCache)).put(fontUrl, new Response(bytes, { headers: response.headers }));
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

// The player owns the playback state and reports every change, so the page never has to
// guess what is running: it draws whatever was last reported.
export class Player {
  #onState: (state: PlaybackState) => void = () => undefined;
  #context: AudioContext | undefined;
  #sequencer: Sequencer | undefined;
  #starting: Promise<void> | undefined;
  #pending: Promise<unknown> = Promise.resolve();
  #file: string | undefined;

  set onState(handler: (state: PlaybackState) => void) {
    this.#onState = handler;
  }

  #emit(playing: boolean): void {
    this.#onState({ file: this.#file, playing });
  }

  async #start(): Promise<void> {
    this.#starting ??= (async () => {
      await workerReady();

      const audio = new AudioContext();
      this.#context = audio;
      await audio.audioWorklet.addModule(__PROCESSOR_URL__);

      const engine = new WorkletSynthesizer(audio);
      await engine.soundBankManager.addSoundBank(await loadFont(), "main");
      await engine.isReady;
      engine.connect(audio.destination);

      const sequencer = new Sequencer(engine);
      sequencer.eventHandler.addEvent("songEnded", "music-end", () => {
        this.#emit(false);
      });
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
      throw new Error("the sequencer is not ready");
    }

    const response = await fetch(`/assets/midi/${file}`);
    if (!response.ok) {
      throw new Error(`${file}: the track could not be fetched`);
    }
    sequencer.loadNewSongList([{ binary: await response.arrayBuffer(), fileName: file }]);
    this.#file = file;
  }

  // one operation at a time: a second click while a track is loading must not interleave
  play(file: string): Promise<void> {
    const next = this.#pending.then(
      () => this.#run(file),
      () => this.#run(file),
    );
    this.#pending = next.catch(() => undefined);
    return next;
  }

  async #run(file: string): Promise<void> {
    await this.#start();

    const audio = this.#context;
    const sequencer = this.#sequencer;
    if (audio === undefined || sequencer === undefined) {
      return;
    }

    if (audio.state === "suspended") {
      await audio.resume();
    }

    if (file === this.#file) {
      if (!sequencer.paused) {
        sequencer.pause();
        this.#emit(false);
        return;
      }
      // a track that ran to its end replays from the start rather than from silence
      if (sequencer.isFinished) {
        sequencer.currentTime = 0;
      }
      sequencer.play();
      this.#emit(true);
      return;
    }

    // the running track stops where it is, the next one loads while it is quiet, and only
    // then does it start, so a switch sounds like a stop and a start rather than a cut
    if (this.#file !== undefined) {
      sequencer.pause();
      this.#emit(false);
    }

    await this.#load(file);
    // the loaded track is the current one now, and stays silent until the gap is over
    this.#emit(false);
    await new Promise((resolve) => setTimeout(resolve, gap));

    sequencer.play();
    this.#emit(true);
  }
}
