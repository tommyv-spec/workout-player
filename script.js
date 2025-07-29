// === SCRIPT PRINCIPALE CON TUTTE LE FUNZIONI RICHIESTE ===

let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;

const synth = window.speechSynthesis;

function speak(text) {
  const beepEnabled = document.getElementById("beepToggle").checked;
  if (!beepEnabled) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.voice = synth.getVoices().find(v => v.name.toLowerCase().includes("male") || v.gender === 'male') || synth.getVoices()[0];
  synth.speak(utterance);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("loggedUser");
  if (savedUser) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    loadUserData(savedUser);
  } else {
    document.getElementById("login-screen").style.display = "flex";
  }

  document.getElementById("login-button").addEventListener("click", login);
  document.getElementById("logout-button").addEventListener("click", logout);

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "flex";
    document.getElementById("workout-preview").style.display = "none";

    currentStep = 0;
    savedTimeLeft = null;
    playExercise(currentStep, selectedWorkout.exercises);
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

  const beepEnabled = document.getElementById("beepToggle").checked;
  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];

  document.getElementById("exercise-name").textContent = exercise.name;
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";
  document.getElementById("next-exercise-name").style.display = "none";
  document.getElementById("next-exercise-gif").style.display = "none";

  speak(exercise.name);

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft !== null ? savedTimeLeft : parseInt(exercise.duration);
  savedTimeLeft = null;

  document.getElementById("timer").textContent = timeLeft;
  clearInterval(interval);

  interval = setInterval(() => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft === 60 || timeLeft === 30) {
      const msg = `(${timeLeft} secondi rimasti)`;
      speak(`mancano ${timeLeft} secondi`);
      const timer = document.getElementById("timer");
      timer.textContent = msg;
    }

    if (timeLeft === 10 && nextExercise) {
      speak(`prossimo esercizio: ${nextExercise.name}`);
      document.getElementById("exercise-gif").style.display = "none";
      document.getElementById("exercise-name").style.display = "none";

      document.getElementById("next-exercise-preview").style.display = "flex";
      document.getElementById("next-exercise-name").textContent = nextExercise.name;
      document.getElementById("next-exercise-gif").src = nextExercise.imageUrl;
      document.getElementById("next-exercise-name").style.display = "block";
      document.getElementById("next-exercise-gif").style.display = "block";
    }

    if (timeLeft <= 5 && timeLeft > 0) {
      speak(timeLeft.toString());
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      currentStep++;
      savedTimeLeft = null;

      document.getElementById("next-exercise-preview").style.display = "none";
      document.getElementById("exercise-gif").style.display = "block";
      document.getElementById("exercise-name").style.display = "block";

      setTimeout(() => playExercise(currentStep, exercises), 1000);
    }
  }, 1000);
}

function resumeTimer() {
  clearInterval(interval);
  if (!savedTimeLeft || savedTimeLeft <= 0) {
    savedTimeLeft = parseInt(document.getElementById("timer").textContent);
  }
  playExercise(currentStep, selectedWorkout.exercises, savedTimeLeft);
}
