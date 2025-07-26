// ✅ File completo: script.js aggiornato

let workouts = {};
let userWorkouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbxOXzTXlBxlDCevGVOhveNTzRX5jgnw9X80cxpdAw6Kb3MGyv2b7SSCGtjm7YTNnbMW9w/exec")
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
        const userAssignedWorkouts = userWorkouts[selectedUser] || [];

        workoutSelect.innerHTML = '<option disabled selected>Seleziona un workout</option>';
        userAssignedWorkouts.forEach((w) => {
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
        selectedWorkout = workouts[workoutSelect.value] || {};
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      });
    });

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "block";
    document.getElementById("workout-preview").style.display = "none";

    if (selectedWorkout.instructions) {
      document.getElementById("instructions-text").textContent = selectedWorkout.instructions;
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

function updateWorkoutPreview() {
  const preview = document.getElementById("workout-preview");
  const list = document.getElementById("exercise-list");
  const instructionsBox = document.getElementById("instructions-box");
  const instructionsText = document.getElementById("instructions-text");
  const exerciseGrid = document.getElementById("exercise-grid");
  const visuals = document.getElementById("exercise-visuals");

  list.innerHTML = "";
  exerciseGrid.innerHTML = "";

  // ✅ Controlla se l'oggetto ha la struttura corretta
  if (!selectedWorkout || !selectedWorkout.exercises || selectedWorkout.exercises.length === 0) {
    preview.style.display = "none";
    visuals.style.display = "none";
    instructionsBox.style.display = "none";
    return;
  }

  selectedWorkout.exercises.forEach((ex) => {
    const li = document.createElement("li");
    li.textContent = `${ex.name} (${ex.duration} sec)`;
    list.appendChild(li);
  });

  const seen = new Set();
  selectedWorkout.exercises.forEach((ex) => {
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

  if (selectedWorkout.instructions) {
    instructionsText.textContent = selectedWorkout.instructions;
    instructionsBox.style.display = "block";
  } else {
    instructionsBox.style.display = "none";
  }
}
