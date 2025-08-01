let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
let lastSpeakTime = 0;
let currentSpeakId = 0;
const ttsAudio = new Audio();

const beppeSounds = {
  s60: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2060%20secondi.mp3",
  s30: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2030%20secondi.mp3",
  countdown5: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/count%20down%20pi%C3%B9%20veloce.MP3",
  prossimo: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/Prossimo%20esercizio.MP3"
};


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
      ttsAudio.src = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA...";
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
  document.getElementById("start-button").addEventListener("click", startWorkout);
  document.getElementById("start-button-bottom").addEventListener("click", startWorkout);

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
  warmUpServer();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("login-error");

  if (!username || !password) {
    errorBox.textContent = "Inserisci username e password.";
    errorBox.style.display = "block";
    return;
  }

  fetch(`https://script.google.com/macros/s/AKfycbwfJHC8f3tLhr4eT57KD9FKz0YmMy-tmt07hdOQQNwpi1FsGalrL4B-9lzRPoe0rW9A7A/exec?username=${username}&password=${password}`)
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
  fetch("https://script.google.com/macros/s/AKfycbwfJHC8f3tLhr4eT57KD9FKz0YmMy-tmt07hdOQQNwpi1FsGalrL4B-9lzRPoe0rW9A7A/exec")
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

async function playExercise(index, exercises, resumeTime = null) {
  if (index >= exercises.length) {
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    document.getElementById("next-exercise-preview").style.display = "none";
    return;
  }

  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];

  const currentReps = (exercise.reps && !exercise.name.toLowerCase().includes("istruz"))
    ? `<div style="font-size: 14px; font-weight: normal; margin-top: 4px;">${exercise.reps} reps</div>`
    : "";

  document.getElementById("exercise-name").innerHTML = `<strong>${exercise.name}</strong>${currentReps}`;
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  const duration = resumeTime !== null ? resumeTime : savedTimeLeft ?? parseInt(exercise.duration);
  savedTimeLeft = null;

  const soundMode = document.getElementById("soundMode").value;
  const useVoice = soundMode === "voice";

  if (useVoice) speak(exercise.name, detectLang(exercise.name));

  await startExerciseTimer(duration, exercise, nextExercise);
}

function resumeTimer() {
  clearInterval(interval);
  if (!savedTimeLeft || savedTimeLeft <= 0) {
    savedTimeLeft = parseInt(document.getElementById("timer").textContent);
  }

  const currentExercise = selectedWorkout.exercises[currentStep];
  const nextExercise = selectedWorkout.exercises[currentStep + 1];

  startExerciseTimer(savedTimeLeft, currentExercise, nextExercise);
}

async function startExerciseTimer(timeLeft, exercise, nextExercise) {
  const soundMode = document.getElementById("soundMode").value;
  const useVoice = soundMode === "voice";
  const useBip = soundMode === "bip";

  clearInterval(interval);
  interval = setInterval(async () => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft === 60) {
      if (useVoice) speak("mancano sessanta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s60);
    }

    if (timeLeft === 30) {
      if (useVoice) speak("mancano trenta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s30);
    }

    if (timeLeft === 10) {
      if (nextExercise) {
        const nextReps = (nextExercise.reps && !nextExercise.name.toLowerCase().includes("istruz"))
          ? `<div style="font-size: 13px; font-weight: normal; margin-top: 2px;">${nextExercise.reps} reps</div>`
          : "";
    
        document.getElementById("exercise-name").innerHTML =
          `prossimo esercizio:<br><strong>${nextExercise.name}</strong>${nextReps}`;
        document.getElementById("exercise-gif").src = nextExercise.imageUrl;
    
        // Riproduci annunci vocali a 10 secondi rimanenti
        if (soundMode === "beppe") {
          const urls = [beppeSounds.prossimo];
          if (nextExercise.audio) urls.push(nextExercise.audio);
          playBeppeAudioSequence(urls);
        } else if (useVoice) {
          announceNextExercise(nextExercise);
        }
      }
    
      if (useBip) playBeep();
    }



    if (timeLeft === 5) {
      if (useVoice) speak("cinque, quattro, tre, due, uno");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.countdown5);
    }


    if (timeLeft <= 0) {
      clearInterval(interval);
    
      // Avanza l'indice ORA
      currentStep++;
      const nextExercise = selectedWorkout.exercises[currentStep];
    
      // Pronuncia l'audioCambio del NUOVO esercizio in arrivo
      if (soundMode === "beppe") {
        const sequence = [];
        if (nextExercise?.audioCambio) {
          sequence.push(nextExercise.audioCambio);
        }
        if (sequence.length > 0) {
          playBeppeAudioSequence(sequence);
        }
      } else if (useVoice && nextExercise) {
            speak(nextExercise.name, detectLang(nextExercise.name));
      }

    
      if (useBip) playTransition();
    
      document.getElementById("next-exercise-preview").style.display = "none";
      savedTimeLeft = null;
    
      // Aspetta un attimo prima di partire col nuovo esercizio
      setTimeout(() => playExercise(currentStep, selectedWorkout.exercises), 300);
    }


  }, 1000);
}


// 🔊 Text-to-speech (Google + fallback)
let fallbackVoice = null;

function getUnifiedVoice() {
  const voices = speechSynthesis.getVoices();
  if (fallbackVoice) return fallbackVoice;

  // Prefer voices that support both it-IT and en-US
  const priorityNames = [
    "Google italiano", "Google UK English", "Google US English", "Microsoft Elsa", "Microsoft Aria", "Microsoft Francesco"
  ];

  fallbackVoice = voices.find(v => priorityNames.includes(v.name))
               || voices.find(v => v.lang.startsWith("en") || v.lang.startsWith("it"))
               || voices[0];

  return fallbackVoice;
}


function detectLang(text) {
  const italianIndicators = /[àèéìòù]|mancano|secondi|esercizio|istruz|riposo|pausa/i;
  if (italianIndicators.test(text)) return "it-IT";

  return "en-US"; // default fallback
}



async function speak(text, lang = "it-IT") {
  try {
    const voice = lang === "it-IT" ? "it-IT-Wavenet-C" : "en-US-Wavenet-D";

    const response = await fetch("https://google-tts-server.onrender.com/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, voice }),
    });

    if (!response.ok) throw new Error("Errore TTS");

    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Audio vuoto");

    const audioUrl = URL.createObjectURL(blob);
    ttsAudio.src = audioUrl;

    await new Promise((resolve, reject) => {
      ttsAudio.onended = resolve;
      ttsAudio.onerror = reject;
      ttsAudio.play();
    });
  } catch (error) {
    console.warn("❌ Google TTS fallito, uso fallback:", error);
    await new Promise(resolve => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1.0;
      utter.onend = resolve;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    });
  }
}



async function speakSequence(segments) {
  for (const segment of segments) {
    await speak(segment.text, segment.lang);
  }
}

async function announceNextExercise(nextExercise) {
  await speakSequence([
    { text: "prossimo esercizio:", lang: "it-IT" },
    { text: nextExercise.name, lang: detectLang(nextExercise.name) }
  ]);
}

function warmUpServer() {
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

function playBeppeAudio(url) {
  if (!url) return;
  const audio = new Audio(convertGoogleDriveToDirect(url));
  audio.play();
}

function convertGoogleDriveToDirect(link) {
  return link; // già diretto, non serve conversione
}


async function playBeppeAudioSequence(urls) {
  for (const url of urls) {
    if (!url) continue;
    const directUrl = convertGoogleDriveToDirect(url);
    await new Promise((resolve, reject) => {
      const audio = new Audio(directUrl);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play();
    });
  }
}
