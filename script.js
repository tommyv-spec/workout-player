let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
let lastSpeakTime = 0;
let currentSpeakId = 0;
const ttsAudio = new Audio();

let beppePlayer = new Audio();
beppePlayer.preload = "auto";

let beforeUnloadBound = false;
function bindBeforeUnload() {
  if (beforeUnloadBound) return;
  window.addEventListener("beforeunload", onBeforeUnload);
  beforeUnloadBound = true;
}
function unbindBeforeUnload() {
  if (!beforeUnloadBound) return;
  window.removeEventListener("beforeunload", onBeforeUnload);
  beforeUnloadBound = false;
}
function onBeforeUnload(e) {
  // Show native prompt
  e.preventDefault();
  e.returnValue = "";
}

const beppeSounds = {
  s60: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2060%20secondi.mp3",
  s30: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2030%20secondi.mp3",
  countdown5: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/count%20down%20pi%C3%B9%20veloce.MP3",
  prossimo: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/Prossimo%20esercizio.MP3"
};


function startWorkout() {
  if (
    !selectedWorkout ||
    !Array.isArray(selectedWorkout.exercises) ||
    selectedWorkout.exercises.length === 0
  ) {
    alert("Nessun workout valido selezionato.");
    return;
  }

  // Hide setup UI
  const setup = document.getElementById("setup-screen");
  const header = document.querySelector("header");
  const startBtn = document.getElementById("start-button-bottom");
  const exerciseContainer = document.getElementById("exercise-container");

  // NEW: hide the top selector and the setup gear as requested
  const topbarSelect = document.getElementById("topbar-select");              // exists only if you moved it above the card
  const setupGear = document.getElementById("setup-settings-button");         // bottom-left gear

  if (topbarSelect) topbarSelect.style.display = "none";
  if (setupGear) setupGear.style.display = "none";

  // SAFE: workout-preview may not exist in your HTML, so guard it
  const previewMaybe = document.getElementById("workout-preview");
  if (previewMaybe) previewMaybe.style.display = "none";

  // Show workout screen
  if (setup) setup.style.display = "none";
  if (header) header.style.display = "none";
  if (startBtn) startBtn.style.display = "none";
  if (exerciseContainer) exerciseContainer.style.display = "flex";

  // Lock body scroll during session
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  // Start
  currentStep = 0;
  savedTimeLeft = null;
  playExercise(currentStep, selectedWorkout.exercises);

  // carry over sound mode
  document.getElementById("soundMode").value =
    document.getElementById("soundMode-setup").value;
}


document.addEventListener("DOMContentLoaded", () => {
  warmUpServer();

  preloadAudio(Object.values(beppeSounds));
  preloadWorkoutAudios();

  document.getElementById("soundMode-setup").addEventListener("change", () => {
    const value = document.getElementById("soundMode-setup").value;
    document.getElementById("soundMode").value = value;
  });

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
  const __topStart = document.getElementById("start-button");
  if (__topStart) __topStart.addEventListener("click", startWorkout);
  const __bottomStart = document.getElementById("start-button-bottom");
  if (__bottomStart) __bottomStart.addEventListener("click", startWorkout);

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

  // Settings popup handlers
  document.getElementById("settings-button").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "flex";
  });

  document.getElementById("close-settings").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "none";
  });

  // Close popup when clicking outside
  document.getElementById("settings-popup").addEventListener("click", (e) => {
    if (e.target.id === "settings-popup") {
      document.getElementById("settings-popup").style.display = "none";
    }
  });

  // Setup Settings popup handlers
  document.getElementById("setup-settings-button").addEventListener("click", () => {
    document.getElementById("setup-settings-popup").style.display = "flex";
  });

  document.getElementById("close-setup-settings").addEventListener("click", () => {
    document.getElementById("setup-settings-popup").style.display = "none";
  });

  // Close setup settings popup when clicking outside
  document.getElementById("setup-settings-popup").addEventListener("click", (e) => {
    if (e.target.id === "setup-settings-popup") {
      document.getElementById("setup-settings-popup").style.display = "none";
    }
  });

  // Instructions collapse handler
  document.getElementById("instructions-header").addEventListener("click", () => {
    const header = document.getElementById("instructions-header");
    const content = document.getElementById("instructions-content");
    const icon = document.getElementById("instructions-collapse-icon");
    
    header.classList.toggle("collapsed");
    content.classList.toggle("collapsed");
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

  fetch(`https://script.google.com/macros/s/AKfycbz4_g-8ILVood23UimLreJMaAEd5LKvVVluVsGL9aa2N6Qn8O6JDMBxytSY1DEJA3QYVQ/exec?username=${username}&password=${password}`)
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
  fetch("https://script.google.com/macros/s/AKfycbz4_g-8ILVood23UimLreJMaAEd5LKvVVluVsGL9aa2N6Qn8O6JDMBxytSY1DEJA3QYVQ/exec")
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
        const __topStart2 = document.getElementById("start-button"); if (__topStart2) __topStart2.disabled = false;
        const __bottomStart2 = document.getElementById("start-button-bottom"); if (__bottomStart2) __bottomStart2.disabled = false;
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
  const previewTitle = document.getElementById("workout-preview-title");
  const list = document.getElementById("exercise-list");
  const visuals = document.getElementById("exercise-visuals");
  const instructionsSection = document.getElementById("instructions-section");
  const instructionsText = document.getElementById("instructions-text");
  const instructionsImage = document.getElementById("instructions-image");
  const materialeSection = document.getElementById("materiale-section");
  const materialeList = document.getElementById("materiale-list");

  if (list) list.innerHTML = "";
  const __grid = document.getElementById("exercise-grid"); if (__grid) __grid.innerHTML = "";
  if (materialeList) materialeList.innerHTML = "";

  const workout = selectedWorkout;
  if (!workout || !workout.exercises?.length) {
    if (preview) preview.style.display = "none";
    if (previewTitle) previewTitle.style.display = "none";
    if (visuals) visuals.style.display = "none";
    if (instructionsSection) instructionsSection.style.display = "none";
    if (materialeSection) materialeSection.style.display = "none";
    return;
  }

  // === HANDLE INSTRUCTIONS ===
  const defaultInstructionsText = "Instructions test";
  const defaultInstructionsImage = "https://lh3.googleusercontent.com/d/16uLdZNld58oCEUdmL96xzeFP43ZtNbSF";
  
  if (instructionsSection) instructionsSection.style.display = "block";
  
  if (workout.instructions && workout.instructions.trim()) {
    // Use instructions from sheet
    instructionsText.textContent = workout.instructions;
    instructionsText.style.display = "block";
    instructionsImage.style.display = "none";
  } else {
    // Use default - using image as default (you can switch to text by commenting/uncommenting)
    // Option 1: Default text
    // instructionsText.textContent = defaultInstructionsText;
    // instructionsText.style.display = "block";
    // instructionsImage.style.display = "none";
    
    // Option 2: Default image (currently active)
    instructionsImage.src = defaultInstructionsImage;
    instructionsImage.style.display = "block";
    instructionsText.style.display = "none";
  }

  // === HANDLE MATERIALE (Unique equipment) ===
  const uniqueMateriale = new Set();
  workout.exercises.forEach(ex => {
    if (ex.tipoDiPeso && ex.tipoDiPeso.trim() && ex.block) {
      uniqueMateriale.add(ex.tipoDiPeso.trim());
    }
  });

  if (uniqueMateriale.size > 0) {
    materialeSection.style.display = "block";
    uniqueMateriale.forEach(item => {
      const materialeItem = document.createElement('div');
      materialeItem.className = 'materiale-item';
      materialeItem.textContent = item;
      materialeList.appendChild(materialeItem);
    });
  } else {
    materialeSection.style.display = "none";
  }

  // Group exercises by block
  const sections = {
    blocco1: [],
    blocco2: [],
    blocco3: []
  };

  workout.exercises.forEach(ex => {
    // Use explicit block field
    if (ex.block) {
      const blockLower = ex.block.toLowerCase();
      if (blockLower.includes('block 1') || blockLower.includes('blocco 1')) {
        sections.blocco1.push(ex);
      } else if (blockLower.includes('block 2') || blockLower.includes('blocco 2')) {
        sections.blocco2.push(ex);
      } else if (blockLower.includes('block 3') || blockLower.includes('blocco 3')) {
        sections.blocco3.push(ex);
      }
    }
  });

  const grid = document.getElementById("exercise-grid");
  
  const sectionConfigs = [
    { key: 'blocco1', title: 'BLOCCO 1', color: '#27AE60', icon: '💪' },
    { key: 'blocco2', title: 'BLOCCO 2', color: '#27AE60', icon: '💪' },
    { key: 'blocco3', title: 'BLOCCO 3', color: '#27AE60', icon: '💪' }
  ];

  sectionConfigs.forEach(config => {
    const exercises = sections[config.key];
    if (exercises.length === 0) return;

    // Remove duplicates
    const uniqueExercises = [];
    const seen = new Set();
    exercises.forEach(ex => {
      if (!seen.has(ex.name)) {
        seen.add(ex.name);
        uniqueExercises.push(ex);
      }
    });

    // Calculate rounds (use the first exercise's rounds value)
    const rounds = exercises[0]?.rounds || 0;

    const section = document.createElement('div');
    section.className = 'workout-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.style.background = `linear-gradient(135deg, ${config.color}, ${config.color}dd)`;
    header.innerHTML = `
      <span class="section-icon">${config.icon}</span>
      <span class="section-title">${config.title}</span>
      <span class="section-count">${uniqueExercises.length} es. | ${rounds} round</span>
    `;
    
    section.appendChild(header);

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'section-cards-grid';
    
    uniqueExercises.forEach(ex => {
      const card = document.createElement("div");
      card.className = "exercise-card";

      const img = document.createElement("img");
      img.src = ex.imageUrl;
      img.alt = ex.name;

      const name = document.createElement("div");
      name.textContent = ex.name;
      name.className = "exercise-name";

      const details = document.createElement("div");
      details.className = "exercise-details";

      if (ex.tipoDiPeso) {
        const equipment = document.createElement("div");
        equipment.className = "exercise-equipment";
        equipment.innerHTML = `<strong>🏋️</strong> ${ex.tipoDiPeso}`;
        details.appendChild(equipment);
      }

      if (ex.reps) {
        const reps = document.createElement("div");
        reps.className = "exercise-reps";
        reps.innerHTML = `<strong>Reps:</strong> ${ex.reps}`;
        details.appendChild(reps);
      }

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(details);
      cardsGrid.appendChild(card);
    });

    section.appendChild(cardsGrid);
    grid.appendChild(section);
  });

  if (preview) preview.style.display = "block";
  if (previewTitle) previewTitle.style.display = "block";
  if (visuals) visuals.style.display = "block";
}

async function playExercise(index, exercises, resumeTime = null) {
  if (index >= exercises.length) {
    // UI message (briefly show completion)
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    const nextPrev = document.getElementById("next-exercise-preview");
    if (nextPrev) nextPrev.style.display = "none";

    // Unlock scroll
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";

    // Restore setup UI
    const header = document.querySelector("header");
    const setup = document.getElementById("setup-screen");
    const startBtn = document.getElementById("start-button-bottom");
    const exerciseContainer = document.getElementById("exercise-container");
    const topbarSelect = document.getElementById("topbar-select");
    const setupGear = document.getElementById("setup-settings-button");

    if (exerciseContainer) exerciseContainer.style.display = "none";
    if (header) header.style.display = "";
    if (setup) setup.style.display = "";
    if (startBtn) startBtn.style.display = "";
    if (topbarSelect) topbarSelect.style.display = "block";
    if (setupGear) setupGear.style.display = "block";

    return;
  }


  const exercise = exercises[index];
  const nextExercise = exercises[index + 1];

  const currentReps = (exercise.reps && !exercise.name.toLowerCase().includes("istruz"))
    ? `<div style="font-size: 16px; font-weight: 600; margin-top: 8px; color: #FFD700;">${exercise.reps} reps</div>`
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

      // 🔁 LEGGI SEMPRE LA MODALITÀ ATTUALE
      const soundMode = document.getElementById("soundMode").value;
      const useVoice = soundMode === "voice";
      const useBip = soundMode === "bip";

    if (timeLeft === 60) {
      const soundMode = document.getElementById("soundMode").value;
      if (useVoice) speak("mancano sessanta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s60);
    }

    if (timeLeft === 30) {
      const soundMode = document.getElementById("soundMode").value;
      if (useVoice) speak("mancano trenta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s30);
    }

    if (timeLeft === 10) {
      const soundMode = document.getElementById("soundMode").value;
      if (nextExercise) {
        const nextReps = (nextExercise.reps && !nextExercise.name.toLowerCase().includes("istruz"))
          ? `<div style="font-size: 14px; font-weight: 600; margin-top: 4px; color: #FFD700;">${nextExercise.reps} reps</div>`
          : "";
    
        document.getElementById("exercise-name").innerHTML =
          `<div style="font-size: 14px; opacity: 0.8; margin-bottom: 4px;">prossimo esercizio:</div><strong style="font-size: 18px;">${nextExercise.name}</strong>${nextReps}`;
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
      const soundMode = document.getElementById("soundMode").value;
      if (useVoice) speak("cinque, quattro, tre, due, uno");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.countdown5);
    }


    if (timeLeft <= 0) {
      const soundMode = document.getElementById("soundMode").value;
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



// ===== CONFIG =====
const GOOGLE_TTS_URL = "https://google-tts-server.onrender.com/speak"; // keep your endpoint if different
const TTS_TIMEOUT_MS = 9000;
const TTS_RETRIES = 2; // retry Google TTS a couple of times before falling back

async function speak(text, lang = "it-IT") {
  const mode = document.getElementById("soundMode")?.value 
            || document.getElementById("soundMode-setup")?.value 
            || "voice";

  if (!text || mode === "none") return;

  // quick modes
  if (mode === "bip") { playBeep(); return; }
  if (mode === "beppe") { await playPreRecorded(text, lang); return; } // your own implementation

  // VOICE mode
  try {
    await ensureAudioUnlocked();           // iOS gating
    await tryGoogleTTS(text, lang);        // primary
  } catch (err) {
    console.warn("Google TTS failed, using Web Speech fallback:", err);
    try {
      await webSpeechSpeak(text, lang);    // fallback
    } catch (e2) {
      console.error("Web Speech also failed:", e2);
      // don’t throw again; swallow to avoid Uncaught (in promise)
    }
  }
}


async function tryGoogleTTS(text, lang) {
  let lastErr;
  for (let attempt = 0; attempt <= TTS_RETRIES; attempt++) {
    try {
      const audioUrl = await fetchTTS(text, lang);
      await playAudioUrl(audioUrl);
      URL.revokeObjectURL(audioUrl);
      return;
    } catch (e) {
      lastErr = e;
      await sleep(350 * (attempt + 1)); // tiny backoff for Render cold starts
    }
  }
  throw lastErr;
}

async function fetchTTS(text, lang) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  const res = await fetch(GOOGLE_TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
    signal: controller.signal
  }).catch(e => { throw new Error("Failed to fetch TTS: " + e.message); });

  clearTimeout(timeoutId);

  if (!res.ok) {
    // turn non-2xx into real errors we can catch/retry
    throw new Error(`TTS ${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function playAudioUrl(url) {
  let el = document.getElementById("tts-audio");
  if (!el) {
    el = new Audio();
    el.id = "tts-audio";
    el.preload = "auto";
    // Attach to DOM only if you want; not required
    document.body.appendChild(el);
  }
  el.src = url;
  el.currentTime = 0;

  // return a promise that resolves after playback starts (don’t block the app until "ended")
  try {
    await el.play();
  } catch (err) {
    // If autoplay policy resists, try user-gesture resume (ensureAudioUnlocked already tried)
    console.warn("Audio play() rejected:", err);
    throw err;
  }
}

async function ensureAudioUnlocked() {
  // One-time unlock pattern; safe to call many times
  if (window.__audioUnlocked) return;

  let ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { window.__audioUnlocked = true; return; }
    ctx = new AC();
    if (ctx.state === "suspended") await ctx.resume();
    // create a short silent buffer to satisfy iOS gesture requirement
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
    window.__audioUnlocked = true;
  } catch (e) {
    console.warn("Unable to unlock audio (iOS likely):", e);
    // We don’t throw—fallback TTS may still work after user gesture
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function webSpeechSpeak(text, lang) {
  if (!("speechSynthesis" in window)) throw new Error("Web Speech not supported");

  return new Promise((resolve, reject) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang || "it-IT";
      utter.rate = 1.0; utter.pitch = 1.0; utter.volume = 1.0;

      utter.onend = resolve;
      utter.onerror = e => reject(new Error("WebSpeech error: " + (e?.error || "unknown")));

      // Some browsers queue; cancel to keep it snappy
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (err) {
      reject(err);
    }
  });
}

function playBeep() {
  const el = document.getElementById("beep-sound");
  if (!el) return;
  try { el.currentTime = 0; el.play(); } catch (_) {}
}

// stub for your pre-recorded audio mode if you use it
async function playPreRecorded(text, lang) {
  // Your mapping logic here (text -> file). Safe no-op by default.
  console.log("Beppe mode (pre-recorded) not mapped for:", text);
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
  beppePlayer.src = convertGoogleDriveToDirect(url);
  beppePlayer.play().catch((e) => {
    console.warn("❌ Errore audio:", e);
  });
}


function convertGoogleDriveToDirect(link) {
  return link; // già diretto, non serve conversione
}


async function playBeppeAudioSequence(urls) {
  for (const url of urls) {
    if (!url) continue;
    beppePlayer.src = convertGoogleDriveToDirect(url);
    await new Promise((resolve) => {
      beppePlayer.onended = resolve;
      beppePlayer.onerror = resolve;
      beppePlayer.play().catch(resolve);
    });
  }
}



function preloadAudio(urls) {
  urls.forEach(url => {
    const audio = new Audio();
    audio.src = convertGoogleDriveToDirect(url);
    audio.preload = "auto";
  });
}


function preloadWorkoutAudios() {
  const audioUrls = [];

  Object.values(workouts).forEach(workout => {
    workout.exercises.forEach(ex => {
      if (ex.audio) audioUrls.push(ex.audio);
      if (ex.audioCambio) audioUrls.push(ex.audioCambio);
    });
  });

  preloadAudio(audioUrls);
}


document.addEventListener("click", () => {
  if (!window.__audioUnlocked) {
    beppePlayer.src = "data:audio/mp3;base64,//uQxAAAAAA=="; // 0.1s silenzioso
    beppePlayer.play().then(() => {
      window.__audioUnlocked = true;
      console.log("🔓 Audio sbloccato su iOS");
    }).catch(() => {
      console.warn("⚠️ Impossibile sbloccare audio su iOS");
    });
  }
}, { once: true });