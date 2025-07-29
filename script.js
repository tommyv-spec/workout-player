
// ✅ script.js finale aggiornato

let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
const synth = window.speechSynthesis;

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

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "it-IT";
  utter.pitch = 1.1;
  utter.rate = 1.2;
  utter.volume = 1;
  const voice = synth.getVoices().find(v => v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("male"));
  if (voice) utter.voice = voice;
  synth.speak(utter);
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("login-error");

  if (!username || !password) {
    errorBox.textContent = "Inserisci username e password.";
    errorBox.style.display = "block";
    return;
  }

  fetch(`hhttps://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec?username=${username}&password=${password}`)
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
    .catch(console.error);
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

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft !== null ? savedTimeLeft : parseInt(exercise.duration);
  savedTimeLeft = null;

  document.getElementById("timer").textContent = timeLeft;
  clearInterval(interval);

  if (index === 0) speak(exercise.name);

  interval = setInterval(() => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft === 60 && beepEnabled) speak("mancano 60 secondi");
    if (timeLeft === 30 && beepEnabled) speak("mancano 30 secondi");

    if (timeLeft === 10 && nextExercise) {
      document.getElementById("exercise-name").textContent = `Prossimo: ${nextExercise.name}`;
      document.getElementById("exercise-gif").src = nextExercise.imageUrl;
      speak(`Prossimo esercizio: ${nextExercise.name}`);
    }

    if (timeLeft <= 5 && timeLeft > 0 && beepEnabled) {
      speak(`${timeLeft}`);
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      currentStep++;
      savedTimeLeft = null;
      setTimeout(() => {
        playExercise(currentStep, exercises);
        speak(exercises[currentStep]?.name || "");
      }, 500);
    }

    timeLeft--;
  }, 1000);
}

function resumeTimer() {
  clearInterval(interval);
  if (!savedTimeLeft || savedTimeLeft <= 0) {
    savedTimeLeft = parseInt(document.getElementById("timer").textContent);
  }
  playExercise(currentStep, selectedWorkout.exercises, savedTimeLeft);
}

function updateWorkoutPreview() {
  // [unchanged content here, omitted for brevity]
}
