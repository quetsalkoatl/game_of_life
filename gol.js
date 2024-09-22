const controller = new AbortController();
const fpsEl = document.getElementById("fps");
const sizeRange = document.getElementById("game_size");
const sizeValue = document.getElementById("size_value");
const speedRange = document.getElementById("game_speed");
const speedValue = document.getElementById("speed_value");
const runBtn = document.getElementById("run_button");
const content = document.getElementById("content");
const canvas = document.getElementById("game_of_life");
const ctx = canvas.getContext("2d");

let gameSize = 0;
let game = new Array();
let lastGame = game;
let lineSize = 0;
let boardSize = 0;
let squareSize = 0;
let delta = 0;
let lastUpdate = 0;
let running = false;
let fpsTimeout = false;
let fpsCount = 0;
let hover = undefined;

function init() {
    runGame(undefined, false);
    game = new Array(gameSize ** 2);
    for (let i = 0; i < game.length; i++) {
        game[i] = false;
    }
    lastGame = game;
    resize();
}

function gameLoop(now) {
    const elapsed = now - lastUpdate;
    if (elapsed >= delta) {
        lastUpdate = now;
        if (running) {
            calculate();
            draw();
            fps();
        }
    }
    requestAnimationFrame(gameLoop);
}

function calculate() {
    let someChanged = false;
    game = game.map((alive, idx) => {
        const y = Math.floor(idx / gameSize);
        const x = idx - (gameSize * y);

        const neighbors = countNeighbors(x, y);

        if (alive) {
            if (neighbors < 2 || neighbors > 3) {
                someChanged = true;
                return false;
            }
        } else if(neighbors === 3) {
            someChanged = someChanged || !alive;
            return true;
        }
        return alive;
    });
    if (!someChanged) {
        runGame(undefined, false);
        draw();
    }
}

function countNeighbors(x, y) {
    let count = 0;
    const xEnd = Math.min(gameSize, x+2);
    const yEnd = Math.min(gameSize, y+2);
    for (let i = Math.max(0, y-1); i < yEnd; i++) {
        for (let j = Math.max(0, x-1); j < xEnd; j++) {
            if ((i !== y || j !== x) && game[i * gameSize + j]) {
                count++;
            }
        }
    }
    return count;
}

function draw() {
    ctx.fillStyle = "rgb(50 50 50)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mul = squareSize + lineSize;
    for (let i = 0; i < gameSize; i++) {
        const posY = i * mul + lineSize;
        for (let j = 0; j < gameSize; j++) {
            const posX = j * mul + lineSize;
            const alive = game[i * gameSize + j];
            if (alive) {
                ctx.fillStyle = "rgb(100 100 100)";
            } else {
                ctx.fillStyle = "black";
            }
            ctx.fillRect(posX, posY, squareSize, squareSize);
        }
    }
    if (hover) {
        const posX = hover.x * mul + lineSize;
        const posY = hover.y * mul + lineSize;
        ctx.lineWidth = Math.max(1, lineSize / 3);
        ctx.strokeStyle = "rgb(150 150 150)";
        ctx.strokeRect(posX, posY, squareSize, squareSize);
    }
}

function fps() {
    fpsCount++;
    if (!fpsTimeout) {
        fpsTimeout = true;
        setTimeout(() => {
            if (running) {
                fpsEl.innerHTML = fpsCount;
                fpsCount = 0;
            }
            fpsTimeout = false;
        }, 1000);
    }
}

function resize() {
    canvas.width = 0;
    canvas.height = 0;

    const { width, height } = content.getBoundingClientRect();
    const actualBoardSize = (width < height ? width : height) - 3;
    lineSize = actualBoardSize / gameSize / 5;
    boardSize = actualBoardSize - lineSize;
    squareSize = (boardSize / gameSize) - lineSize;
    canvas.width = actualBoardSize;
    canvas.height = actualBoardSize;

    draw();
}

function clickCanvas(e) {
    if (running) {
        return;
    }
    const { x, y } = getSquareCoords(e.offsetX, e.offsetY);
    if (validCoords(x, y)) {
        const i = y * gameSize + x;
        game[i] = !game[i];
        draw();
    }
}

function hoverCanvas(e) {
    if (running) {
        return;
    }
    const { x, y } = getSquareCoords(e.offsetX, e.offsetY);
    const old = hover;
    if (validCoords(x, y)) {
        if ( old?.x !== x || old?.y !== y) {
            hover = { x: x, y: y };
            draw();
        }
    } else if (old) {
        hover = undefined;
        draw();
    }
}

function getSquareCoords(x, y) {
    const mul = squareSize + lineSize;
    const sub = lineSize / 2;
    const squareX = Math.floor((x - sub) / mul);
    const squareY = Math.floor((y - sub) / mul);
    return { x: squareX, y: squareY };
}

function validCoords(x, y) {
    return x >= 0 && x < gameSize && y >= 0 && y < gameSize;
}

function unHover() {
    hover = undefined;
    draw();
}

function changeSize() {
    gameSize = sizeRange.value * 5;
    sizeValue.innerHTML = gameSize;
    init();
}

function changeSpeed() {
    delta = Math.round(-1980 * Math.log10(speedRange.value) + 2000);
    speedValue.innerHTML = delta;
}

function runGame(e, overrideValue) {
    running = overrideValue ?? !running;
    runBtn.innerHTML = running ? "STOP" : "RUN";
    if (running) {
        lastGame = game;
    } else {
        fpsCount = 0;
        fpsEl.innerHTML = fpsCount;
    }
}

function resetGame() {
    game = lastGame;
    runGame(undefined, false);
    draw();
}

sizeRange.addEventListener("change", changeSize);
speedRange.addEventListener("change", changeSpeed);
canvas.addEventListener("click", clickCanvas);
canvas.addEventListener("mousemove", hoverCanvas);
canvas.addEventListener("mouseleave", unHover);
window.addEventListener("resize", resize);
changeSize();
changeSpeed();
requestAnimationFrame(gameLoop);