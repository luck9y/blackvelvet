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
  let timers = [];
  let introStarted = false;

  function createRain() {
    const amount = innerWidth < 600 ? 22 : 42;

    for (let i = 0; i < amount; i++) {
      const flower = document.createElement("div");

      flower.className = "rain-flower";
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.setProperty("--size", `${8 + Math.random() * 52}px`);
      flower.style.setProperty("--opacity", `${.12 + Math.random() * .42}`);
      flower.style.setProperty("--duration", `${16 + Math.random() * 30}s`);
      flower.style.setProperty("--delay", `${Math.random() * -40}s`);
      flower.style.setProperty("--sway", `${-100 + Math.random() * 200}px`);
      flower.style.setProperty("--blur", `${Math.random() < .2 ? 1.2 : Math.random() * .45}px`);

      for (let j = 0; j < 6; j++) {
        const petal = document.createElement("span");
        petal.className = "petal";
        flower.appendChild(petal);
      }

      rain.appendChild(flower);
    }
  }

  function schedule(callback, delay) {
    timers.push(setTimeout(callback, delay));
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function startAudio() {
    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch(() => {
      console.warn("Audio could not play. Check sounds/intro2.mp3.");
    });
  }

  function showLabel(id) {
    const label = document.getElementById(id);
    label.className = "label";

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
      drop.style.left = "5px";
      drop.style.top = "2px";
      drop.style.setProperty("--angle", `${i * 45}deg`);
      drop.style.setProperty("--distance", `${28 + Math.random() * 24}px`);
      splash.appendChild(drop);
    }

    document.body.appendChild(splash);
    splash.addEventListener("animationend", () => splash.remove(), { once: true });
  }

  function resetIntroVisuals() {
    labels.forEach(id => {
      const label = document.getElementById(id);
      label.className = "label";
      label.style.opacity = "";
    });

    mainTitle.className = "";
    mainTitle.style.opacity = "";
    fallingFlower.className = "";
    fallingFlower.style.animation = "";
  }

  function startIntro() {
    if (introStarted) return;

    introStarted = true;
    startScreen.classList.add("hidden");
    skipBtn.style.display = "block";
    startAudio();

    labels.forEach((id, index) => {
      schedule(() => showLabel(id), 2000 + index * 5000);
    });

    schedule(() => {
      if (reducedMotion) {
        mainTitle.style.opacity = "1";
      } else {
        mainTitle.classList.add("title-reveal");
      }
    }, 42200);

    schedule(() => {
      fallingFlower.classList.add("visible");
    }, 47000);

    schedule(() => {
      window.location.href = "home.html";
    }, 56000);
  }

  function skipIntro() {
    clearTimers();
    audio.pause();
    audio.currentTime = 0;
    resetIntroVisuals();
    startScreen.classList.remove("hidden");
    skipBtn.style.display = "none";
    introStarted = false;
  }

  document.addEventListener("click", event => {
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