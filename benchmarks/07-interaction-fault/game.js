(() => {
  const c = document.querySelector("#game");
  const x = c.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const runEl = document.querySelector("#run");
  const statusEl = document.querySelector("#status");

  const originalSeed =
    (+new URLSearchParams(location.search).get("seed") || Date.now()) >>> 0;

  let seed = originalSeed;

  const rnd = () =>
    ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

  const t = {
    build: "benchmark-07-interaction-fault",
    seed: originalSeed,
    runs: 0,
    events: [],
  };

  const emit = (type, data = {}) => {
    const e = {
      type,
      time: Date.now(),
      ...data,
    };

    t.events.push(e);
    window.__PLAYTESTED_TELEMETRY__ = t;
    console.log("[PLAYTESTED]", JSON.stringify(e));
  };

  let running = false;
  let raf = 0;
  let last = 0;
  let score = 0;
  let spawn = 0;
  let haz = [];

  const p = {
    x: 433,
    y: 233,
    w: 34,
    h: 34,
    s: 250,
  };

  /*
   * BENCHMARK 07
   *
   * The game launches, runs and scores normally.
   * However ALL player movement input is deliberately ignored.
   *
   * Keyboard input does nothing.
   * PlaytestedTestAPI.move() does nothing.
   *
   * A genuine interaction test should therefore fail.
   */

  function reset() {
    p.x = 433;
    p.y = 233;

    haz = [];
    score = 0;
    spawn = 0;

    scoreEl.textContent = "0";
  }

  function start() {
    if (running) {
      return;
    }

    t.runs += 1;
    runEl.textContent = t.runs;

    reset();

    running = true;
    last = performance.now();

    statusEl.textContent = "Running";

    emit("run_started", {
      run: t.runs,
    });

    raf = requestAnimationFrame(loop);
  }

  function stop(reason = "collision") {
    if (!running) {
      return;
    }

    running = false;
    cancelAnimationFrame(raf);

    statusEl.textContent = reason;

    emit("run_ended", {
      run: t.runs,
      reason,
      score: Math.floor(score),
    });
  }

  function restart() {
    if (running) {
      stop("restart");
    }

    reset();
    start();
  }

  function addHaz() {
    const s = 20 + rnd() * 30;
    const side = Math.floor(rnd() * 4);
    const sp = 110 + rnd() * 140;

    const h = {
      w: s,
      h: s,
    };

    if (side === 0) {
      Object.assign(h, {
        x: -s,
        y: rnd() * c.height,
        vx: sp,
        vy: (rnd() - 0.5) * 70,
      });
    }

    if (side === 1) {
      Object.assign(h, {
        x: c.width + s,
        y: rnd() * c.height,
        vx: -sp,
        vy: (rnd() - 0.5) * 70,
      });
    }

    if (side === 2) {
      Object.assign(h, {
        x: rnd() * c.width,
        y: -s,
        vx: (rnd() - 0.5) * 70,
        vy: sp,
      });
    }

    if (side === 3) {
      Object.assign(h, {
        x: rnd() * c.width,
        y: c.height + s,
        vx: (rnd() - 0.5) * 70,
        vy: -sp,
      });
    }

    haz.push(h);
  }

  const hit = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;

  function update(dt) {
    /*
     * Deliberately NO movement processing here.
     * Player position remains fixed regardless of input.
     */

    spawn -= dt;

    if (spawn <= 0) {
      addHaz();
      spawn = Math.max(0.18, 0.7 - score / 180);
    }

    for (const h of haz) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      if (hit(p, h)) {
        stop("collision");
        return;
      }
    }

    haz = haz.filter(
      (h) =>
        h.x > -100 &&
        h.x < c.width + 100 &&
        h.y > -100 &&
        h.y < c.height + 100
    );

    score += dt * 10;
    scoreEl.textContent = Math.floor(score);
  }

  function draw() {
    x.fillStyle = "#0c100d";
    x.fillRect(0, 0, c.width, c.height);

    x.fillStyle = "#77f29b";
    x.fillRect(p.x, p.y, p.w, p.h);

    x.fillStyle = "#fb7185";

    haz.forEach((h) => {
      x.fillRect(h.x, h.y, h.w, h.h);
    });
  }

  function loop(now) {
    if (!running) {
      return;
    }

    update(Math.min((now - last) / 1000, 0.05));

    last = now;
    draw();

    if (running) {
      raf = requestAnimationFrame(loop);
    }
  }

  /*
   * Keyboard events deliberately received but ignored.
   */
  addEventListener("keydown", () => {});
  addEventListener("keyup", () => {});

  document.querySelector("#start").onclick = start;
  document.querySelector("#restart").onclick = restart;

  window.PlaytestedTestAPI = {
    start,
    restart,

    stop: () => stop("automation_stop"),

    telemetry: () =>
      JSON.parse(JSON.stringify(t)),

    status: () => ({
      running,
      score: Math.floor(score),
      hazards: haz.length,
      playerX: p.x,
      playerY: p.y,
    }),

    /*
     * Deliberately ignores automated movement requests.
     */
    move: () => {},
  };

  emit("build_loaded");
  draw();
})();