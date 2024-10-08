const controller = new AbortController();
const sizeRange = document.getElementById("game_size");
const sizeValue = document.getElementById("size_value");
const speedRange = document.getElementById("game_speed");
const speedValue = document.getElementById("speed_value");
const runBtn = document.getElementById("run_button");
const content = document.getElementById("content");
const canvas = document.getElementById("game_of_life");
const ctx = canvas.getContext("2d");

const arraySize = 200;
const deltas = [2000, 1500, 1000, 750, 500, 250, 175, 100, 50, 20, 10];

let gameSize = 0;
let game = undefined;
let lastGame = undefined;
let lineSize = 0;
let boardSize = 0;
let squareSize = 0;
let delta = 0;
let lastUpdate = 0;
let running = false;
let fpsTimeout = false;
let fpsCount = 0;
let currentFps = 0;
let generation = 0;
let population = 0;
let hover = undefined;

function init() {
    stopGame();
    game = new Array(arraySize ** 2);
    for (let i = 0; i < game.length; i++) {
        game[i] = false;
    }
    population = 0;
    generation = 0;
    lastGame = game.map(v => v);
    draw();
}

function gameLoop(now) {
    const elapsed = now - lastUpdate;
    if (elapsed >= deltas[delta]) {
        lastUpdate = now;
        calculate();
        draw();
        fps();
    }
    if (running) {
        requestAnimationFrame(gameLoop);
    }
}

function calculate() {
    generation++;
    population = 0;
    let someChanged = false;
    game = game.map((alive, idx) => {
        const y = Math.floor(idx / arraySize);
        const x = idx - (arraySize * y);

        const neighbors = countNeighbors(x, y);

        if (alive) {
            if (neighbors < 2 || neighbors > 3) {
                someChanged = true;
                return false;
            }
            population++;
        } else if(neighbors === 3) {
            someChanged = someChanged || !alive;
            population++;
            return true;
        }
        return alive;
    });
    if (!someChanged) {
        stopGame();
        draw();
    }
}

function countNeighbors(x, y) {
    let count = 0;
    const xEnd = Math.min(arraySize, x+2);
    const yEnd = Math.min(arraySize, y+2);
    for (let i = Math.max(0, y-1); i < yEnd; i++) {
        for (let j = Math.max(0, x-1); j < xEnd; j++) {
            const idx =  i * arraySize + j;
            if ((i !== y || j !== x) && game[idx]) {
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
            const idx = getGameIndex(j, i);
            const alive = game[idx];
            if (alive) {
                ctx.fillStyle = "rgb(100 100 100)";
            } else {
                ctx.fillStyle = "black";
            }
            const posX = j * mul + lineSize;
            ctx.fillRect(posX, posY, squareSize, squareSize);
        }
    }
    ctx.font = `bold 20px Helvetica`;
    ctx.fillStyle = "white";
    ctx.fillText(`FPS: ${currentFps}`, 10, 30);
    ctx.fillText(`Generation: ${generation}`, 10, 60);
    ctx.fillText(`Population: ${population}`, 10, 90);
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
                currentFps = fpsCount;
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
        const i = getGameIndex(x, y);
        game[i] = !game[i];
        generation = 0;
        population = getCurrentPopulation();
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

function getGameIndex(x, y) {
    const halfArr = Math.floor(arraySize / 2);
    const halfGame = Math.floor(gameSize / 2);
    const zero = halfArr - halfGame;
    const mappedX = zero + x;
    const mappedY = zero + y;
    return mappedY * arraySize + mappedX;
}

function unHover() {
    hover = undefined;
    draw();
}

function zoom(e) {
    if (e.deltaY > 0 && gameSize < 100) {
        sizeRange.value = gameSize / 5 + 1;
        changeSize();
    } else if (e.deltaY < 0 && gameSize > 5) {
        sizeRange.value = gameSize / 5 - 1;
        changeSize();
    }
}

function changeSize() {
    gameSize = sizeRange.value * 5;
    sizeValue.innerHTML = gameSize;
    resize();
}

function scrollSpeed(e) {
    const current = Number(speedRange.value);
    if (e.deltaY > 0 && current < 10) {
        speedRange.value = current + 1;
        changeSpeed();
    } else if (e.deltaY < 0 && current > 0) {
        speedRange.value = current - 1;
        changeSpeed();
    }
}

function changeSpeed() {
    delta = speedRange.value;
    speedValue.innerHTML = Math.round(1000 / deltas[delta]);
}

function stopGame() {
    runGame(undefined, false);
}

function runGame(e, overrideValue) {
    running = overrideValue ?? !running;
    runBtn.innerHTML = running ? "STOP" : "RUN";
    if (running) {
        lastGame = game.map(v => v);
        requestAnimationFrame(gameLoop);
    } else {
        fpsCount = 0;
        currentFps = 0;
    }
}

function resetGame() {
    stopGame();
    game = lastGame;
    generation = 0;
    population = getCurrentPopulation();
    draw();
}

function getCurrentPopulation() {
    return game.reduce((acc, curr) => curr ? acc + 1 : acc, 0);
}

sizeRange.addEventListener("change", changeSize);
sizeRange.addEventListener("wheel", zoom);
speedRange.addEventListener("change", changeSpeed);
speedRange.addEventListener("wheel", scrollSpeed);
canvas.addEventListener("click", clickCanvas);
canvas.addEventListener("mousemove", hoverCanvas);
canvas.addEventListener("mouseleave", unHover);
canvas.addEventListener("wheel", zoom);
window.addEventListener("resize", resize);
init();
changeSize();
changeSpeed();