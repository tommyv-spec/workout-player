let workouts = {};
let userWorkouts = {};
let selectedWorkout = null;
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbxOXzTXlBxlDCevGVOhveNTzRX5jgnw9X80cxpdAw6Kb3MGyv2b7SSCGtjm7YTNnbMW9w/exec")
    .then(response => response.json())
    .then(data => {
      workouts = data.workouts;
      userWorkouts = data.userWorkouts;

      const userSelect = document.getElementById("userSelect");
      const workoutSelect = document.getElementById("workoutSelect");

      // Popola utenti
      userSelect.innerHTML = '<option disabled selected>Scegli un utente</option>';
      for (const user in userWorkouts) {
        const opt = document.createElement("option");
        opt.value = user;
        opt.textContent = user;
        userSelect.appendChild(opt);
      }

      // Cambio utente → aggiorna i workout
      userSelect.addEventListener("change", () => {
        const selectedUser = userSelect.value;
        const userWods = userWorkouts[selectedUser] || [];

        workoutSelect.innerHTML = '<option disabled selected>Seleziona un workout</option>';
        userWods.forEach(wod => {
          const opt = document.createElement("option");
          opt.value = wod;
          opt.textContent = wod;
          workoutSelect.appendChild(opt);
        });

        workoutSelect.disabled = false;
        document.getElementById("start-button").disabled = true;
        document.getElementById("workout-preview").style.display = "none";
      });

      // Cambio workout → abilita start
      workoutSelect.addEventListener("change", () => {
        const selectedName = workoutSelect.value;
        selectedWorkout = workouts[selectedName];

        if (!selectedWorkout || !selectedWorkout.exercises) {
          console.warn("Workout non trovato o vuoto:", selectedName);
          document.getElementById("start-button").disabled = true;
          return;
        }

        console.log("Workout selezionato:", selectedWorkout);
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      });
    });
  
  // Start workout
  document.getElementById("start-button").addEventListener("click", () => {
    if (!selectedWorkout || !selectedWorkout.exercises) return;

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

  // Pausa / Riprendi
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
