type Frame = readonly [number, number];

// adapted from oneko; the sprite sheet is embedded as a data URL
function main(): void {
  const spriteSize = 32;
  const speed = 10;
  const sleepTimeout = 16000;

  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchN: [
      [0, 0],
      [0, -1],
    ],
    scratchS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchW: [
      [-4, 0],
      [-4, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  } as const satisfies Record<string, readonly [Frame, ...Frame[]]>;

  type SpriteName = keyof typeof spriteSets;

  let nekoX = Math.floor(Math.random() * window.innerWidth);
  let nekoY = Math.floor(Math.random() * window.innerHeight);
  let mouseX = nekoX;
  let mouseY = nekoY;
  let frame = 0;
  let idleFrames = 0;
  let idleAction: SpriteName | null = null;
  let idleActionFrame = 0;
  let lastActive = Date.now();

  const el = document.createElement("div");
  el.id = "oneko";
  el.setAttribute("aria-hidden", "true");

  const style = el.style;
  style.width = `${spriteSize}px`;
  style.height = `${spriteSize}px`;
  style.position = "fixed";
  style.imageRendering = "pixelated";
  style.zIndex = "9999";
  style.pointerEvents = "none";
  style.left = `${nekoX - spriteSize / 2}px`;
  style.top = `${nekoY - spriteSize / 2}px`;
  style.backgroundImage =
    "url(data:image/gif;base64,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)";

  function applyTheme(): void {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    style.filter = dark ? "invert(1) hue-rotate(180deg)" : "";
    style.opacity = dark ? "0.55" : "0.6";
  }

  function wakeUp(): void {
    lastActive = Date.now();
    if (idleAction === "sleeping" || idleAction === "tired") {
      idleAction = null;
      idleActionFrame = 0;
      idleFrames = 0;
    }
  }

  function setSprite(name: SpriteName, index: number): void {
    const frames = spriteSets[name];
    const pair = frames[index % frames.length] ?? frames[0];
    style.backgroundPosition = `${pair[0] * spriteSize}px ${pair[1] * spriteSize}px`;
  }

  function doIdle(): void {
    const elapsed = Date.now() - lastActive;

    if (elapsed > sleepTimeout && idleAction === null) {
      idleAction = "sleeping";
      idleActionFrame = 0;
    }

    if (idleFrames > 10 && idleAction === null && Math.random() < 0.01) {
      const actions: readonly SpriteName[] = ["scratchSelf", "scratchN", "scratchS"];
      idleAction = actions[Math.floor(Math.random() * actions.length)] ?? "scratchSelf";
      idleActionFrame = 0;
    }

    if (idleAction === "sleeping") {
      setSprite(idleActionFrame < 8 ? "tired" : "sleeping", idleActionFrame >> 2);
      idleActionFrame++;
      if (idleActionFrame > 192) {
        idleAction = null;
        idleActionFrame = 0;
        idleFrames = 0;
      }
      return;
    }

    if (idleAction !== null) {
      setSprite(idleAction, idleActionFrame);
      idleActionFrame++;
      if (idleActionFrame > 9) {
        idleAction = null;
        idleActionFrame = 0;
      }
      return;
    }

    setSprite("idle", 0);
    idleFrames++;
  }

  function getDirection(dx: number, dy: number): SpriteName {
    let direction = "";
    if (dy < -1) direction += "N";
    else if (dy > 1) direction += "S";
    if (dx > 1) direction += "E";
    else if (dx < -1) direction += "W";
    return direction === "" ? "idle" : (direction as SpriteName);
  }

  let lastTime = 0;

  function tick(timestamp: number): void {
    if (!el.isConnected) {
      return;
    }
    requestAnimationFrame(tick);

    if (timestamp - lastTime < 100) {
      return;
    }
    lastTime = timestamp;
    frame++;

    const dx = mouseX - nekoX;
    const dy = mouseY - nekoY;
    const distance = Math.hypot(dx, dy);

    if (distance < spriteSize / 2) {
      doIdle();
      return;
    }

    idleAction = null;
    idleActionFrame = 0;
    idleFrames = 0;

    if (distance > 1) {
      nekoX += (dx / distance) * speed;
      nekoY += (dy / distance) * speed;
    }

    setSprite(getDirection(dx, dy), frame);
    style.left = `${nekoX - spriteSize / 2}px`;
    style.top = `${nekoY - spriteSize / 2}px`;
  }

  applyTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  document.body.append(el);

  document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    wakeUp();
  });

  document.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      if (touch === undefined) {
        return;
      }
      mouseX = touch.clientX;
      mouseY = touch.clientY;
      wakeUp();
    },
    { passive: true },
  );

  requestAnimationFrame(tick);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  main();
}
