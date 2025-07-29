let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("loggedUser");

  if (savedUser) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    loadUserData(savedUser);
  } else {
    document.getElementById("login-screen").style.display = "block";
  }

  document.getElementById("login-button").addEventListener("click", login);
  document.getElementById("logout-button").addEventListener("click", logout);

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "flex";
    document.getElementById("workout-preview").style.display = "none";

    const workout = selectedWorkout;

    if (workout.instructions) {
      document.getElementById("instructions-text").textContent = workout.instructions;
      document.getElementById("instructions-box").style.display = "block";
    }

    currentStep = 0;
    savedTimeLeft = null;
    playExercise(currentStep, workout.exercises);
  });

  document.getElementById("pause-button").addEventListener("click", () => {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById("pause-button");

    if (isPaused) {
      clearInterval(interval);
      pauseBtn.textContent = "▶️ Riprendi";
    } else {
      pauseBtn.textContent = "⏸ Pausa";
      resumeTimer();
    }
  });
});

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("login-error");

  if (!username || !password) {
    errorBox.textContent = "Inserisci username e password.";
    errorBox.style.display = "block";
    return;
  }

  fetch(`https://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec?username=${username}&password=${password}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        localStorage.setItem("loggedUser", username);
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("main-app").style.display = "block";
        loadUserData(username);
      } else {
        errorBox.textContent = data.message;
        errorBox.style.display = "block";
      }
    })
    .catch(err => {
      console.error("Login error", err);
      errorBox.textContent = "Errore durante il login.";
      errorBox.style.display = "block";
    });
}

function loadUserData(username) {
  fetch("https://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec")
    .then((response) => response.json())
    .then((data) => {
      workouts = data.workouts;
      const userWorkouts = data.userWorkouts[username] || [];
      const select = document.getElementById("workoutSelect");

      select.innerHTML = "";

      userWorkouts.forEach((workoutName) => {
        const option = document.createElement("option");
        option.value = workoutName;
        option.textContent = workoutName;
        select.appendChild(option);
      });

      if (select.options.length > 0) {
        select.selectedIndex = 0;
        selectedWorkout = workouts[select.value];
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      }

      select.addEventListener("change", () => {
        selectedWorkout = workouts[select.value] || {};
        updateWorkoutPreview();
      });
    })
    .catch((error) => console.error("Errore nel caricamento del JSON:", error));
}

function logout() {
  localStorage.removeItem("loggedUser");
  location.reload();
}

function playExercise(index, exercises, resumeTime = null) {
  if (index >= exercises.length) {
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    document.getElementById("next-exercise-preview").style.display = "none";
    return;
  }

  const beepAudio = document.getElementById("beep-sound");
  const transitionSound = document.getElementById("transition-sound");
  const beepEnabled = document.getElementById("beepToggle").checked;

  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];

  const timerEl = document.getElementById("timer");
  const exerciseNameEl = document.getElementById("exercise-name");
  const exerciseGifEl = document.getElementById("exercise-gif");
  const nextNameEl = document.getElementById("next-exercise-name").querySelector("span");
  const nextGifEl = document.getElementById("next-exercise-gif");
  const nextPreviewEl = document.getElementById("next-exercise-preview");

  exerciseNameEl.textContent = exercise.name;
  exerciseGifEl.src = exercise.imageUrl;
  nextPreviewEl.style.display = "none";
  nextGifEl.style.display = "none";

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft !== null ? savedTimeLeft : parseInt(exercise.duration);
  savedTimeLeft = null;
  timerEl.textContent = timeLeft;
  clearInterval(interval);

  interval = setInterval(() => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    timerEl.textContent = timeLeft;

    // 2. Attiva/disattiva tutti i suoni con la checkbox
    if (beepEnabled && (timeLeft === 60 || timeLeft === 30)) {
      // 3. Al posto del suono, mostra solo testo
      const msg = document.createElement("div");
      msg.textContent = `(${timeLeft} seconds left)`;
      msg.style.fontSize = "16px";
      msg.style.color = "#FFD700";
      msg.style.marginBottom = "10px";
      msg.id = `msg-${timeLeft}`;
      document.getElementById("exercise-container").prepend(msg);
      setTimeout(() => {
        const oldMsg = document.getElementById(`msg-${timeLeft}`);
        if (oldMsg) oldMsg.remove();
      }, 3000);
    }

    // 4. A 10 secondi mostra solo il prossimo esercizio a schermo intero
    if (timeLeft === 10 && nextExercise) {
      nextNameEl.textContent = nextExercise.name;
      nextGifEl.src = nextExercise.imageUrl;
      nextPreviewEl.style.display = "flex";

      // Nasconde il corrente
      exerciseGifEl.style.display = "none";
      exerciseNameEl.style.display = "none";

      if (beepEnabled) speak(`Prossimo esercizio: ${nextExercise.name}`);
    }

    // 5. Conto alla rovescia vocale negli ultimi 5 secondi
    if (timeLeft <= 5 && timeLeft > 0 && beepEnabled) {
      speak(timeLeft.toString());
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      transitionSound.play();
      nextPreviewEl.style.display = "none";

      // Rende visibile di nuovo il corrente
      exerciseGifEl.style.display = "block";
      exerciseNameEl.style.display = "block";

      currentStep++;
      savedTimeLeft = null;
      setTimeout(() => playExercise(currentStep, exercises), 1000);
    }
  }, 1000);

  // 6. Dì il nome dell'esercizio all'inizio
  if (beepEnabled) speak(exercise.name);
}

function resumeTimer() {
  clearInterval(interval);
  if (!savedTimeLeft || savedTimeLeft <= 0) {
    savedTimeLeft = parseInt(document.getElementById("timer").textContent);
  }
  playExercise(currentStep, selectedWorkout.exercises, savedTimeLeft);
}

function updateWorkoutPreview() {
  const preview = document.getElementById("workout-preview");
  const list = document.getElementById("exercise-list");
  const instructionsBox = document.getElementById("instructions-box");
  const instructionsText = document.getElementById("instructions-text");
  const exerciseGrid = document.getElementById("exercise-grid");
  const visuals = document.getElementById("exercise-visuals");

  list.innerHTML = "";
  exerciseGrid.innerHTML = "";

  const workout = selectedWorkout;

  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    preview.style.display = "none";
    instructionsBox.style.display = "none";
    visuals.style.display = "none";
    return;
  }

  workout.exercises.forEach((ex) => {
    const li = document.createElement("li");
    li.textContent = `${ex.name} (${ex.duration} sec)`;
    list.appendChild(li);
  });

  const seen = new Set();
  workout.exercises.forEach((ex) => {
    if (seen.has(ex.name)) return;
    seen.add(ex.name);

    const card = document.createElement("div");
    card.style.textAlign = "center";

    const name = document.createElement("div");
    name.textContent = ex.name;
    name.style.fontWeight = "bold";
    name.style.marginBottom = "5px";

    const img = document.createElement("img");
    img.src = ex.imageUrl;
    img.alt = ex.name;
    img.style.width = "100%";
    img.style.borderRadius = "8px";

    card.appendChild(name);
    card.appendChild(img);
    exerciseGrid.appendChild(card);
  });

  preview.style.display = "block";
  visuals.style.display = "block";

  if (workout.instructions) {
    instructionsText.textContent = workout.instructions;
    instructionsBox.style.display = "block";
  } else {
    instructionsBox.style.display = "none";
  }
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  speechSynthesis.speak(utterance);
}
