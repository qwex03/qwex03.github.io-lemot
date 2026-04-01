let board = document.querySelector(".board");
let keyboard = document.querySelector("#keyboard");
let toggleBtn = document.querySelector("#toggle-theme");
let restartBtn = document.querySelector("#restart-game");
let statusMessage = document.querySelector("#status-message");
let attemptLabel = document.querySelector("#attempt-label");

let word = [];
let lockedRows = new Set();
let currentRow = 0;
let currentCol = 0;
let gameEnded = false;

const WORD_LENGTH = 5;
const MAX_TRIES = 6;
const FALLBACK_WORDS = [
    "PLAGE", "LIVRE", "POMME", "FLEUR", "TABLE",
    "MONDE", "SUCRE", "RIVAL", "CHIEN", "POIRE"
];
const KEYBOARD_LAYOUT = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "W", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
];
const KEY_PRIORITY = {
    bad: 1,
    partial: 2,
    good: 3
};

toggleBtn.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.dataset.theme !== "light";
    html.dataset.theme = isDark ? "light" : "dark";
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
});

restartBtn.addEventListener("click", () => {
    startGame();
});

async function RandomWord() {
    try {
        let response = await fetch("https://random-words-api.kushcreates.com/api?language=fr&length=5&words=1");

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        let data = await response.json();
        let apiWord = data?.[0]?.word?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

        if (apiWord && /^[A-Z]{5}$/.test(apiWord)) {
            word = apiWord.split("");
            return;
        }
    } catch (error) {
        console.error("Error fetching random word:", error);
    }

    let fallbackWord = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
    word = fallbackWord.split("");
}

function createBoard() {
    board.innerHTML = "";

    for (let i = 0; i < MAX_TRIES; i++) {
        let row = document.createElement("div");
        row.classList.add("row");

        for (let j = 0; j < WORD_LENGTH; j++) {
            let input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.classList.add("tile");
            input.readOnly = true;
            input.tabIndex = -1;
            row.appendChild(input);
        }

        board.appendChild(row);
    }
}

function createKeyboard() {
    if (!keyboard) {
        return;
    }

    keyboard.innerHTML = "";

    KEYBOARD_LAYOUT.forEach((rowKeys) => {
        let row = document.createElement("div");
        row.classList.add("keyboard-row");

        rowKeys.forEach((key) => {
            let button = document.createElement("button");
            button.type = "button";
            button.dataset.key = key;
            button.textContent = key === "BACKSPACE" ? "EFF" : key;
            row.appendChild(button);
        });

        keyboard.appendChild(row);
    });
}

function getInputs() {
    return document.querySelectorAll(".tile");
}

function getRowValues(rowIndex) {
    let row = document.querySelectorAll(".row")[rowIndex];
    return Array.from(row.querySelectorAll("input")).map((input) => input.value.toUpperCase());
}

function setStatus(message) {
    if (statusMessage) {
        statusMessage.textContent = message;
    }
}

function updateAttemptLabel() {
    if (attemptLabel) {
        if (gameEnded) {
            return;
        }

        attemptLabel.textContent = `Essai ${Math.min(currentRow + 1, MAX_TRIES)} / ${MAX_TRIES}`;
    }
}

function focusCurrentInput() {
    let inputs = getInputs();
    let targetIndex = currentRow * WORD_LENGTH + currentCol;

    if (inputs[targetIndex] && !gameEnded) {
        inputs[targetIndex].focus();
    }
}

function addLetter(letter) {
    if (gameEnded || currentCol >= WORD_LENGTH) {
        return;
    }

    let inputs = getInputs();
    let index = currentRow * WORD_LENGTH + currentCol;
    inputs[index].value = letter;
    inputs[index].classList.add("filled");
    currentCol++;

    if (currentCol < WORD_LENGTH) {
        focusCurrentInput();
    }
}

function removeLetter() {
    if (gameEnded || currentCol === 0) {
        return;
    }

    currentCol--;
    let inputs = getInputs();
    let index = currentRow * WORD_LENGTH + currentCol;
    inputs[index].value = "";
    inputs[index].className = "tile";
    focusCurrentInput();
}

function paintKeyboardKey(letter, state) {
    if (!keyboard) {
        return;
    }

    let keyButton = keyboard.querySelector(`[data-key="${letter}"]`);
    if (!keyButton) {
        return;
    }

    let currentState = keyButton.dataset.state;
    if (currentState && KEY_PRIORITY[currentState] >= KEY_PRIORITY[state]) {
        return;
    }

    if (currentState) {
        keyButton.classList.remove(currentState);
    }

    keyButton.dataset.state = state;
    keyButton.classList.add(state);
}

function VerifyWord(Index, Letters) {
    let inputs = getInputs();
    let correctCount = 0;
    let results = Array(WORD_LENGTH).fill("bad");
    let remainingLetters = {};

    for (let i = 0; i < word.length; i++) {
        remainingLetters[word[i]] = (remainingLetters[word[i]] || 0) + 1;
    }

    for (let i = 0; i < Letters.length; i++) {
        if (Letters[i] === word[i]) {
            results[i] = "good";
            remainingLetters[Letters[i]]--;
            correctCount++;
        }
    }

    for (let i = 0; i < Letters.length; i++) {
        if (results[i] === "good") {
            continue;
        }

        if (remainingLetters[Letters[i]] > 0) {
            results[i] = "partial";
            remainingLetters[Letters[i]]--;
        }
    }

    results.forEach((result, i) => {
        setTimeout(() => {
            let tile = inputs[Index * WORD_LENGTH + i];
            tile.classList.remove("filled");
            tile.classList.add(result, "reveal");
            paintKeyboardKey(Letters[i], result);

            setTimeout(() => {
                tile.classList.remove("reveal");
            }, 200);

            if (i === Letters.length - 1) {
                if (correctCount === word.length) {
                    setTimeout(() => {
                        gameEnded = true;
                        setStatus("Bravo ! Tu as trouve le mot.");
                        if (attemptLabel) {
                            attemptLabel.textContent = `Trouve en ${Index + 1} / ${MAX_TRIES}`;
                        }
                    }, 220);
                } else if (Index === MAX_TRIES - 1) {
                    setTimeout(() => {
                        gameEnded = true;
                        setStatus(`Perdu ! Le mot etait : ${word.join("")}`);
                        if (attemptLabel) {
                            attemptLabel.textContent = "Partie terminee";
                        }
                    }, 220);
                }
            }
        }, i * 150);
    });
}

function submitRow() {
    if (gameEnded || lockedRows.has(currentRow)) {
        return;
    }

    let letters = getRowValues(currentRow);

    if (letters.includes("")) {
        setStatus("Complete les 5 lettres.");
        focusCurrentInput();
        return;
    }

    lockedRows.add(currentRow);
    setStatus("Verification...");
    VerifyWord(currentRow, letters);

    if (currentRow < MAX_TRIES - 1) {
        setTimeout(() => {
            if (!gameEnded) {
                currentRow++;
                currentCol = 0;
                updateAttemptLabel();
                setStatus("Continue.");
                focusCurrentInput();
            }
        }, WORD_LENGTH * 150 + 120);
    }
}

function normalizeKey(key) {
    if (key === "Enter") {
        return "ENTER";
    }

    if (key === "Backspace" || key === "Delete") {
        return "BACKSPACE";
    }

    key = key.toUpperCase();

    if (/^[A-Z]$/.test(key)) {
        return key;
    }

    return "";
}

function handleKey(key) {
    if (gameEnded) {
        return;
    }

    if (key === "ENTER") {
        submitRow();
        return;
    }

    if (key === "BACKSPACE") {
        removeLetter();
        return;
    }

    addLetter(key);
}

function attachInputEvents() {
    let inputs = getInputs();

    inputs.forEach((input, index) => {
        input.addEventListener("click", () => {
            if (gameEnded) {
                return;
            }

            let rowIndex = Math.floor(index / WORD_LENGTH);

            if (rowIndex !== currentRow) {
                focusCurrentInput();
                return;
            }

            currentCol = Math.min(index % WORD_LENGTH, getRowValues(currentRow).filter(Boolean).length);
            focusCurrentInput();
        });
    });
}

function attachKeyboardEvents() {
    document.addEventListener("keydown", (event) => {
        let key = normalizeKey(event.key);

        if (!key) {
            return;
        }

        event.preventDefault();
        handleKey(key);
    });

    if (keyboard) {
        keyboard.addEventListener("click", (event) => {
            let button = event.target.closest("button[data-key]");

            if (!button) {
                return;
            }

            handleKey(button.dataset.key);
        });
    }
}

function resetKeyboardColors() {
    if (!keyboard) {
        return;
    }

    keyboard.querySelectorAll("button[data-key]").forEach((button) => {
        button.classList.remove("good", "partial", "bad");
        delete button.dataset.state;
    });
}

async function startGame() {
    lockedRows.clear();
    currentRow = 0;
    currentCol = 0;
    gameEnded = true;

    setStatus("Chargement du mot...");
    updateAttemptLabel();
    resetKeyboardColors();

    await RandomWord();

    let inputs = getInputs();
    inputs.forEach((input) => {
        input.value = "";
        input.className = "tile";
    });

    gameEnded = false;
    setStatus("Utilise ton clavier ou celui en bas de l'ecran.");
    updateAttemptLabel();
    focusCurrentInput();
}

(async () => {
    createBoard();
    createKeyboard();
    attachInputEvents();
    attachKeyboardEvents();
    await startGame();
})();
