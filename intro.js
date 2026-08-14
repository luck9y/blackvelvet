(() => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const skipBtn = document.getElementById("skipBtn");
  const audio = document.getElementById("introAudio");
  const mainTitle = document.getElementById("mainTitle");
  const rain = document.getElementById("velvetRain");
  const fallingFlower = document.getElementById("fallingFlower");

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const labels = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"];
  const sentenceDuration = 7000;
  const fallbackDuration = 76000;

  let timers = [];
  let introStarted = false;

  function createRain() {
    const amount = innerWidth < 600 ? 22 : 42;

    for (let i = 0; i < amount; i++) {
      const flower = document.createElement("div");

      flower.className = "rain-flower";
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.setProperty("--size", `${8 + Math.random() * 52}px`);
      flower.style.setProperty("--opacity", `${0.12 + Math.random() * 0.42}`);
      flower.style.setProperty("--duration", `${16 + Math.random() * 30}s`);
      flower.style.setProperty("--delay", `${Math.random() * -40}s`);
      flower.style.setProperty("--sway", `${-100 + Math.random() * 200}px`);
      flower.style.setProperty(
        "--blur",
        `${Math.random() < 0.2 ? 1.2 : Math.random() * 0.45}px`
      );

      for (let j = 0; j < 6; j++) {
        const petal = document.createElement("span");
        petal.className = "petal";
        flower.appendChild(petal);
      }

      rain.appendChild(flower);
    }
  }

  function createVelvetFlowers() {
    fallingFlower.replaceChildren();

    const amount = innerWidth < 600 ? 28 : 58;

    for (let i = 0; i < amount; i++) {
      const flower = document.createElement("div");
      flower.className = "velvet-flower";

      flower.style.left = `${Math.random() * 100}%`;
      flower.style.setProperty("--flower-size", `${38 + Math.random() * 95}px`);
      flower.style.setProperty("--start-x", `${Math.random() * 110 - 5}vw`);
      flower.style.setProperty("--end-x", `${Math.random() * 110 - 5}vw`);
      flower.style.setProperty("--final-x", `${Math.random() * 110 - 5}vw`);
      flower.style.setProperty("--flower-duration", "8s");
      flower.style.setProperty("--flower-delay", `${-(Math.random() * 1.5)}s`);

      for (let j = 0; j < 6; j++) {
        const petal = document.createElement("span");
        petal.className = "flower-petal";
        flower.appendChild(petal);
      }

      const core = document.createElement("span");
      core.className = "flower-core";
      flower.appendChild(core);
      fallingFlower.appendChild(flower);
    }
  }

  function schedule(callback, delay) {
    timers.push(setTimeout(callback, Math.max(0, delay)));
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function getIntroDuration() {
    return Number.isFinite(audio.duration) && audio.duration > 4
      ? audio.duration * 1000
      : fallbackDuration;
  }

  function prepareLetters(label) {
    if (label.dataset.prepared) return;

    const text = label.textContent.trim();
    label.textContent = "";

    [...text].forEach((character, index) => {
      const letter = document.createElement("span");

      letter.className = character === " " ? "char space" : "char";
      letter.textContent = character === " " ? "\u00a0" : character;
      letter.style.setProperty("--char-index", index);
      label.appendChild(letter);
    });

    label.dataset.prepared = "true";
  }

  function showLabel(id, index) {
    const label = document.getElementById(id);

    prepareLetters(label);
    label.style.whiteSpace = "nowrap";
    label.style.width = "max-content";
    label.style.maxWidth = "none";
    label.className = `label label-${index + 1}`;

    if (reducedMotion) {
      label.style.opacity = "1";
      return;
    }

    void label.offsetWidth;
    label.classList.add("playing");
  }

  function createSplash(x, y) {
    const splash = document.createElement("div");

    splash.className = "splash";
    splash.style.left = `${x}px`;
    splash.style.top = `${y}px`;

    for (let i = 0; i < 8; i++) {
      const drop = document.createElement("span");

      drop.className = "drop";
      drop.style.setProperty("--angle", `${i * 45}deg`);
      drop.style.setProperty("--distance", `${28 + Math.random() * 24}px`);
      splash.appendChild(drop);
    }

    document.body.appendChild(splash);
    splash.addEventListener("animationend", () => splash.remove(), {
      once: true
    });
  }

  function resetIntroVisuals() {
    labels.forEach((id) => {
      const label = document.getElementById(id);

      label.className = "label";
      label.style.opacity = "";
      label.style.whiteSpace = "";
      label.style.width = "";
      label.style.maxWidth = "";
    });

    mainTitle.className = "";
    mainTitle.style.opacity = "";

    fallingFlower.className = "";
    fallingFlower.style.opacity = "";
    fallingFlower.style.visibility = "";
    fallingFlower.replaceChildren();
  }

  function startAudio() {
    audio.currentTime = 0;
    audio.volume = 1;

    audio.play().catch(() => {
      console.warn("Audio could not play. Check sounds/intro2.mp3.");
    });
  }

  function goToHome() {
    clearTimers();

    audio.pause();
    audio.currentTime = 0;

    window.location.href = "home.html";
  }

  function startIntro() {
    if (introStarted) return;

    introStarted = true;
    startScreen.classList.add("hidden");
    skipBtn.style.display = "block";
    startAudio();

    const totalDuration = getIntroDuration();
    const titleStart = Math.max(60000, totalDuration - 16000);
    const flowerStart = Math.max(titleStart + 8000, totalDuration - 8000);
    const fadeStart = Math.max(flowerStart + 4000, totalDuration - 4000);

    labels.forEach((id, index) => {
      schedule(() => showLabel(id, index), 1800 + index * sentenceDuration);
    });

    schedule(() => {
      if (reducedMotion) {
        mainTitle.style.opacity = "1";
      } else {
        mainTitle.classList.add("title-reveal");
      }
    }, titleStart);

    schedule(() => {
      createVelvetFlowers();
      fallingFlower.classList.add("visible");
    }, flowerStart);

    schedule(() => {
      mainTitle.classList.add("title-fade");
    }, fadeStart);

    schedule(goToHome, totalDuration);
  }

  function skipIntro() {
    goToHome();
  }

  document.addEventListener("click", (event) => {
    if (
      event.target.closest("button") ||
      event.target.closest("audio") ||
      reducedMotion
    ) {
      return;
    }

    createSplash(event.clientX, event.clientY);
  });

  startBtn.addEventListener("click", startIntro);
  skipBtn.addEventListener("click", skipIntro);

  createRain();
})();