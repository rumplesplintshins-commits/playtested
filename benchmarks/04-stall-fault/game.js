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
    build: "benchmark-04-stall-fault",
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
  let keys = new Set();
  let haz = [];

  let stallTriggered = false;
  let frozenUntil = 0;

  const p = {
    x: 433,
    y: 233,
    w: 34,
    h: 34,
    s: 250,
  };

  /*
   * Deliberately stall specific V3 stability/soak sessions.
   *
   * Stability seeds:
   * 400000 + (familyIndex * 7919)
   *
   * We inject stalls into stability checks 2 and 4.
   *
   * Soak seed:
   * 500000 + (1 * 7919)
   *
   * We inject a stall into soak check 1.
   *
   * Expected ground truth:
   * 3 sessions with actual stalls
   * 3 simulation_stall events
   */

  const deliberateStallSeeds = new Set([
    400000 + 2 * 7919,
    400000 + 4 * 7919,
    500000 + 1 * 7919,
  ]);

  function reset() {
    p.x = 433;
    p.y = 233;

    haz = [];
    score = 0;
    spawn = 0;
    stallTriggered = false;
    frozenUntil = 0;

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

  function update(dt, now) {
    if (
      deliberateStallSeeds.has(originalSeed) &&
      !stallTriggered &&
      score >= 5
    ) {
      stallTriggered = true;
      frozenUntil = now + 700;

      emit("simulation_stall", {
        deliberate: true,
        durationMs: 700,
        seed: originalSeed,
      });

      return;
    }

    if (now < frozenUntil) {
      return;
    }

    let dx = 0;
    let dy = 0;

    if (keys.has("ArrowLeft") || keys.has("a")) {
      dx -= 1;
    }

    if (keys.has("ArrowRight") || keys.has("d")) {
      dx += 1;
    }

    if (keys.has("ArrowUp") || keys.has("w")) {
      dy -= 1;
    }

    if (keys.has("ArrowDown") || keys.has("s")) {
      dy += 1;
    }

    if (dx && dy) {
      dx *= 0.707;
      dy *= 0.707;
    }

    p.x = Math.max(
      0,
      Math.min(c.width - p.w, p.x + dx * p.s * dt)
    );

    p.y = Math.max(
      0,
      Math.min(c.height - p.h, p.y + dy * p.s * dt)
    );

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

    update(
      Math.min((now - last) / 1000, 0.05),
      now
    );

    last = now;

    draw();

    if (running) {
      raf = requestAnimationFrame(loop);
    }
  }

  addEventListener("keydown", (e) => {
    keys.add(
      e.key.length === 1
        ? e.key.toLowerCase()
        : e.key
    );
  });

  addEventListener("keyup", (e) => {
    keys.delete(
      e.key.length === 1
        ? e.key.toLowerCase()
        : e.key
    );
  });

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
    }),

    move: (direction, on = true) => {
      const key = {
        left: "ArrowLeft",
        right: "ArrowRight",
        up: "ArrowUp",
        down: "ArrowDown",
      }[direction];

      if (key) {
        if (on) {
          keys.add(key);
        } else {
          keys.delete(key);
        }
      }
    },
  };

  emit("build_loaded");
  draw();
})();