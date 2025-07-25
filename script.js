let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbxKvwNyzfrcecJSTlF0oIBHI3pJL-vkr0Er8f_mBxa8f6ef_OkDeKaC58LLyINElpgBSw/exec")
    .then((response) => response.json())
    .then((data) => {
      workouts = data;
      const select = document.getElementById("workoutSelect");
      select.innerHTML = "";

      for (const name in data) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        selectedWorkout = workouts[select.value] || {};
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      });

      if (select.options.length > 0) {
        select.selectedIndex = 0;
        selectedWorkout = workouts[select.value];
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      }
    })
    .catch((error) => console.error("Errore nel caricamento del JSON:", error));

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "block";
    document.getElementById("workout-preview").style.display = "none";

    const workoutName = document.getElementById("workoutSelect").value;
    const workout = workouts[workoutName];

    if (workout.instructions) {
      document.getElementById("instructions-text").textContent = workout.instructions;
      document.getElementById("instructions-box").style.display = "block";
    }

    currentStep = 0;
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

  let timeLeft = resumeTime !== null ? resumeTime : parseInt(exercise.duration);
  savedTimeLeft = timeLeft;

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

    if (beepEnabled && beepMoments.includes(timeLeft)) {
      beepAudio.play();
    }

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
      setTimeout(() => playExercise(currentStep, exercises), 1000);
    }
  }, 1000);
}

function resumeTimer() {
  clearInterval(interval);

  const beepAudio = document.getElementById("beep-sound");
  const transitionSound = document.getElementById("transition-sound");
  const beepEnabled = document.getElementById("beepToggle").checked;

  const exercises = selectedWorkout.exercises;
  const nextExercise = exercises[currentStep + 1];
  const currentExercise = exercises[currentStep];
  const beepMoments = [60, 30, 10, 5].filter(t => t < currentExercise.duration);

  interval = setInterval(() => {
    if (isPaused) {
      clearInterval(interval);
      return;
    }

    savedTimeLeft--;
    document.getElementById("timer").textContent = savedTimeLeft;

    if (beepEnabled && beepMoments.includes(savedTimeLeft)) {
      beepAudio.play();
    }

    if (savedTimeLeft === 3 && nextExercise) {
      document.getElementById("next-exercise-name").textContent = nextExercise.name;
      document.getElementById("next-exercise-gif").src = nextExercise.imageUrl;
      document.getElementById("next-exercise-preview").style.display = "block";
    }

    if (savedTimeLeft <= 0) {
      clearInterval(interval);
      document.getElementById("next-exercise-preview").style.display = "none";
      transitionSound.play();
      currentStep++;
      setTimeout(() => playExercise(currentStep, exercises), 1000);
    }
  }, 1000);
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

  const workoutName = document.getElementById("workoutSelect").value;
  const workout = workouts[workoutName];

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
