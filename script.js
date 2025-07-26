let workouts = {};
let userWorkouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;

// --- LOGIN ---
document.getElementById("login-button").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  fetch("https://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("main-app").style.display = "block";

        const userSelect = document.getElementById("userSelect");
        setTimeout(() => {
          userSelect.value = username;
          userSelect.dispatchEvent(new Event("change"));
        }, 500);
      } else {
        document.getElementById("login-error").style.display = "block";
      }
    });
});

// --- LOAD WORKOUT DATA ---
document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbwBf7FvlhELlsuhtE7uR9m34NKInWqNYe95EqFo6VhR-s9EQ1Bc6WZVi-EbvNeCCYTbrw/exec")
    .then((response) => response.json())
    .then((data) => {
      workouts = data.workouts;
      userWorkouts = data.userWorkouts;

      const userSelect = document.getElementById("userSelect");
      const workoutSelect = document.getElementById("workoutSelect");

      userSelect.innerHTML = '<option disabled selected>Scegli un utente</option>';
      for (const user in userWorkouts) {
        const option = document.createElement("option");
        option.value = user;
        option.textContent = user;
        userSelect.appendChild(option);
      }

      userSelect.addEventListener("change", () => {
        const selectedUser = userSelect.value;
        const assigned = userWorkouts[selectedUser] || [];

        workoutSelect.innerHTML = '<option disabled selected>Seleziona un workout</option>';
        assigned.forEach((w) => {
          const option = document.createElement("option");
          option.value = w;
          option.textContent = w;
          workoutSelect.appendChild(option);
        });

        workoutSelect.disabled = false;
        document.getElementById("start-button").disabled = true;
        document.getElementById("workout-preview").style.display = "none";
      });

      workoutSelect.addEventListener("change", () => {
        const name = workoutSelect.value;
        selectedWorkout = workouts[name] || {};
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      });
    });

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "block";
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

  document.getElementById("exercise-name").textContent = exercise.name;
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft !== null ? savedTimeLeft : parseInt(exercise.duration);
  savedTimeLeft = null;

  document.getElementById("timer").textContent = timeLeft;
  clearInterval(interval);

  const beepMoments = [60, 30, 10, 5].filter(t => t < timeLeft);

  interval = setInterval(() => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (beepEnabled && beepMoments.includes(timeLeft)) beepAudio.play();

    if (timeLeft === 10 && nextExercise) {
      document.getElementById("next-exercise-name").textContent = nextExercise.name;
      document.getElementById("next-exercise-gif").src = nextExercise.imageUrl;
      document.getElementById("next-exercise-preview").style.display = "block";
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      document.getElementById("next-exercise-preview").style.display = "none";
      transitionSound.play();
      currentStep++;
      savedTimeLeft = null;
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
