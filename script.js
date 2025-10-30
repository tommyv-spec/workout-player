let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
let lastSpeakTime = 0;
let currentSpeakId = 0;

function getSoundMode() {
  const v = (document.getElementById("soundMode")?.value || "").toLowerCase();
  // Accetta sia "beep" che "bip", internamente usiamo "bip"
  if (v === "beep") return "bip";
  return v;
}

// ============================================================
// 🔊 Audio initialization from script__5_.js
// ============================================================
const ttsAudio = new Audio();

let beppePlayer = new Audio();
beppePlayer.preload = "auto";

const beppeSounds = {
  s60: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2060%20secondi.mp3",
  s30: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/mancano%2030%20secondi.mp3",
  countdown5: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/count%20down%20pi%C3%B9%20veloce.MP3",
  prossimo: "https://github.com/tommyv-spec/workout-audio/raw/refs/heads/main/docs/Prossimo%20esercizio.MP3"
};

// NEW: Full workout sequence (warm-up + main workout)
let fullWorkoutSequence = [];

function buildFullWorkoutSequence(workout, includeWarmup = true) {
  const sequence = [];
  console.log("🔨 Building workout sequence...");
  console.log("📦 Workout data:", workout);

  if (!workout || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    console.error("❌ No valid workout data");
    return sequence;
  }

  const isBlockMarker = (ex) => {
    const nameLower = ex.name.toLowerCase();
    const blockLower = (ex.block || "").toLowerCase();
    return nameLower.includes("blocco") || nameLower.includes("block") ||
           nameLower === blockLower || ex.duration <= 5;
  };

  // PHASE 1: WARM-UP (if enabled)
  if (includeWarmup) {
    console.log("🔥 Building warm-up phase...");
    const uniqueExercises = [];
    const seenNames = new Set();

    workout.exercises.forEach(ex => {
      if (ex.block && !seenNames.has(ex.name) && !isBlockMarker(ex)) {
        seenNames.add(ex.name);
        uniqueExercises.push(ex);
      }
    });

    console.log(`📋 Found ${uniqueExercises.length} unique exercises for warm-up`);

    if (uniqueExercises.length > 0) {
      sequence.push({
        name: "Riscaldamento",
        duration: 5,
        imageUrl: "https://lh3.googleusercontent.com/d/1Ee4DY-EGnTI9YPrIB0wj6v8pX7KW8Hpt",
        isLabel: true
      });

      uniqueExercises.forEach(ex => {
        console.log(`  🔍 Exercise data for ${ex.name}:`, {
          practiceDuration: ex.practiceDuration,
          duration: ex.duration,
          hasP: 'practiceDuration' in ex
        });
        const warmupDuration = ex.practiceDuration || ex.duration || 20;
        console.log(`  ➕ Warm-up: ${ex.name} (${warmupDuration}s) ${ex.practiceDuration ? '✅ usando practiceDuration' : '⚠️ usando duration (fallback)'}`);

        sequence.push({
          name: ex.name,
          duration: warmupDuration,
          imageUrl: ex.imageUrl,
          reps: ex.reps,
          block: ex.block,
          tipoDiPeso: ex.tipoDiPeso,
          audio: ex.audio,
          audioCambio: ex.audioCambio,
          isWarmup: true,
          blockNumber: null,
          totalBlocks: null,
          roundNumber: null,
          totalRounds: null,
          exerciseNumber: null,
          totalExercises: null
        });
      });

      sequence.push({
        name: "Are you ready?",
        duration: 15,
        imageUrl: "https://lh3.googleusercontent.com/d/1FS2HKfaJ6MIfpyzJirU6dWQ7K-5kbC9j",
        isLabel: true
      });
    }
  }

  // PHASE 2: MAIN WORKOUT
  console.log("💪 Building main workout phase...");
  const blockGroups = {};
  workout.exercises.forEach(ex => {
    if (ex.block && !isBlockMarker(ex)) {
      if (!blockGroups[ex.block]) blockGroups[ex.block] = [];
      blockGroups[ex.block].push(ex);
    }
  });

  console.log("📊 Block groups:", Object.keys(blockGroups));
  const blockNames = Object.keys(blockGroups);
  const totalBlocks = blockNames.length;
  let blockNumber = 0;

  blockNames.forEach(blockName => {
    const exercises = blockGroups[blockName];
    if (exercises.length === 0) return;

    blockNumber++;
    console.log(`\n🎯 Processing block ${blockNumber}/${totalBlocks}: ${blockName} (${exercises.length} exercises)`);
    const rounds = exercises[0]?.rounds || 1;
    console.log(`  🔁 Rounds: ${rounds}`);

    for (let round = 0; round < rounds; round++) {
      console.log(`  📍 Round ${round + 1}/${rounds}`);
      let exerciseNumber = 0;
      exercises.forEach(ex => {
        exerciseNumber++;
        const exDuration = ex.duration || 30;
        console.log(`    ➕ ${ex.name} (${exDuration}s)`);
        sequence.push({
          name: ex.name,
          duration: exDuration,
          imageUrl: ex.imageUrl,
          reps: ex.reps,
          block: ex.block,
          tipoDiPeso: ex.tipoDiPeso,
          audio: ex.audio,
          audioCambio: ex.audioCambio,
          isWarmup: false,
          blockNumber: blockNumber,
          totalBlocks: totalBlocks,
          roundNumber: round + 1,
          totalRounds: rounds,
          exerciseNumber: exerciseNumber,
          totalExercises: exercises.length
        });
      });
    }
  });

  sequence.push({
    name: "Good Job",
    duration: 20,
    imageUrl: "https://lh3.googleusercontent.com/d/1Vs1-VgiJi8rTbssSj-2ThcyDraRoTE2g",
    isLabel: true
  });

  console.log(`\n✅ Workout sequence built: ${sequence.length} total steps`);
  console.log("📝 Full sequence:", sequence.map(s => `${s.name} (${s.duration}s)`));
  return sequence;
}

/**
 * Update the workout progress bar
 */
function updateProgressBar() {
  if (!fullWorkoutSequence || fullWorkoutSequence.length === 0) return;
  const currentExercise = fullWorkoutSequence[currentStep];
  if (!currentExercise) return;

  const totalSteps = fullWorkoutSequence.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const progressFill = document.getElementById("progress-fill");
  const progressPercentage = document.getElementById("progress-percentage");

  if (progressFill) progressFill.style.width = progressPercent + "%";
  if (progressPercentage) progressPercentage.textContent = progressPercent + "%";

  const progressBlock = document.getElementById("progress-block");
  const progressRound = document.getElementById("progress-round");
  const progressExercise = document.getElementById("progress-exercise");

  if (currentExercise.isWarmup) {
    if (progressBlock) progressBlock.textContent = "Warm-up";
    if (progressRound) progressRound.textContent = "";
    if (progressExercise) progressExercise.textContent = "";
  } else if (currentExercise.isLabel) {
    if (progressBlock) progressBlock.textContent = currentExercise.name;
    if (progressRound) progressRound.textContent = "";
    if (progressExercise) progressExercise.textContent = "";
  } else {
    if (progressBlock && currentExercise.blockNumber) {
      progressBlock.textContent = `Block ${currentExercise.blockNumber}/${currentExercise.totalBlocks}`;
    }
    if (progressRound && currentExercise.roundNumber) {
      progressRound.textContent = `Round ${currentExercise.roundNumber}/${currentExercise.totalRounds}`;
    }
    if (progressExercise && currentExercise.exerciseNumber) {
      progressExercise.textContent = `Exercise ${currentExercise.exerciseNumber}/${currentExercise.totalExercises}`;
    }
  }

  console.log(`📊 Progress: ${progressPercent}% | Step ${currentStep + 1}/${totalSteps}`);
}

/**
 * Exit workout and return to setup menu
 */
function exitWorkout() {
  console.log("🏠 Exiting workout...");
  if (interval) { clearInterval(interval); interval = null; }
  isPaused = false;
  savedTimeLeft = null;
  currentStep = 0;

  const settingsPopup = document.getElementById("settings-popup");
  if (settingsPopup) settingsPopup.style.display = "none";

  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.height = "";

  const header = document.querySelector("header");
  const setup = document.getElementById("setup-screen");
  const startBtn = document.getElementById("start-button-bottom");
  const exerciseContainer = document.getElementById("exercise-container");
  const topbarSelect = document.getElementById("topbar-select");
  const setupGear = document.getElementById("setup-settings-button");
  const bottomButtonsContainer = document.getElementById("bottom-buttons-container");

  if (exerciseContainer) exerciseContainer.style.display = "none";
  if (header) header.style.display = "";
  if (setup) setup.style.display = "";
  if (startBtn) startBtn.style.display = "";
  if (bottomButtonsContainer) bottomButtonsContainer.style.display = "";
  if (topbarSelect) topbarSelect.style.display = "block";
  if (setupGear) setupGear.style.display = "block";

  unbindBeforeUnload();
  console.log("✅ Returned to menu");
}

function startWorkout() {
  if (!selectedWorkout || !Array.isArray(selectedWorkout.exercises) || selectedWorkout.exercises.length === 0) {
    alert("Nessun workout valido selezionato.");
    return;
  }

  const warmupEnabled = document.getElementById("warmup-toggle")?.checked ?? true;
  fullWorkoutSequence = buildFullWorkoutSequence(selectedWorkout, warmupEnabled);

  if (fullWorkoutSequence.length === 0) {
    alert("Impossibile costruire la sequenza di allenamento.");
    return;
  }

  const setup = document.getElementById("setup-screen");
  const header = document.querySelector("header");
  const startBtn = document.getElementById("start-button-bottom");
  const exerciseContainer = document.getElementById("exercise-container");
  const bottomButtonsContainer = document.getElementById("bottom-buttons-container");

  const topbarSelect = document.getElementById("topbar-select");
  const setupGear = document.getElementById("setup-settings-button");
  if (topbarSelect) topbarSelect.style.display = "none";
  if (setupGear) setupGear.style.display = "none";

  const previewMaybe = document.getElementById("workout-preview");
  if (previewMaybe) previewMaybe.style.display = "none";

  if (setup) setup.style.display = "none";
  if (header) header.style.display = "none";
  if (startBtn) startBtn.style.display = "none";
  if (bottomButtonsContainer) bottomButtonsContainer.style.display = "none";
  if (exerciseContainer) exerciseContainer.style.display = "flex";

  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  let startIndex = 0;
  const phaseSelect = document.getElementById("start-phase-select");
  const roundSelect = document.getElementById("start-round-select");
  const exerciseSelect = document.getElementById("start-exercise-select");

  if (phaseSelect && phaseSelect.value !== "0") {
    if (exerciseSelect?.value && exerciseSelect.value !== "") {
      startIndex = parseInt(exerciseSelect.value);
      console.log(`🎯 Starting from specific exercise: index ${startIndex}`);
    } else if (roundSelect?.value && roundSelect.value !== "") {
      startIndex = parseInt(roundSelect.value);
      console.log(`🎯 Starting from Round: index ${startIndex}`);
    } else {
      startIndex = parseInt(phaseSelect.value);
      console.log(`🎯 Starting from block start: index ${startIndex}`);
    }
  }

  currentStep = startIndex;
  savedTimeLeft = null;
  playExercise(currentStep, fullWorkoutSequence);

  document.getElementById("soundMode").value =
    document.getElementById("soundMode-setup").value;
}

document.addEventListener("DOMContentLoaded", () => {
  // (Audio unlock centralizzato in alto — niente duplicati qui)
  warmUpServer();

  // Pre-warm per Safari: forza il populate delle voci
  if ("speechSynthesis" in window) {
    // Trigghera la popolazione iniziale
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { getUnifiedVoice(); };
  }


  preloadAudio(Object.values(beppeSounds));
  preloadWorkoutAudios();

  document.getElementById("soundMode-setup").addEventListener("change", () => {
  const raw = (document.getElementById("soundMode-setup").value || "").toLowerCase();
  document.getElementById("soundMode").value = (raw === "beep") ? "bip" : raw;

  });

  const savedWarmupPref = localStorage.getItem("warmupEnabled");
  if (savedWarmupPref !== null) {
    const toggle = document.getElementById("warmup-toggle");
    if (toggle) toggle.checked = savedWarmupPref === "true";
  }

  const warmupToggle = document.getElementById("warmup-toggle");
  if (warmupToggle) {
    warmupToggle.addEventListener("change", (e) => {
      localStorage.setItem("warmupEnabled", e.target.checked.toString());
    });
  }

  // Safari loads voices asynchronously → pick a valid voice when ready
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => { getUnifiedVoice(); };
  }

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

  document.getElementById("prev-exercise-button").addEventListener("click", () => {
    if (currentStep > 0) {
      clearInterval(interval);
      currentStep--;
      savedTimeLeft = null;
      isPaused = false;
      document.getElementById("pause-button").textContent = "⏸ Pausa";
      playExercise(currentStep, fullWorkoutSequence);
    }
  });

  document.getElementById("next-exercise-button").addEventListener("click", () => {
    if (currentStep < fullWorkoutSequence.length - 1) {
      clearInterval(interval);
      currentStep++;
      savedTimeLeft = null;
      isPaused = false;
      document.getElementById("pause-button").textContent = "⏸ Pausa";
      playExercise(currentStep, fullWorkoutSequence);
    }
  });

  document.getElementById("settings-button").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "flex";
  });

  document.getElementById("close-settings").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "none";
  });

  document.getElementById("exit-workout-button").addEventListener("click", () => {
    if (confirm("Sei sicuro di voler terminare l'allenamento?")) {
      exitWorkout();
    }
  });

  document.getElementById("settings-popup").addEventListener("click", (e) => {
    if (e.target.id === "settings-popup") {
      document.getElementById("settings-popup").style.display = "none";
    }
  });

  document.getElementById("setup-settings-button").addEventListener("click", () => {
    document.getElementById("setup-settings-popup").style.display = "flex";
  });

  document.getElementById("close-setup-settings").addEventListener("click", () => {
    document.getElementById("setup-settings-popup").style.display = "none";
  });

  document.getElementById("setup-settings-popup").addEventListener("click", (e) => {
    if (e.target.id === "setup-settings-popup") {
      document.getElementById("setup-settings-popup").style.display = "none";
    }
  });

  document.getElementById("instructions-header").addEventListener("click", () => {
    const header = document.getElementById("instructions-header");
    const content = document.getElementById("instructions-content");
    const icon = document.getElementById("instructions-collapse-icon");
    header.classList.toggle("collapsed");
    content.classList.toggle("collapsed");
  });

  document.addEventListener("keydown", (e) => {
    const exerciseContainer = document.getElementById("exercise-container");
    if (!exerciseContainer || exerciseContainer.style.display === "none") return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      document.getElementById("prev-exercise-button")?.click();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      document.getElementById("next-exercise-button")?.click();
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      document.getElementById("pause-button")?.click();
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

  fetch(`https://script.google.com/macros/s/AKfycbycit1jI48zkCHmMp1KG-IMoyXIV25UvQqOmUW8alUKOoieFCMZxFRPbHcMisjjlBQYiw/exec?username=${username}&password=${password}`)
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
  fetch("https://script.google.com/macros/s/AKfycbycit1jI48zkCHmMp1KG-IMoyXIV25UvQqOmUW8alUKOoieFCMZxFRPbHcMisjjlBQYiw/exec")
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
    instructionsText.textContent = workout.instructions;
    instructionsText.style.display = "block";
    instructionsImage.style.display = "none";
  } else {
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
  const sections = { blocco1: [], blocco2: [], blocco3: [] };
  workout.exercises.forEach(ex => {
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

    const uniqueExercises = [];
    const seen = new Set();
    exercises.forEach(ex => {
      if (!seen.has(ex.name)) {
        seen.add(ex.name);
        uniqueExercises.push(ex);
      }
    });

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

  // NEW: Build start point selector
  buildStartPointSelector();
}

/**
 * Build the start point selector menu - BLOCKS → ROUNDS → EXERCISES
 */
function buildStartPointSelector() {
  const selector = document.getElementById("start-point-selector");
  const phaseSelect = document.getElementById("start-phase-select");
  const roundContainer = document.getElementById("start-round-container");
  const roundSelect = document.getElementById("start-round-select");
  const exerciseContainer = document.getElementById("start-exercise-container");
  const exerciseSelect = document.getElementById("start-exercise-select");

  if (!selector || !phaseSelect || !selectedWorkout) return;
  selector.style.display = "block";

  const warmupEnabled = document.getElementById("warmup-toggle")?.checked ?? true;
  const tempSequence = buildFullWorkoutSequence(selectedWorkout, warmupEnabled);
  if (tempSequence.length === 0) return;

  phaseSelect.innerHTML = '<option value="0">Inizio workout (con riscaldamento)</option>';
  roundSelect.innerHTML = '';
  exerciseSelect.innerHTML = '';

  const mainWorkoutExercises = tempSequence.filter(ex =>
    !ex.isWarmup && ex.block && !ex.isLabel
  );

  console.log(`📊 Start Point Selector - Filtered to ${mainWorkoutExercises.length} main workout exercises (warm-up excluded)`);

  if (mainWorkoutExercises.length === 0) return;

  const blocks = [];
  let currentBlock = null;
  let blockStartIndex = -1;
  const exerciseSeenInCurrentBlock = new Map();

  mainWorkoutExercises.forEach((ex, relativeIndex) => {
    const originalIndex = tempSequence.indexOf(ex);

    if (ex.block !== currentBlock) {
      currentBlock = ex.block;
      blockStartIndex = relativeIndex;
      exerciseSeenInCurrentBlock.clear();

      blocks.push({
        name: ex.block,
        index: originalIndex,
        startRelativeIndex: relativeIndex,
        rounds: [],
        uniqueExercises: []
      });

      console.log(`🆕 New block detected: ${currentBlock} at index ${originalIndex}`);
    }

    const block = blocks[blocks.length - 1];

    if (!block.uniqueExercises.includes(ex.name)) {
      block.uniqueExercises.push(ex.name);
    }

    const firstOccurrenceIndex = exerciseSeenInCurrentBlock.get(ex.name);

    if (firstOccurrenceIndex === undefined) {
      exerciseSeenInCurrentBlock.set(ex.name, relativeIndex);
      let round = block.rounds.find(r => r.number === 1);
      if (!round) {
        round = { number: 1, firstExerciseIndex: originalIndex, exercises: [] };
        block.rounds.push(round);
        console.log(`  📍 Created Round 1 for ${currentBlock}`);
      }
      round.exercises.push({ name: ex.name, index: originalIndex });
    } else {
      const positionInBlock = relativeIndex - blockStartIndex;
      const uniqueCount = block.uniqueExercises.length;
      const roundNumber = Math.floor(positionInBlock / uniqueCount) + 1;

      let round = block.rounds.find(r => r.number === roundNumber);
      if (!round) {
        round = { number: roundNumber, firstExerciseIndex: originalIndex, exercises: [] };
        block.rounds.push(round);
        console.log(`  📍 Created Round ${roundNumber} for ${currentBlock} at index ${originalIndex}`);
      }
      round.exercises.push({ name: ex.name, index: originalIndex });
    }
  });

  console.log("📊 Start Point Selector - Blocks with Rounds:", blocks);

  blocks.forEach((block, idx) => {
    const option = document.createElement('option');
    option.value = block.index;
    option.textContent = `${idx + 1}. ${block.name} (${block.rounds.length} rounds)`;
    phaseSelect.appendChild(option);
  });

  const newPhaseSelect = phaseSelect.cloneNode(true);
  phaseSelect.parentNode.replaceChild(newPhaseSelect, phaseSelect);
  const newRoundSelect = roundSelect.cloneNode(true);
  roundSelect.parentNode.replaceChild(newRoundSelect, roundSelect);

  const phaseSelectFinal = document.getElementById("start-phase-select");
  const roundSelectFinal = document.getElementById("start-round-select");
  const exerciseSelectFinal = document.getElementById("start-exercise-select");

  phaseSelectFinal.addEventListener('change', function () {
    const selectedIndex = parseInt(this.value);

    if (selectedIndex === 0 || isNaN(selectedIndex)) {
      roundContainer.style.display = 'none';
      exerciseContainer.style.display = 'none';
      return;
    }

    const block = blocks.find(b => b.index === selectedIndex);
    if (!block || block.rounds.length === 0) {
      roundContainer.style.display = 'none';
      exerciseContainer.style.display = 'none';
      return;
    }

    roundContainer.style.display = 'block';
    exerciseContainer.style.display = 'none';
    roundSelectFinal.innerHTML = '<option value="">Inizio blocco (Round 1)</option>';

    block.rounds.forEach((round) => {
      const option = document.createElement('option');
      option.value = round.firstExerciseIndex;
      option.textContent = `Round ${round.number}`;
      option.dataset.roundNumber = round.number;
      roundSelectFinal.appendChild(option);
    });
  });

  roundSelectFinal.addEventListener('change', function () {
    const selectedBlockIndex = parseInt(phaseSelectFinal.value);
    const selectedRoundFirstIndex = parseInt(this.value);

    if (isNaN(selectedBlockIndex) || selectedBlockIndex === 0) {
      exerciseContainer.style.display = 'none';
      return;
    }

    const block = blocks.find(b => b.index === selectedBlockIndex);
    if (!block) {
      exerciseContainer.style.display = 'none';
      return;
    }

    if (isNaN(selectedRoundFirstIndex) || this.value === "") {
      exerciseContainer.style.display = 'none';
      return;
    }

    const round = block.rounds.find(r => r.firstExerciseIndex === selectedRoundFirstIndex);
    if (!round || round.exercises.length === 0) {
      exerciseContainer.style.display = 'none';
      return;
    }

    exerciseContainer.style.display = 'block';
    exerciseSelectFinal.innerHTML = '<option value="">Inizio round</option>';

    round.exercises.forEach((ex, idx) => {
      const option = document.createElement('option');
      option.value = ex.index;
      option.textContent = `${idx + 1}. ${ex.name}`;
      exerciseSelectFinal.appendChild(option);
    });
  });

  document.getElementById('reset-start-point').addEventListener('click', function () {
    phaseSelectFinal.value = '0';
    roundContainer.style.display = 'none';
    exerciseContainer.style.display = 'none';
    localStorage.removeItem('workoutStartIndex');
  });
}

async function playExercise(index, exercises, resumeTime = null) {
  if (index >= exercises.length) {
    document.getElementById("exercise-name").textContent = "Workout completato!";
    document.getElementById("exercise-gif").src = "";
    document.getElementById("timer").textContent = "";
    const nextPrev = document.getElementById("next-exercise-preview");
    if (nextPrev) nextPrev.style.display = "none";

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";

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

  const hasReps = exercise.reps && !exercise.name.toLowerCase().includes("istruz");
  const hasEquipment = exercise.tipoDiPeso && !exercise.name.toLowerCase().includes("istruz") && !exercise.isLabel;

  let infoText = "";
  if (hasReps && hasEquipment) {
    infoText = `${exercise.reps} reps | ${exercise.tipoDiPeso}`;
  } else if (hasReps) {
    infoText = `${exercise.reps} reps`;
  } else if (hasEquipment) {
    infoText = exercise.tipoDiPeso;
  }

  const currentInfo = infoText
    ? `<div style="font-size: 16px; font-weight: 600; margin-top: 8px; color: #FFD700;">${infoText}</div>`
    : "";

  document.getElementById("exercise-name").innerHTML = `<strong>${exercise.name}</strong>${currentInfo}`;
  document.getElementById("exercise-gif").src = exercise.imageUrl;
  document.getElementById("next-exercise-preview").style.display = "none";

  const timerEl = document.getElementById("timer");
  const gifEl = document.getElementById("exercise-gif");
  const exerciseNameBar = document.getElementById("exercise-name");

  timerEl.classList.remove("warning-10", "warning-6", "warning-3");
  gifEl.classList.remove("gif-glow");
  exerciseNameBar.classList.remove("next-preview-active");

  const duration = resumeTime !== null ? resumeTime : savedTimeLeft ?? parseInt(exercise.duration);
  savedTimeLeft = null;

  updateProgressBar();

  const soundMode = getSoundMode();
  const useVoice = soundMode === "voice";
  const useBip = soundMode === "bip";


  if (useVoice) speak(exercise.name, detectLang(exercise.name));

  await startExerciseTimer(duration, exercise, nextExercise);
}

function resumeTimer() {
  clearInterval(interval);
  if (!savedTimeLeft || savedTimeLeft <= 0) {
    savedTimeLeft = parseInt(document.getElementById("timer").textContent);
  }

  const currentExercise = fullWorkoutSequence[currentStep];
  const nextExercise = fullWorkoutSequence[currentStep + 1];

  startExerciseTimer(savedTimeLeft, currentExercise, nextExercise);
}

async function startExerciseTimer(timeLeft, exercise, nextExercise) {
  const soundModeInit = document.getElementById("soundMode").value;
  clearInterval(interval);

  interval = setInterval(async () => {
    if (isPaused) {
      savedTimeLeft = timeLeft;
      clearInterval(interval);
      return;
    }

    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    // 🔁 Always read current mode (allow mid-workout toggle)
    const soundMode = document.getElementById("soundMode").value;
    const useVoice = soundMode === "voice";
    const useBip = soundMode === "bip";

    if (timeLeft === 60) {
      if (useVoice) speak("mancano sessanta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s60);
    }

    if (timeLeft === 30) {
      if (useVoice) speak("mancano trenta secondi");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.s30);
    }

    if (timeLeft === 10) {
      const timerEl = document.getElementById("timer");
      const gifEl = document.getElementById("exercise-gif");
      const exerciseNameBar = document.getElementById("exercise-name");

      timerEl.classList.add("warning-10");
      gifEl.classList.add("gif-glow");
      exerciseNameBar.classList.add("next-preview-active");

      if (nextExercise) {
        const hasNextReps = nextExercise.reps && !nextExercise.name.toLowerCase().includes("istruz");
        const hasNextEquipment = nextExercise.tipoDiPeso && !nextExercise.name.toLowerCase().includes("istruz") && !nextExercise.isLabel;

        let nextInfoText = "";
        if (hasNextReps && hasNextEquipment) {
          nextInfoText = `${nextExercise.reps} reps | ${nextExercise.tipoDiPeso}`;
        } else if (hasNextReps) {
          nextInfoText = `${nextExercise.reps} reps`;
        } else if (hasNextEquipment) {
          nextInfoText = nextExercise.tipoDiPeso;
        }

        const nextInfo = nextInfoText
          ? `<div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${nextInfoText}</div>`
          : "";

        document.getElementById("exercise-name").innerHTML =
          `<div style="font-size: 14px; opacity: 0.8; margin-bottom: 4px;">prossimo esercizio:</div><strong style="font-size: 18px;">${nextExercise.name}</strong>${nextInfo}`;
        document.getElementById("exercise-gif").src = nextExercise.imageUrl;

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

    if (timeLeft === 6) {
      const timerEl = document.getElementById("timer");
      timerEl.classList.remove("warning-10");
      timerEl.classList.add("warning-6");
    }

    if (timeLeft === 3) {
      const timerEl = document.getElementById("timer");
      timerEl.classList.remove("warning-6");
      timerEl.classList.add("warning-3");
    }

    if (timeLeft === 5) {
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.countdown5);
      else if (useVoice) speak("cinque, quattro, tre, due, uno");
    }

    if (timeLeft <= 0) {
      clearInterval(interval);

      const timerEl = document.getElementById("timer");
      const gifEl = document.getElementById("exercise-gif");
      const exerciseNameBar = document.getElementById("exercise-name");

      timerEl.classList.remove("warning-10", "warning-6", "warning-3");
      gifEl.classList.remove("gif-glow");
      exerciseNameBar.classList.remove("next-preview-active");

      currentStep++;
      const nextExercise = fullWorkoutSequence[currentStep];

      if (soundMode === "beppe") {
        const sequence = [];
        if (nextExercise?.audioCambio) sequence.push(nextExercise.audioCambio);
        if (sequence.length > 0) playBeppeAudioSequence(sequence);
      } else if (soundMode === "voice" && nextExercise) {
        speak(nextExercise.name, detectLang(nextExercise.name));
      }

      if (soundMode === "bip") playTransition();

      document.getElementById("next-exercise-preview").style.display = "none";
      savedTimeLeft = null;

      setTimeout(() => playExercise(currentStep, fullWorkoutSequence), 300);
    }
  }, 1000);
}

// ============================================================
// 🔊 Text-to-speech and audio functions from script__5_.js
// ============================================================
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


// ============================================================
// 🔊 Audio unlock for iOS from script__5_.js
// ============================================================
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
