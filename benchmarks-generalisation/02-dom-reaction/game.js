const startButton = document.getElementById("start");
const menu = document.getElementById("menu");
const arena = document.getElementById("arena");
const target = document.getElementById("target");
const message = document.getElementById("message");

const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const statusDisplay = document.getElementById("status");

const GAME_DURATION = 20;

let score = 0;
let timeRemaining = GAME_DURATION;
let gameRunning = false;
let timerId = null;

function randomPosition() {
  const arenaWidth = arena.clientWidth;
  const arenaHeight = arena.clientHeight;

  const targetWidth = target.offsetWidth || 72;
  const targetHeight = target.offsetHeight || 72;

  const maxX = Math.max(0, arenaWidth - targetWidth);
  const maxY = Math.max(0, arenaHeight - targetHeight);

  return {
    x: Math.floor(Math.random() * maxX),
    y: Math.floor(Math.random() * maxY),
  };
}

function moveTarget() {
  if (!gameRunning) {
    return;
  }

  const position = randomPosition();

  target.style.left = `${position.x}px`;
  target.style.top = `${position.y}px`;
}

function updateHud() {
  scoreDisplay.textContent = String(score);
  timeDisplay.textContent = String(timeRemaining);
}

function endGame() {
  gameRunning = false;

  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  target.style.display = "none";

  message.textContent = `Circuit complete. Score: ${score}`;
  message.classList.remove("hidden");

  statusDisplay.textContent = "Complete";

  startButton.textContent = "Run Again";
  menu.classList.remove("hidden");
}

function startGame() {
  if (timerId !== null) {
    clearInterval(timerId);
  }

  score = 0;
  timeRemaining = GAME_DURATION;
  gameRunning = true;

  updateHud();

  statusDisplay.textContent = "Active";

  menu.classList.add("hidden");
  arena.classList.remove("hidden");

  message.classList.add("hidden");

  target.style.display = "grid";

  moveTarget();

  timerId = setInterval(() => {
    timeRemaining -= 1;

    updateHud();

    if (timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

startButton.addEventListener("click", () => {
  startGame();
});

target.addEventListener("click", () => {
  if (!gameRunning) {
    return;
  }

  score += 1;

  updateHud();
  moveTarget();
});