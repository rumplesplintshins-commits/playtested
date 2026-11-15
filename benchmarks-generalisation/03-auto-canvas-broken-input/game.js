const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const startButton = document.getElementById("start");
const menu = document.getElementById("menu");
const statusDisplay = document.getElementById("status");

let running = false;
let animationFrameId = null;
let signalOffset = 0;

const ship = {
  x: canvas.width / 2,
  y: canvas.height - 80,
  width: 34,
  height: 42,
};

function drawBackground() {
  context.fillStyle = "#070a08";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#183521";
  context.lineWidth = 2;

  for (let y = -40; y < canvas.height + 40; y += 40) {
    const adjustedY =
      (y + signalOffset) % (canvas.height + 40);

    context.beginPath();
    context.moveTo(0, adjustedY);
    context.lineTo(canvas.width, adjustedY);
    context.stroke();
  }
}

function drawSignals() {
  for (let index = 0; index < 8; index += 1) {
    const x = 70 + index * 105;

    const y =
      ((index * 83 + signalOffset * 3) %
        (canvas.height + 100)) -
      50;

    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fillStyle = "#77f29b";
    context.fill();
  }
}

function drawShip() {
  context.fillStyle = "#f5f7f5";

  context.beginPath();
  context.moveTo(ship.x, ship.y);

  context.lineTo(
    ship.x - ship.width / 2,
    ship.y + ship.height
  );

  context.lineTo(
    ship.x + ship.width / 2,
    ship.y + ship.height
  );

  context.closePath();
  context.fill();
}

function render() {
  drawBackground();
  drawSignals();
  drawShip();
}

function gameLoop() {
  if (!running) {
    return;
  }

  signalOffset += 2;

  render();

  animationFrameId =
    window.requestAnimationFrame(gameLoop);
}

function startGame() {
  running = true;

  statusDisplay.textContent = "Running";
  menu.classList.add("hidden");

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
  }

  gameLoop();
}

/*
 * INTENTIONAL FAULT:
 *
 * There are deliberately NO keyboard event listeners.
 *
 * The canvas animates normally, but the player's ship
 * cannot move when A/D or the arrow keys are pressed.
 *
 * This tests whether Playtested V5 incorrectly treats
 * general canvas animation as successful interaction.
 */

startButton.addEventListener("click", startGame);

render();