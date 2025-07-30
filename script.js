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
  warmUpServer(); // Attiva il server ElevenLabs

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

function loadUserData(username) {
  fetch("https://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec")
    .then(res => res.json())
    .then(data => {
      workouts = data.workouts;
      const userWorkouts = data.userWorkouts[username] || [];
      const select = document.getElementById("workoutSelect");
      select.innerHTML = "";

      userWorkouts.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
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
    });
}

function updateWorkoutPreview() {
  const preview = document.getElementById("workout-preview");
  const list = document.getElementById("exercise-list");
  const visuals = document.getElementById("exercise-visuals");
  const instructionsBox = document.getElementById("instructions-box");
  const instructionsText = document.getElementById("instructions-text");

  list.innerHTML = "";
  document.getElementById("exercise-grid").innerHTML = "";

  const workout = selectedWorkout;
  if (!workout || !workout.exercises?.length) {
    preview.style.display = "none";
    visuals.style.display = "none";
    instructionsBox.style.display = "none";
    return;
  }

  workout.exercises.forEach(ex => {
    const li = document.createElement("li");
    li.textContent = `${ex.name} (${ex.duration}s)`;
    list.appendChild(li);
  });

  const seen = new Set();
  workout.exercises.forEach(ex => {
    if (seen.has(ex.name)) return;
    seen.add(ex.name);

    const card = document.createElement("div");
    card.className = "exercise-card";

    const name = document.createElement("div");
    name.textContent = ex.name;
    name.className = "exercise-name";

    const img = document.createElement("img");
    img.src = ex.imageUrl;
    img.alt = ex.name;

    card.appendChild(name);
    card.appendChild(img);
    document.getElementById("exercise-grid").appendChild(card);
  });

  instructionsBox.style.display = workout.instructions ? "block" : "none";
  if (workout.instructions) instructionsText.textContent = workout.instructions;

  preview.style.display = "block";
  visuals.style.display = "block";
}

function playExercise(index, exercises, resumeTime = null) {
  if (index >= exercises.length) {
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    document.getElementById("next-exercise-preview").style.display = "none";
    return;
  }

  const soundMode = document.getElementById("soundMode").value;
  const useVoice = soundMode === "voice";
  const useBip = soundMode === "bip";

  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];

  document.getElementById("exercise-name").innerHTML = "<strong>" + exercise.name + "</strong>";
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft ?? parseInt(exercise.duration);
  savedTimeLeft = null;
  document.getElementById("timer").textContent = timeLeft;

  if (useVoice) speak(exercise.name);

  clearInterval(interval);

  interval = setInterval(() => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft === 60 && useVoice) speak("mancano sessanta secondi");
    if (timeLeft === 30 && useVoice) speak("mancano trenta secondi");
    
    if (timeLeft === 10) {
      // Mostra anteprima prossimo esercizio
      if (nextExercise) {
        document.getElementById("exercise-name").innerHTML = "prossimo esercizio:<br><strong>" + nextExercise.name + "</strong>";
        document.getElementById("exercise-gif").src = nextExercise.imageUrl;
    
        if (useVoice) speak("prossimo esercizio: " + nextExercise.name);
      }
    
      // Beep di preavviso
      if (useBip) playBeep();  // ← solo uno, valido per entrambi i casi
    }
    
    if (timeLeft === 5 && useVoice) speak("cinque");
    if (timeLeft === 3 && useVoice) speak("tre");


    if (timeLeft <= 0) {
      clearInterval(interval);
      document.getElementById("next-exercise-preview").style.display = "none";
      currentStep++;
      savedTimeLeft = null;
      setTimeout(() => playExercise(currentStep, exercises), 300);
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

async function speak(text) {
  try {
    const response = await fetch("https://eleven-server.onrender.com/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Errore server: " + errorText);
    }

    const blob = await response.blob();
    console.log("🎧 blob type:", blob.type, "size:", blob.size);

    if (blob.size === 0) throw new Error("Blob audio vuoto");

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("❌ Errore nel text-to-speech:", error);
  }
}


// 🔄 Ping server per "svegliarlo" subito dopo il login
async function warmUpServer() {
  try {
    await fetch("https://eleven-server.onrender.com/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Avvio del server completato" })
    });
    console.log("✅ Server ElevenLabs attivato");
  } catch (e) {
    console.warn("⚠️ Impossibile attivare subito il server:", e.message);
  }
}

function playBeep() {
  const beep = document.getElementById("beep-sound");
  if (beep) beep.play();
}

function playTransition() {
  const transition = document.getElementById("transition-sound");
  if (transition) transition.play();
}



