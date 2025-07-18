
let workouts = {};
let selectedWorkout = [];
let currentStep = 0;
let interval;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhAoacgLvrxleR_yTH7cXKRs8lpJ8fWX5RGBo8YrW1vy0ILWD5EBWGRl7PRuciWqCm0YmM09kTthIjWH0ew9V_roKz6ebdpdhdQj6dgOduxbkghVYBvFiH_PVVfdN_5bbdJ5m1j0M4EDLgVrTHeCBZEo9fq8h-orEMIiB126JHmoSAmut-tToTzbIJ6ZXHD7apVhlqztwhtd-Y_porW5BzAKpJYyQ0Z9Og7s-2iTAi5jYpVWOmpaTEJG0cYgjDfkmuljKductsomSnAJJPGiVaDpGGrZSwWLXec0QTw&lib=MFdDIcatX3PNdWBCp1iNxR3_sKjrJWoQ0")
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
    document.getElementById("exercise-gif").src = "";
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
