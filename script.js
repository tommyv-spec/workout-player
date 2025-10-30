let workouts = {};
let selectedWorkout = {};
let currentStep = 0;
let interval;
let isPaused = false;
let savedTimeLeft = null;
let lastSpeakTime = 0;
let currentSpeakId = 0;
const ttsAudio = new Audio();


ttsAudio.preload = "auto";
ttsAudio.playsInline = true;
ttsAudio.setAttribute("playsinline", "");
ttsAudio.setAttribute("webkit-playsinline", "");
// NEW: Full workout sequence (warm-up + main workout)
let fullWorkoutSequence = [];

let beppePlayer = new Audio();

beppePlayer.preload = "auto";
beppePlayer.playsInline = true;
beppePlayer.setAttribute("playsinline", "");
beppePlayer.setAttribute("webkit-playsinline", "");
beppePlayer.preload = "auto";

// ============================================================
// 🔊 SIMPLE iOS AUDIO UNLOCK - ONE UNIFIED FUNCTION
// ============================================================
function unlockAllAudio() {
  if (window.__audioUnlocked) return;
  console.log("🔊 Unlocking iOS audio...");

  try {
    // Unlock ttsAudio (voice mode)
    ttsAudio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhACA";
    ttsAudio.volume = 0.01;
    ttsAudio.play().then(() => {
      ttsAudio.volume = 1.0;
      console.log("  ✅ ttsAudio unlocked");
    }).catch(() => {});

    // Unlock beppePlayer (beppe mode)
    beppePlayer.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhACA";
    beppePlayer.volume = 0.01;
    beppePlayer.play().then(() => {
      beppePlayer.volume = 1.0;
      console.log("  ✅ beppePlayer unlocked");
    }).catch(() => {});

    // Unlock beep-sound element (beep mode)
    const beepEl = document.getElementById("beep-sound");
    if (beepEl) {
      beepEl.volume = 0.01;
      beepEl.play().then(() => {
        beepEl.pause();
        beepEl.currentTime = 0;
        beepEl.volume = 1.0;
        console.log("  ✅ beep-sound unlocked");
      }).catch(() => {});
    }

    // Unlock transition-sound
    const transitionEl = document.getElementById("transition-sound");
    if (transitionEl) {
      transitionEl.volume = 0.01;
      transitionEl.play().then(() => {
        transitionEl.pause();
        transitionEl.currentTime = 0;
        transitionEl.volume = 1.0;
        console.log("  ✅ transition-sound unlocked");
      }).catch(() => {});
    }

    window.__audioUnlocked = true;
    console.log("✅ iOS audio unlock complete!");
  } catch (error) {
    console.error("❌ Audio unlock error:", error);
  }
}

// Attach to first user interaction
document.addEventListener("touchstart", unlockAllAudio, { once: true, passive: true });
document.addEventListener("click", unlockAllAudio, { once: true });


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








/**
 * Build complete workout sequence with optional warm-up
 */
function buildFullWorkoutSequence(workout, includeWarmup = true) {
  const sequence = [];
  
  console.log("🔨 Building workout sequence...");
  console.log("📦 Workout data:", workout);
  
  if (!workout || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    console.error("❌ No valid workout data");
    return sequence;
  }

  // Helper function: check if an exercise is a block marker (not a real exercise)
  const isBlockMarker = (ex) => {
    const nameLower = ex.name.toLowerCase();
    const blockLower = (ex.block || "").toLowerCase();
    // If exercise name contains "blocco" or "block", it's likely a marker
    return nameLower.includes("blocco") || nameLower.includes("block") || 
           nameLower === blockLower || ex.duration <= 5;
  };

  // PHASE 1: WARM-UP (if enabled)
  if (includeWarmup) {
    console.log("🔥 Building warm-up phase...");
    const uniqueExercises = [];
    const seenNames = new Set();
    
    // Get unique exercises that are NOT block markers
    workout.exercises.forEach(ex => {
      if (ex.block && !seenNames.has(ex.name) && !isBlockMarker(ex)) {
        seenNames.add(ex.name);
        uniqueExercises.push(ex);
      }
    });

    console.log(`📋 Found ${uniqueExercises.length} unique exercises for warm-up`);

    if (uniqueExercises.length > 0) {
      // Add "Riscaldamento" label
      sequence.push({
        name: "Riscaldamento",
        duration: 5,
        imageUrl: "https://lh3.googleusercontent.com/d/1Ee4DY-EGnTI9YPrIB0wj6v8pX7KW8Hpt",
        isLabel: true
      });

      // Add each unique exercise ONCE at practice duration
      uniqueExercises.forEach(ex => {
        // DEBUG: Check what data we have
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
          // No block/round/exercise numbers for warmup
          blockNumber: null,
          totalBlocks: null,
          roundNumber: null,
          totalRounds: null,
          exerciseNumber: null,
          totalExercises: null
        });
      });

      // Add "Are you ready?" transition
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
  
  // Group exercises by block, excluding block markers
  workout.exercises.forEach(ex => {
    if (ex.block && !isBlockMarker(ex)) {
      if (!blockGroups[ex.block]) {
        blockGroups[ex.block] = [];
      }
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

    // REMOVED: No block label in the workout sequence
    // The blocks are just organizational, not separate steps

    const rounds = exercises[0]?.rounds || 1;
    console.log(`  🔁 Rounds: ${rounds}`);

    // Repeat exercises by rounds
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
          // Progress tracking metadata
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

  // Add completion
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
  
  // Calculate overall progress
  const totalSteps = fullWorkoutSequence.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);
  
  // Update progress bar
  const progressFill = document.getElementById("progress-fill");
  const progressPercentage = document.getElementById("progress-percentage");
  
  if (progressFill) {
    progressFill.style.width = progressPercent + "%";
  }
  
  if (progressPercentage) {
    progressPercentage.textContent = progressPercent + "%";
  }
  
  // Update info sections
  const progressBlock = document.getElementById("progress-block");
  const progressRound = document.getElementById("progress-round");
  const progressExercise = document.getElementById("progress-exercise");
  
  // For warmup and labels, show different info
  if (currentExercise.isWarmup) {
    if (progressBlock) progressBlock.textContent = "Warm-up";
    if (progressRound) progressRound.textContent = "";
    if (progressExercise) progressExercise.textContent = "";
  } else if (currentExercise.isLabel) {
    if (progressBlock) progressBlock.textContent = currentExercise.name;
    if (progressRound) progressRound.textContent = "";
    if (progressExercise) progressExercise.textContent = "";
  } else {
    // Main workout: show block/round/exercise numbers
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
  
  // Stop any running timer
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  
  // Reset workout state
  isPaused = false;
  savedTimeLeft = null;
  currentStep = 0;
  
  // Hide settings popup if open
  const settingsPopup = document.getElementById("settings-popup");
  if (settingsPopup) settingsPopup.style.display = "none";
  
  // Unlock body scroll
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
  const bottomButtonsContainer = document.getElementById("bottom-buttons-container"); // FIX: Get container reference
  
  if (exerciseContainer) exerciseContainer.style.display = "none";
  if (header) header.style.display = "";
  if (setup) setup.style.display = "";
  if (startBtn) startBtn.style.display = "";
  if (bottomButtonsContainer) bottomButtonsContainer.style.display = ""; // FIX: Show container again!
  if (topbarSelect) topbarSelect.style.display = "block";
  if (setupGear) setupGear.style.display = "block";
  
  // Unbind beforeunload warning
  unbindBeforeUnload();
  
  console.log("✅ Returned to menu");
}


function startWorkout() {
  if (
    !selectedWorkout ||
    !Array.isArray(selectedWorkout.exercises) ||
    selectedWorkout.exercises.length === 0
  ) {
    alert("Nessun workout valido selezionato.");
    return;
  }

  // NEW: Check if warm-up is enabled
  const warmupEnabled = document.getElementById("warmup-toggle")?.checked ?? true;
  
  // NEW: Build complete workout sequence
  fullWorkoutSequence = buildFullWorkoutSequence(selectedWorkout, warmupEnabled);
  
  if (fullWorkoutSequence.length === 0) {
    alert("Impossibile costruire la sequenza di allenamento.");
    return;
  }

  // Hide setup UI
  const setup = document.getElementById("setup-screen");
  const header = document.querySelector("header");
  const startBtn = document.getElementById("start-button-bottom");
  const exerciseContainer = document.getElementById("exercise-container");
  const bottomButtonsContainer = document.getElementById("bottom-buttons-container"); // FIX: Get container reference

  // NEW: hide the top selector and the setup gear as requested
  const topbarSelect = document.getElementById("topbar-select");
  const setupGear = document.getElementById("setup-settings-button");

  if (topbarSelect) topbarSelect.style.display = "none";
  if (setupGear) setupGear.style.display = "none";

  // SAFE: workout-preview may not exist in your HTML, so guard it
  const previewMaybe = document.getElementById("workout-preview");
  if (previewMaybe) previewMaybe.style.display = "none";

  // Show workout screen
  if (setup) setup.style.display = "none";
  if (header) header.style.display = "none";
  if (startBtn) startBtn.style.display = "none";
  if (bottomButtonsContainer) bottomButtonsContainer.style.display = "none"; // FIX: Hide entire bottom container!
  if (exerciseContainer) exerciseContainer.style.display = "flex";

  // Lock body scroll during session
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  // NEW: Check if user selected a custom start point (Block → Round → Exercise)
  let startIndex = 0;
  const phaseSelect = document.getElementById("start-phase-select");
  const roundSelect = document.getElementById("start-round-select");
  const exerciseSelect = document.getElementById("start-exercise-select");
  
  if (phaseSelect && phaseSelect.value !== "0") {
    // User selected a block
    
    // Priority 1: Specific exercise selected
    if (exerciseSelect?.value && exerciseSelect.value !== "") {
      startIndex = parseInt(exerciseSelect.value);
      console.log(`🎯 Starting from specific exercise: index ${startIndex}`);
    }
    // Priority 2: Round selected (but not specific exercise)
    else if (roundSelect?.value && roundSelect.value !== "") {
      // The round select now stores the firstExerciseIndex directly in its value
      startIndex = parseInt(roundSelect.value);
      console.log(`🎯 Starting from Round: index ${startIndex}`);
    }
    // Priority 3: Just block selected
    else {
      startIndex = parseInt(phaseSelect.value);
      console.log(`🎯 Starting from block start: index ${startIndex}`);
    }
  }

  // Start with the NEW full sequence
  currentStep = startIndex;
  savedTimeLeft = null;
  playExercise(currentStep, fullWorkoutSequence);

  // carry over sound mode
  document.getElementById("soundMode").value =
    document.getElementById("soundMode-setup").value;
}


document.addEventListener("DOMContentLoaded", () => {
  warmUpServer();

  // iOS audio unlock  
  document.addEventListener("click", () => {
    if (!window.__audioUnlocked) {
      ttsAudio.src = "data:audio/mp3;base64,//uQxAAAAAA==";
      ttsAudio.play().then(() => {
        window.__audioUnlocked = true;
        console.log("🔓 Audio sbloccato su iOS");
      }).catch(() => console.warn("⚠️ Audio unlock fallito"));
    }
  }, { once: true });

  preloadAudio(Object.values(beppeSounds));
  preloadWorkoutAudios();

  document.getElementById("soundMode-setup").addEventListener("change", () => {
    const value = document.getElementById("soundMode-setup").value;
    document.getElementById("soundMode").value = value;
  });

  // NEW: Load warm-up preference from localStorage
  const savedWarmupPref = localStorage.getItem("warmupEnabled");
  if (savedWarmupPref !== null) {
    const toggle = document.getElementById("warmup-toggle");
    if (toggle) toggle.checked = savedWarmupPref === "true";
  }

  // NEW: Save warm-up preference when changed
  const warmupToggle = document.getElementById("warmup-toggle");
  if (warmupToggle) {
    warmupToggle.addEventListener("change", (e) => {
      localStorage.setItem("warmupEnabled", e.target.checked.toString());
    });
  }

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

  // NEW: Navigation arrows
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

  // Settings popup handlers
  document.getElementById("settings-button").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "flex";
  });

  document.getElementById("close-settings").addEventListener("click", () => {
    document.getElementById("settings-popup").style.display = "none";
  });

  // NEW: Exit workout button - return to menu
  document.getElementById("exit-workout-button").addEventListener("click", () => {
    // Confirm with user
    if (confirm("Sei sicuro di voler terminare l'allenamento?")) {
      exitWorkout();
    }
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

  // NEW: Keyboard navigation (arrow keys)
  document.addEventListener("keydown", (e) => {
    const exerciseContainer = document.getElementById("exercise-container");
    // Only work if workout is active
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
  
  // Show selector
  selector.style.display = "block";
  
  // Get warm-up enabled state
  const warmupEnabled = document.getElementById("warmup-toggle")?.checked ?? true;
  
  // Build temp sequence to get structure
  const tempSequence = buildFullWorkoutSequence(selectedWorkout, warmupEnabled);
  
  if (tempSequence.length === 0) return;
  
  // Clear existing options
  phaseSelect.innerHTML = '<option value="0">Inizio workout (con riscaldamento)</option>';
  roundSelect.innerHTML = '';
  exerciseSelect.innerHTML = '';
  
  // Filter ONLY main workout exercises (exclude warm-up and labels)
  const mainWorkoutExercises = tempSequence.filter(ex => 
    !ex.isWarmup && // Exclude warm-up exercises
    ex.block && // Must have a block (real exercises)
    !ex.isLabel // Exclude labels like "Riscaldamento", "Are you ready", "Good Job"
  );
  
  console.log(`📊 Start Point Selector - Filtered to ${mainWorkoutExercises.length} main workout exercises (warm-up excluded)`);
  
  if (mainWorkoutExercises.length === 0) return;
  
  // Group exercises by block and identify rounds correctly
  const blocks = [];
  let currentBlock = null;
  let blockStartIndex = -1;
  const exerciseSeenInCurrentBlock = new Map(); // Track first occurrence of each exercise in current block
  
  mainWorkoutExercises.forEach((ex, relativeIndex) => {
    // Find original index in full sequence
    const originalIndex = tempSequence.indexOf(ex);
    
    // Detect block changes
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
    
    // Track unique exercises for this block
    if (!block.uniqueExercises.includes(ex.name)) {
      block.uniqueExercises.push(ex.name);
    }
    
    // Determine round number by checking if we've seen this exercise before
    const firstOccurrenceIndex = exerciseSeenInCurrentBlock.get(ex.name);
    
    if (firstOccurrenceIndex === undefined) {
      // First time seeing this exercise in this block = Round 1
      exerciseSeenInCurrentBlock.set(ex.name, relativeIndex);
      
      // Find or create Round 1
      let round = block.rounds.find(r => r.number === 1);
      if (!round) {
        round = {
          number: 1,
          firstExerciseIndex: originalIndex,
          exercises: []
        };
        block.rounds.push(round);
        console.log(`  📍 Created Round 1 for ${currentBlock}`);
      }
      
      round.exercises.push({
        name: ex.name,
        index: originalIndex
      });
    } else {
      // We've seen this exercise before - calculate which round
      const positionInBlock = relativeIndex - blockStartIndex;
      const uniqueCount = block.uniqueExercises.length;
      const roundNumber = Math.floor(positionInBlock / uniqueCount) + 1;
      
      // Find or create this round
      let round = block.rounds.find(r => r.number === roundNumber);
      if (!round) {
        round = {
          number: roundNumber,
          firstExerciseIndex: originalIndex,
          exercises: []
        };
        block.rounds.push(round);
        console.log(`  📍 Created Round ${roundNumber} for ${currentBlock} at index ${originalIndex}`);
      }
      
      round.exercises.push({
        name: ex.name,
        index: originalIndex
      });
    }
  });
  
  console.log("📊 Start Point Selector - Blocks with Rounds:", blocks);
  
  // Populate block selector
  blocks.forEach((block, idx) => {
    const option = document.createElement('option');
    option.value = block.index;
    option.textContent = `${idx + 1}. ${block.name} (${block.rounds.length} rounds)`;
    phaseSelect.appendChild(option);
  });
  
  // Remove old event listeners by cloning
  const newPhaseSelect = phaseSelect.cloneNode(true);
  phaseSelect.parentNode.replaceChild(newPhaseSelect, phaseSelect);
  const newRoundSelect = roundSelect.cloneNode(true);
  roundSelect.parentNode.replaceChild(newRoundSelect, roundSelect);
  
  // Update references
  const phaseSelectFinal = document.getElementById("start-phase-select");
  const roundSelectFinal = document.getElementById("start-round-select");
  const exerciseSelectFinal = document.getElementById("start-exercise-select");
  
  // Handle block selection change
  phaseSelectFinal.addEventListener('change', function() {
    const selectedIndex = parseInt(this.value);
    
    if (selectedIndex === 0 || isNaN(selectedIndex)) {
      roundContainer.style.display = 'none';
      exerciseContainer.style.display = 'none';
      return;
    }
    
    // Find selected block
    const block = blocks.find(b => b.index === selectedIndex);
    if (!block || block.rounds.length === 0) {
      roundContainer.style.display = 'none';
      exerciseContainer.style.display = 'none';
      return;
    }
    
    // Show round selector
    roundContainer.style.display = 'block';
    exerciseContainer.style.display = 'none';
    roundSelectFinal.innerHTML = '<option value="">Inizio blocco (Round 1)</option>';
    
    block.rounds.forEach((round, idx) => {
      const option = document.createElement('option');
      option.value = round.firstExerciseIndex; // Use the actual index where round starts
      option.textContent = `Round ${round.number}`;
      option.dataset.roundNumber = round.number; // Store round number for reference
      roundSelectFinal.appendChild(option);
    });
  });
  
  // Handle round selection change
  roundSelectFinal.addEventListener('change', function() {
    const selectedBlockIndex = parseInt(phaseSelectFinal.value);
    const selectedRoundFirstIndex = parseInt(this.value); // This is now firstExerciseIndex
    
    if (isNaN(selectedBlockIndex) || selectedBlockIndex === 0) {
      exerciseContainer.style.display = 'none';
      return;
    }
    
    const block = blocks.find(b => b.index === selectedBlockIndex);
    if (!block) {
      exerciseContainer.style.display = 'none';
      return;
    }
    
    // If no round selected, hide exercises
    if (isNaN(selectedRoundFirstIndex) || this.value === "") {
      exerciseContainer.style.display = 'none';
      return;
    }
    
    // Find selected round by firstExerciseIndex
    const round = block.rounds.find(r => r.firstExerciseIndex === selectedRoundFirstIndex);
    if (!round || round.exercises.length === 0) {
      exerciseContainer.style.display = 'none';
      return;
    }
    
    // Show exercise selector
    exerciseContainer.style.display = 'block';
    exerciseSelectFinal.innerHTML = '<option value="">Inizio round</option>';
    
    round.exercises.forEach((ex, idx) => {
      const option = document.createElement('option');
      option.value = ex.index;
      option.textContent = `${idx + 1}. ${ex.name}`;
      exerciseSelectFinal.appendChild(option);
    });
  });
  
  // Reset button
  document.getElementById('reset-start-point').addEventListener('click', function() {
    phaseSelectFinal.value = '0';
    roundContainer.style.display = 'none';
    exerciseContainer.style.display = 'none';
    localStorage.removeItem('workoutStartIndex');
  });
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

  // Build reps and equipment info
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
  
  // 🧹 CLEAN UP all visual cue effects from previous exercise
  const timerEl = document.getElementById("timer");
  const gifEl = document.getElementById("exercise-gif");
  const exerciseNameBar = document.getElementById("exercise-name");
  
  timerEl.classList.remove("warning-10", "warning-6", "warning-3");
  gifEl.classList.remove("gif-glow");
  exerciseNameBar.classList.remove("next-preview-active");

  const duration = resumeTime !== null ? resumeTime : savedTimeLeft ?? parseInt(exercise.duration);
  savedTimeLeft = null;

  // Update progress bar
  updateProgressBar();

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

  const currentExercise = fullWorkoutSequence[currentStep];
  const nextExercise = fullWorkoutSequence[currentStep + 1];

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
      
      // ✨ TRIPLE VISUAL CUE ACTIVATION ✨
      const timerEl = document.getElementById("timer");
      const gifEl = document.getElementById("exercise-gif");
      const exerciseNameBar = document.getElementById("exercise-name");
      
      // 1. Activate timer warning color (yellow)
      timerEl.classList.add("warning-10");
      
      // 2. Activate GIF glow border
      gifEl.classList.add("gif-glow");
      
      // 3. Activate golden bar effect
      exerciseNameBar.classList.add("next-preview-active");
      
      if (nextExercise) {
        // Build next exercise info (reps + equipment)
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





    // Timer transition to ORANGE at 6 seconds
    if (timeLeft === 6) {
      const timerEl = document.getElementById("timer");
      timerEl.classList.remove("warning-10");
      timerEl.classList.add("warning-6");
    }


    // Timer transition to RED at 3 seconds
    if (timeLeft === 3) {
      const timerEl = document.getElementById("timer");
      timerEl.classList.remove("warning-6");
      timerEl.classList.add("warning-3");
    }

    if (timeLeft === 5) {
      const soundMode = document.getElementById("soundMode").value;
      const useVoice = soundMode === "voice";
      if (useVoice) speak("cinque, quattro, tre, due, uno");
      if (soundMode === "beppe") playBeppeAudio(beppeSounds.countdown5);
    }


    if (timeLeft <= 0) {
      const soundMode = document.getElementById("soundMode").value;
      const useVoice = soundMode === "voice";
      const useBip = soundMode === "bip";
      clearInterval(interval);
      
      // 🧹 CLEAN UP ALL VISUAL CUE EFFECTS
      const timerEl = document.getElementById("timer");
      const gifEl = document.getElementById("exercise-gif");
      const exerciseNameBar = document.getElementById("exercise-name");
      
      // Remove all timer warning classes
      timerEl.classList.remove("warning-10", "warning-6", "warning-3");
      
      // Remove GIF glow
      gifEl.classList.remove("gif-glow");
      
      // Remove golden bar effect
      exerciseNameBar.classList.remove("next-preview-active");
    
      // Avanza l'indice ORA
      currentStep++;
      const nextExercise = fullWorkoutSequence[currentStep];
    
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
      setTimeout(() => playExercise(currentStep, fullWorkoutSequence), 300);
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

async function tryGoogleTTS(text, lang) {
  let lastErr;
  for (let attempt = 0; attempt <= TTS_RETRIES; attempt++) {
    try {
      const audioUrl = await fetchTTS(text, lang);
      await playAudioUrl(audioUrl);
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

// REPLACE the whole playAudioUrl function with this version
async function playAudioUrl(url) {
  let el = document.getElementById("tts-audio");
  if (!el) {
    el = new Audio();
    el.id = "tts-audio";
    el.preload = "auto";
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.autoplay = false;
    el.muted = false;
    el.crossOrigin = "anonymous";
    document.body.appendChild(el);
  }

  // If it's a blob:, DO NOT append cache-buster (iOS breaks)
  const isBlob = typeof url === "string" && url.startsWith("blob:");
  const src = isBlob ? url : url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();

  el.pause();
  el.src = src;
  el.currentTime = 0;
  el.load();

  // Resume AudioContext if you’re using one (safe no-op otherwise)
  try { await (window.__audioCtx?.resume?.() || Promise.resolve()); } catch (_) {}

  // Play and resolve on end; if we used a blob URL, revoke it AFTER playback
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      el.onended = null;
      el.onerror = null;
      if (isBlob) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    };
    el.onended = () => { cleanup(); resolve(); };
    el.onerror = (e) => { cleanup(); reject(e); };
    const p = el.play();
    if (p && typeof p.then === "function") p.catch(reject);
  });
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
  const beep = document.getElementById("beep-sound");
  if (beep) beep.play();
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
