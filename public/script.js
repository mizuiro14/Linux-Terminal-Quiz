const startBtn = document.getElementById("startBtn");
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");

const questionEl = document.getElementById("question");
const counterEl = document.getElementById("counter");
const optionsEl = document.getElementById("options");
const infoBox = document.getElementById("infoBox");
const nextBtn = document.getElementById("nextBtn");

const finalScoreEl = document.getElementById("finalScore");
const reviewEl = document.getElementById("review");
const playAgainBtn = document.getElementById("playAgainBtn");

let currentQuestion = null;
let questionNumber = 0;
let score = 0;
const maxQuestions = 10;
let history = [];

// mapping helper
const LETTERS = ["A","B","C","D"];

startBtn.onclick = startGame;
playAgainBtn.onclick = startGame;
nextBtn.onclick = fetchQuestion;

// Start / reset
function startGame() {
  questionNumber = 0;
  score = 0;
  history = [];

  homeScreen.classList.remove("active");
  endScreen.classList.remove("active");
  gameScreen.classList.add("active");

  fetchQuestion();
}

async function fetchQuestion() {
  if (questionNumber >= maxQuestions) { // if max, end
    endGame();
    return;
  }

  questionNumber++;
  questionEl.textContent = "Generating question...";
  counterEl.textContent = `Question ${questionNumber} of ${maxQuestions} | Score: ${score}`;
  optionsEl.innerHTML = "";
  infoBox.style.display = "none";
  nextBtn.style.display = "none";

  try {
    const res = await fetch("/borbonSE", { method: "POST" });
    if (!res.ok) throw new Error("Server returned " + res.status);
    const data = await res.json();

    // store and render
    currentQuestion = data;
    renderQuestion();
  } catch (err) {
    console.error("Failed to fetch question:", err);
    questionEl.textContent = "Error generating question. See console.";
  }
}

function renderQuestion() {
  if (!currentQuestion) {
    questionEl.textContent = "No question loaded.";
    return;
  }

  questionEl.textContent = `${questionNumber}. ${currentQuestion.question}`;
  counterEl.textContent = `Question ${questionNumber} of ${maxQuestions} | Score: ${score}`;

  optionsEl.innerHTML = "";
  currentQuestion.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(idx, btn);
    optionsEl.appendChild(btn);
  });
}

function summarize(text) { //first sentence sng explanation
  if (!text) return "(no explanation)";
  const t = String(text).trim();
  const first = t.split(/\.|\n/)[0].trim();
  return first.endsWith(".") ? first : first + ".";
}

function handleAnswer(selectedIndex, clickedBtn) {
  if (!currentQuestion) return;
  const optionButtons = Array.from(optionsEl.querySelectorAll(".option"));  // stop double-click
  if (optionButtons.length === 0) return;

  optionButtons.forEach((b, idx) => {
    b.disabled = true; //answered
    if (idx === currentQuestion.correctIndex) b.classList.add("correct");
    if (idx === selectedIndex && idx !== currentQuestion.correctIndex) b.classList.add("wrong");
  });

  const correctIndex = currentQuestion.correctIndex;
  const selectedLetter = LETTERS[selectedIndex];
  const correctLetter = LETTERS[correctIndex];
  const selectedOpt = currentQuestion.options[selectedIndex];
  const correctOpt = currentQuestion.options[correctIndex];

  let shortHtml = "";
  if (selectedIndex === correctIndex) {
    score++;
    const short = summarize(currentQuestion.info?.[correctLetter] ?? currentQuestion.info?.[correctOpt]);
    shortHtml = `<strong>Explanation:</strong><br>
                  Correct — ${short}`;
  } else {
    const selShort = summarize(currentQuestion.info?.[selectedLetter] ?? currentQuestion.info?.[selectedOpt]);
    const corrShort = summarize(currentQuestion.info?.[correctLetter] ?? currentQuestion.info?.[correctOpt]);
    shortHtml = `<strong>Explanation:</strong><br>
                 Your answer: ${selectedOpt} — ${selShort}<br>
                 Correct answer: ${correctOpt} — ${corrShort}`;
  }

  infoBox.innerHTML = `
    ${shortHtml}
    <br>
    <button id="moreInfoBtn">More Info</button>
  `;
  infoBox.style.display = "inline-block"; //summary info box

  const moreBtn = document.getElementById("moreInfoBtn"); //more info btn plus show ang full explanation
  if (moreBtn) {
    moreBtn.onclick = () => {
      let full = "<h3>Full Explanations</h3>";
      currentQuestion.options.forEach((opt, idx) => {
        const letter = LETTERS[idx];
        const explanation = currentQuestion.info?.[letter] ?? currentQuestion.info?.[opt] ?? "(info not available)";
        full += `<p><strong>${opt}:</strong> ${explanation}</p>`;
      });
      infoBox.innerHTML = full;
      infoBox.style.display = "block";
    };
  }

  history.push({ //save qestion + info
    question: currentQuestion.question,
    options: currentQuestion.options.slice(),
    correctIndex: currentQuestion.correctIndex,
    selectedIndex,
    info: currentQuestion.info || {}
  });

  if (questionNumber >= maxQuestions) {
    nextBtn.textContent = "End Game"; //question 10 na
    nextBtn.onclick = endGame;
  } else {
    nextBtn.textContent = "Next Question";
    nextBtn.onclick = fetchQuestion;
  }
  nextBtn.style.display = "inline-block";
}

// End game + show review
function endGame() {
  gameScreen.classList.remove("active");
  endScreen.classList.add("active");

  finalScoreEl.textContent = `Final Score: ${score} / ${maxQuestions}`;
  reviewEl.innerHTML = "";

  history.forEach((entry, qIndex) => {
    const qDiv = document.createElement("div");
    qDiv.className = "review-q";

    const qTitle = document.createElement("p");
    qTitle.className = "question-title";
    qTitle.innerHTML = `<strong>${qIndex + 1}. ${entry.question}</strong>`;
    qDiv.appendChild(qTitle);

    // Answers as plain text lines
    entry.options.forEach((opt, idx) => {
      const line = document.createElement("div");
      line.className = "answer-line";

      // Choose display style:
      if (idx === entry.correctIndex) { //correct ans
        line.innerHTML = `[✔] <strong><u>${opt}</u></strong>`; 
        line.style.color = "#0f0";
      } else if (idx === entry.selectedIndex && idx !== entry.correctIndex) { //wrong ans
        line.innerHTML = `[X] ${opt}`;
        line.style.color = "#f00";
      } else {
        line.textContent = opt;
        line.style.color = "#003333"; //wla naselect
      }

      qDiv.appendChild(line);
    });

    const toggleBtn = document.createElement("button"); //explanation button
    toggleBtn.textContent = "Show Explanations";
    toggleBtn.className = "more-info-btn";
    qDiv.appendChild(toggleBtn);

    const explanationDiv = document.createElement("div");
    explanationDiv.style.display = "none";
    explanationDiv.style.marginTop = "8px";

    entry.options.forEach((opt, idx) => { //explanations plus fallback kung wla explanation
      const letter = LETTERS[idx];
      const explanation = entry.info?.[letter] ?? entry.info?.[opt] ?? "(info not available)";
      const expLine = document.createElement("p");
      expLine.innerHTML = `<strong>${opt}:</strong> ${explanation}`;
      explanationDiv.appendChild(expLine);
    });

    qDiv.appendChild(explanationDiv);

    toggleBtn.onclick = () => {
      if (explanationDiv.style.display === "none") {
        explanationDiv.style.display = "block";
        toggleBtn.textContent = "Hide Explanations";
      } else {
        explanationDiv.style.display = "none";
        toggleBtn.textContent = "Show Explanations";
      }
    };

    reviewEl.appendChild(qDiv);
  });
}
