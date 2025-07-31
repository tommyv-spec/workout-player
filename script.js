let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
let lastSpeakTime = 0;
let currentSpeakId = 0;
const ttsAudio = new Audio();


function startWorkout() {
  document.getElementById("setup-screen").style.display = "none";
  document.querySelector("header").style.display = "none";
  document.getElementById("exercise-container").style.display = "flex";
  document.getElementById("workout-preview").style.display = "none";
  currentStep = 0;
  savedTimeLeft = null;
  playExercise(currentStep, selectedWorkout.exercises);
}

document.addEventListener("DOMContentLoaded", () => {
  warmUpServer();
  document.addEventListener("click", () => {
    if (!window.__audioUnlocked) {
      ttsAudio.src = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA..."; // 1s silenzio base64
      ttsAudio.play().then(() => {
        window.__audioUnlocked = true;
        console.log("🔓 Audio sbloccato su iOS");
      }).catch(() => console.warn("⚠️ Audio unlock fallito"));
    }
  }, { once: true });


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

  // 🟢 Pulsanti Start
  document.getElementById("start-button").addEventListener("click", startWorkout);
  document.getElementById("start-button-bottom").addEventListener("click", startWorkout);

  // 🟡 Pulsante Pausa
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

  fetch(`https://script.google.com/macros/s/AKfycbxJOD8yGw4l_h9_r4wQPF6JC2P7hlksihoqjVmw8LdFLOsI4FvV37aBss9suQMtjj1eFg/exec?username=${username}&password=${password}`)
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
  fetch("https://script.google.com/macros/s/AKfycbxJOD8yGw4l_h9_r4wQPF6JC2P7hlksihoqjVmw8LdFLOsI4FvV37aBss9suQMtjj1eFg/exec")
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
        document.getElementById("start-button-bottom").disabled = false;
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

  const currentReps = (exercise.reps && !exercise.name.toLowerCase().includes("istruz"))
  ? `<div style="font-size: 14px; font-weight: normal; margin-top: 4px;">${exercise.reps} reps</div>`
  : "";
  document.getElementById("exercise-name").innerHTML = `<strong>${exercise.name}</strong>${currentReps}`;


  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  let timeLeft = resumeTime !== null ? resumeTime : savedTimeLeft ?? parseInt(exercise.duration);
  savedTimeLeft = null;
  document.getElementById("timer").textContent = timeLeft;

  if (useVoice) speak(italianizeName(exercise.name));

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
      if (nextExercise) {
        const nextReps = (nextExercise.reps && !nextExercise.name.toLowerCase().includes("istruz"))
          ? `<div style="font-size: 13px; font-weight: normal; margin-top: 2px;">${nextExercise.reps} reps</div>`
          : "";
        document.getElementById("exercise-name").innerHTML = `prossimo esercizio:<br><strong>${nextExercise.name}</strong>${nextReps}`;

        document.getElementById("exercise-gif").src = nextExercise.imageUrl;
    
        if (useVoice) speak("prossimo esercizio: " + italianizeName(nextExercise.name));
      }
    
      if (useBip) playBeep(); // bip preavviso
    }
    
    if (timeLeft === 5 && useVoice) speak("cinque");
    if (timeLeft === 3 && useVoice) speak("tre");
    
    if (timeLeft <= 0) {
      if (useBip) playTransition(); // suono lungo al cambio esercizio
    
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

  const currentExercise = selectedWorkout.exercises[currentStep];
  const nextExercise = selectedWorkout.exercises[currentStep + 1];

  playTimerOnly(savedTimeLeft, currentExercise, nextExercise);
}

function playTimerOnly(timeLeft, exercise, nextExercise) {
  const soundMode = document.getElementById("soundMode").value;
  const useVoice = soundMode === "voice";
  const useBip = soundMode === "bip";

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
      if (nextExercise) {
        const nextReps = (nextExercise.reps && !nextExercise.name.toLowerCase().includes("istruz"))
          ? `<div style="font-size: 13px; font-weight: normal; margin-top: 2px;">${nextExercise.reps} reps</div>`
          : "";

        document.getElementById("exercise-name").innerHTML = `prossimo esercizio:<br><strong>${nextExercise.name}</strong>${nextReps}`;
        document.getElementById("exercise-gif").src = nextExercise.imageUrl;

        if (useVoice) speak("prossimo esercizio: " + italianizeName(nextExercise.name));
      }

      if (useBip) playBeep();
    }

    if (timeLeft === 5 && useVoice) speak("cinque");
    if (timeLeft === 3 && useVoice) speak("tre");

    if (timeLeft <= 0) {
      if (useBip) playTransition();

      clearInterval(interval);
      document.getElementById("next-exercise-preview").style.display = "none";
      currentStep++;
      savedTimeLeft = null;
      setTimeout(() => playExercise(currentStep, selectedWorkout.exercises), 300);
    }
  }, 1000);
}


function italianizeName(name) {
  return name
    .replace(/Rest/gi, "riposo")
    .replace(/Arnold Press/gi, "arnold press")
    .replace(/Banded Pull Apart/gi, "bendit pul apart")
    .replace(/Bench Press/gi, "benc press")
    .replace(/Bicep Curl Alternated/gi, "baisep curl alternèitid")
    .replace(/Bicep Curl Crush Grip/gi, "baisep curl crasc grip")
    .replace(/Bicep Curl On Incline Bench/gi, "baisep curl su benc inclinata")
    .replace(/Bicep Curl/gi, "baisep curl")
    .replace(/Chest Fly/gi, "cest flai")
    .replace(/Cyclist Crunch/gi, "saiclist cranc")
    .replace(/Deadbug Pulse/gi, "dedbag pals")
    .replace(/Dips On Bench/gi, "dips su benc")
    .replace(/Frontal Raises/gi, "frontal resez")
    .replace(/Lateral Raises Seated/gi, "lateràl resez da seduto")
    .replace(/Lateral Raises/gi, "lateràl resez")
    .replace(/Military Press/gi, "militari press")
    .replace(/Mountain Climber/gi, "mauntain claimer")
    .replace(/Plank Pull Through/gi, "plenc pul thru")
    .replace(/Plank Push Through/gi, "plenc pusci thru")
    .replace(/Pullover/gi, "pullover")
    .replace(/Push Press/gi, "pusci press")
    .replace(/Quad Push Up/gi, "quad pusciap")
    .replace(/Rear Delt Raise Supine/gi, "riar delt reis supain")
    .replace(/Reverse Fly/gi, "rivers flai")
    .replace(/Rows Dx/gi, "rows destra")
    .replace(/Rows Sx/gi, "rows sinistra")
    .replace(/Spider Curl/gi, "spaider curl")
    .replace(/Strict Press/gi, "strict press")
    .replace(/Tuck Up/gi, "tac ap")
    .replace(/Tricep Ext Banded/gi, "traisep estensione bendit")
    .replace(/V Up Alternated/gi, "vi ap alternèitid")
    .replace(/Bench Press Inclined/gi, "benc press inclinata")
    .replace(/Tricep Press on Bench/gi, "traisep press su benc")
    .replace(/Split Squat Dx/gi, "split skuot destra")
    .replace(/Split Squat Sx/gi, "split skuot sinistra")
    .replace(/Clamshell Dx/gi, "clamshell destra")
    .replace(/Clamshell Sx/gi, "clamshell sinistra")
    .replace(/Rowing Snatch Dx/gi, "roing snac destra")
    .replace(/Rowing Snatch Sx/gi, "roing snac sinistra")
    .replace(/One Arm Bench Press Dx/gi, "one arm benc press destra")
    .replace(/One Arm Bench Press Sx/gi, "one arm benc press sinistra")
    .replace(/Cyclist Squat/gi, "saiclist skuot")
    .replace(/Hip Extension on Bench/gi, "hip estension su benc");
}




async function speak(text) {
  const speakId = ++currentSpeakId;
  lastSpeakTime = Date.now();
  const lang = detectLang(text); // 👈 lingua dinamica

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch("https://google-tts-server.onrender.com/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }), // 👈 passa anche lang
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error("Errore dal server TTS");

    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Risposta audio vuota");

    if (speakId !== currentSpeakId) return;

    const audioUrl = URL.createObjectURL(blob);
    ttsAudio.src = audioUrl;
    await ttsAudio.play();
  } catch (error) {
    console.warn("❌ Google TTS fallito, uso fallback:", error);

    if (Date.now() - lastSpeakTime < 2000 && speakId === currentSpeakId) {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = detectLang(text); // 👈 anche qui
      utter.rate = 1.0;
      synth.cancel();
      synth.speak(utter);
    }
  }
}

function detectLang(text) {
  // Se contiene accenti, vocali italiane o parole comuni italiane
  const italianIndicators = /[àèéìòù]|mancano|secondi|esercizio/i;
  if (italianIndicators.test(text)) return "it-IT";

  // Se contiene solo lettere inglesi e nessun simbolo italiano
  const englishIndicators = /^[a-zA-Z0-9\s]+$/;
  if (englishIndicators.test(text)) return "en-US";

  // Fallback default
  return "it-IT";
}




// 🔄 Ping server per "svegliarlo" subito dopo il login
async function warmUpServer() {
  fetch("https://google-tts-server.onrender.com")
    .then(() => console.log("✅ TTS server attivo"))
    .catch(() => console.warn("⚠️ Server TTS non raggiungibile"));
}

function playBeep() {
  const beep = document.getElementById("beep-sound");
  if (beep) beep.play();
}

function playTransition() {
  const transition = document.getElementById("transition-sound");
  if (transition) transition.play();
}



