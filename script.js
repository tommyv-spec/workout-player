let workouts = {};
let selectedWorkout = [];
let currentStep = 0;
let interval;

document.addEventListener("DOMContentLoaded", () => {
  fetch("https://script.google.com/macros/s/AKfycbxKvwNyzfrcecJSTlF0oIBHI3pJL-vkr0Er8f_mBxa8f6ef_OkDeKaC58LLyINElpgBSw/exec")
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
        updateWorkoutPreview();
      });

      if (select.options.length > 0) {
        select.selectedIndex = 0;
        selectedWorkout = workouts[select.value];
        document.getElementById("start-button").disabled = false;
        updateWorkoutPreview();
      }
    })
    .catch((error) => {
      console.error("Errore nel caricamento del JSON:", error);
    });

  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("setup-screen").style.display = "none";
    document.querySelector("header").style.display = "none";
    document.getElementById("exercise-container").style.display = "block";
    document.getElementById("workout-preview").style.display = "none"; // NASCONDE IL RECAP

    currentStep = 0;
    playExercise(currentStep);
  });
});

function playExercise(index) {
  if (index >= selectedWorkout.length) {
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    document.getElementById("next-exercise-preview").style.display = "none";
    return;
  }

  const beepFinalSeconds = parseInt(document.getElementById("beepSelect").value);
  const beepAudio = document.getElementById("beep-sound");

  const exercise = selectedWorkout[index];
  const nextExercise = selectedWorkout[index + 1];

  document.getElementById("exercise-name").textContent = exercise.name;
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  let timeLeft = parseInt(exercise.duration);
  document.getElementById("timer").textContent = timeLeft;
  clearInterval(interval);

  interval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (beepFinalSeconds > 0 && timeLeft <= beepFinalSeconds && timeLeft > 0) {
      beepAudio.play();
    }

    if (timeLeft === 3 && nextExercise) {
      document.getElementById("next-exercise-name").textContent = nextExercise.name;
      document.getElementById("next-exercise-gif").src = nextExercise.imageUrl;
      document.getElementById("next-exercise-preview").style.display = "block";
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      document.getElementById("next-exercise-preview").style.display = "none";
      currentStep++;
      setTimeout(() => playExercise(currentStep), 1000);
    }
  }, 1000);
}

// ✅ QUESTA FUNZIONE DEVE STARE FUORI DA playExercise
function updateWorkoutPreview() {
  const preview = document.getElementById("workout-preview");
  const list = document.getElementById("exercise-list");
  const instructionsBox = document.getElementById("instructions-box");
  const instructionsText = document.getElementById("instructions-text");

  list.innerHTML = ""; // Pulisce la lista precedente

  const workoutName = document.getElementById("workoutSelect").value;
  const workout = workouts[workoutName];

  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    preview.style.display = "none";
    instructionsBox.style.display = "none";
    return;
  }

  workout.exercises.forEach(ex => {
    const li = document.createElement("li");
    li.textContent = `${ex.name} (${ex.duration} sec)`;
    list.appendChild(li);
  });

  preview.style.display = "block";

  if (workout.instructions) {
    instructionsText.textContent = workout.instructions;
    instructionsBox.style.display = "block";
  } else {
    instructionsBox.style.display = "none";
  }
}

