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

      // Popola select utenti
      userSelect.innerHTML = '<option disabled selected>Scegli un utente</option>';
      for (const user in userWorkouts) {
        const option = document.createElement("option");
        option.value = user;
        option.textContent = user;
        userSelect.appendChild(option);
      }

      // Quando scelgo utente → popola workout
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

      // Quando scelgo workout → abilita Start
      workoutSelect.addEventListener("change", () => {
        selectedWorkout = workouts[workoutSelect.value] || {};
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      });
    });
  
  // Inizio workout
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
