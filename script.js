
let workouts = {};
let selectedWorkout = [];
let currentStep = 0;
let interval;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbztq-AyVLRFwBF3S-DJ3rGIVcf0Zc_OWl5ZDdqUzLmAq0bcRiIGAHlDI4yjL8nRXZqzRQ/exec")
    .then((response) => response.json())
    .then((data) => {
      workouts = data;
      const select = document.getElementById("workoutSelect");
      select.innerHTML = "";

      for (const name in workouts) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        selectedWorkout = workouts[select.value];
        document.getElementById("start-button").disabled = false;
      });

      // Pre-select first workout
      if (select.options.length > 0) {
        select.selectedIndex = 0;
        selectedWorkout = workouts[select.value];
        document.getElementById("start-button").disabled = false;
      }
    })
    .catch((error) => {
      console.error("Errore nel caricamento del JSON:", error);
    });

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("exercise-container").style.display = "block";
    document.getElementById("start-button").style.display = "none";
    currentStep = 0;
    playExercise(currentStep);
  });
});

function playExercise(index) {
  if (index >= selectedWorkout.length) {
    document.getElementById("exercise-name").textContent = "Workout Complete!";
    document.getElementById("exercise-gif").src = exercise.imageUrl;
    document.getElementById("timer").textContent = "";
    return;
  }

  const exercise = selectedWorkout[index];
  document.getElementById("exercise-name").textContent = exercise.name;
  document.getElementById("exercise-gif").src = exercise.imageUrl;

  let timeLeft = parseInt(exercise.duration);
  document.getElementById("timer").textContent = timeLeft;
  clearInterval(interval);

  interval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      currentStep++;
      setTimeout(() => playExercise(currentStep), 1000);
    }
  }, 1000);
}
