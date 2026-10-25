const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const startButton = document.getElementById("start");

const keys = new Set();
let running = false;
let lastTime = performance.now();

const player = {
  x: 100,
  y: 350,
  width: 36,
  height: 48,
  velocityX: 0,
  velocityY: 0,
  speed: 260,
  jumpStrength: 600,
  grounded: false
};

const platforms = [
  { x: 0, y: 490, width: 960, height: 50 },
  { x: 180, y: 410, width: 150, height: 20 },
  { x: 410, y: 340, width: 150, height: 20 },
  { x: 650, y: 270, width: 150, height: 20 },
  { x: 800, y: 190, width: 120, height: 20 }
];

function resetPlayer() {
  player.x = 100;
  player.y = 350;
  player.velocityX = 0;
  player.velocityY = 0;
  player.grounded = false;
}

function startGame() {
  resetPlayer();
  running = true;
  menu.classList.add("hidden");
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);

  if (event.code === "Space" && running && player.grounded) {
    event.preventDefault();
    player.velocityY = -player.jumpStrength;
    player.grounded = false;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function update(delta) {
  if (!running) return;

  player.velocityX = 0;

  if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    player.velocityX = -player.speed;
  }

  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    player.velocityX = player.speed;
  }

  const previousBottom = player.y + player.height;

  player.velocityY += 1500 * delta;
  player.x += player.velocityX * delta;
  player.y += player.velocityY * delta;

  player.x = Math.max(0, Math.min(924, player.x));
  player.grounded = false;

  for (const platform of platforms) {
    const currentBottom = player.y + player.height;

    const horizontalOverlap =
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width;

    if (
      horizontalOverlap &&
      previousBottom <= platform.y &&
      currentBottom >= platform.y &&
      player.velocityY >= 0
    ) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.grounded = true;
    }
  }

  if (player.y > 640) {
    resetPlayer();
  }
}

function render() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 540);
  gradient.addColorStop(0, "#172554");
  gradient.addColorStop(1, "#020617");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 540);

  for (const platform of platforms) {
    ctx.fillStyle = "#475569";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    ctx.fillStyle = "#77f29b";
    ctx.fillRect(platform.x, platform.y, platform.width, 4);
  }

  ctx.fillStyle = "#facc15";
  ctx.fillRect(860, 130, 30, 60);

  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function loop(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  update(delta);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
