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
  const fallbackDuration = 60000;

  // These times are relative to when the audio starts.
  const timeline = {
    audioStart: 3000,
    firstSentence: 3000,
    secondSentence: 7000,
    thirdSentence: 11000,
    fourthSentence: 15000,
    founderSentence: 19000,
    founderFade: 30000,
    sixthSentence: 33000,
    sixthFade: 40000,
    titleStart: 43000,
    titleFade: 55000
  };

  let timers = [];
  let introStarted = false;
  let activeLabel = null;

  function removeFlowerEffects() {
    rain?.replaceChildren();
    fallingFlower?.replaceChildren();

    if (fallingFlower) {
      fallingFlower.classList.remove("visible");
      fallingFlower.style.opacity = "0";
      fallingFlower.style.visibility = "hidden";
    }
  }

  function schedule(callback, delay) {
    timers.push(setTimeout(callback, Math.max(0, delay)));
  }

  function scheduleAfterAudio(callback, delay) {
    schedule(callback, timeline.audioStart + delay);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function getIntroDuration() {
    return Number.isFinite(audio?.duration) && audio.duration > 4
      ? audio.duration * 1000
      : fallbackDuration;
  }

  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function replaceOldPhrase(label) {
    const oldPhrase = /back\s+like\s+we\s+never\s+left\.?/i;

    if (oldPhrase.test(label.textContent)) {
      label.textContent = label.textContent.replace(
        oldPhrase,
        "A new chapter begins."
      );
    }
  }

  function shouldRemoveLabel(label) {
    const text = normalize(label.textContent);

    return (
      text.includes("managed by gears") ||
      text.includes("founded by suoaz") ||
      text.includes("founded by luckyy")
    );
  }

  function isFounderLabel(label) {
    const text = normalize(label.textContent);

    return (
      text.includes("founded by those") ||
      (text.includes("never stop") && text.includes("dream"))
    );
  }

  function isChapterLabel(label) {
    return normalize(label.textContent).includes("a new chapter begins");
  }

  function hideLabel(label) {
    if (!label) return;

    label.getAnimations().forEach((animation) => animation.cancel());
    label.style.opacity = "0";
    label.style.visibility = "hidden";
  }

  function prepareLabel(label) {
    label.style.display = "";
    label.style.visibility = "visible";
  }

  function fadeLabel(label, duration = 650) {
    if (!label) return;

    label.getAnimations().forEach((animation) => animation.cancel());

    if (reducedMotion) {
      hideLabel(label);
      return;
    }

    const animation = label.animate(
      [
        {
          opacity: 1,
          filter: "blur(0)",
          transform: "translate(-50%, -50%) scale(1)"
        },
        {
          opacity: 0,
          filter: "blur(10px)",
          transform: "translate(-50%, -50%) scale(1.06)"
        }
      ],
      {
        duration,
        easing: "ease-in",
        fill: "forwards"
      }
    );

    animation.onfinish = () => {
      label.style.opacity = "0";
      label.style.visibility = "hidden";

      if (activeLabel === label) {
        activeLabel = null;
      }
    };
  }

  function activateLabel(label) {
    if (activeLabel && activeLabel !== label) {
      fadeLabel(activeLabel);
    }

    prepareLabel(label);
    activeLabel = label;
  }

  function showFounderWords(label) {
    activateLabel(label);

    label.getAnimations().forEach((animation) => animation.cancel());
    label.className = "label founder-label";
    label.textContent = "";
    label.style.top = "50%";
    label.style.left = "50%";
    label.style.width = "100%";
    label.style.maxWidth = "90vw";
    label.style.whiteSpace = "normal";
    label.style.opacity = "1";
    label.style.visibility = "visible";
    label.style.transform = "translate(-50%, -50%)";

    const words = [
      "FOUNDED",
      "BY",
      "THOSE",
      "WHO",
      "NEVER",
      "STOPPED",
      "DREAMING"
    ];

    words.forEach((word, index) => {
      const element = document.createElement("span");

      element.textContent = word;
      element.style.display = "block";
      element.style.opacity = reducedMotion ? "1" : "0";
      label.appendChild(element);

      if (!reducedMotion) {
        scheduleAfterAudio(() => {
          element.animate(
            [
              {
                opacity: 0,
                transform: "translateY(30px) scale(.7) rotateX(75deg)",
                filter: "blur(12px)"
              },
              {
                opacity: 1,
                transform: "translateY(-6px) scale(1.1) rotateX(0)",
                filter: "blur(0)"
              },
              {
                opacity: 1,
                transform: "translateY(0) scale(1)",
                filter: "blur(0)"
              }
            ],
            {
              duration: 700,
              easing: "cubic-bezier(.16, 1, .3, 1)",
              fill: "forwards"
            }
          );
        }, index * 1000);
      }
    });
  }

  function showChapterLabel(label) {
    activateLabel(label);

    label.getAnimations().forEach((animation) => animation.cancel());
    label.className = "label title-reveal chapter-title";
    label.style.top = "50%";
    label.style.left = "50%";
    label.style.width = "90%";
    label.style.maxWidth = "1100px";
    label.style.whiteSpace = "normal";
    label.style.opacity = reducedMotion ? "1" : "0";
    label.style.visibility = "visible";
    label.style.transform = "translate(-50%, -50%)";
    label.style.fontFamily = "'Idealist', 'Trebuchet MS', sans-serif";
    label.style.textShadow =
      "0 0 12px rgba(255,255,255,.9), 0 0 35px rgba(160,210,255,.8)";
    label.style.color = "rgba(255,255,255,.96)";

    if (!reducedMotion) {
      requestAnimationFrame(() => {
        label.classList.add("title-reveal");
      });
    }
  }

  function getAnimationStyle(index) {
    const styles = [
      {
        name: "web-swing",
        keyframes: [
          {
            opacity: 0,
            transform:
              "translate3d(-125vw,-50%,-500px) rotate(-35deg) scale(.2)",
            filter: "blur(12px)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-45%,-50%,80px) rotate(8deg) scale(1.06)",
            filter: "blur(0)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,0) rotate(0) scale(1)",
            filter: "blur(0)"
          }
        ]
      },
      {
        name: "glitch-drop",
        keyframes: [
          {
            opacity: 0,
            transform:
              "translate3d(-50%,-70vh,500px) skewX(25deg) scaleY(1.8)",
            filter: "blur(14px)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-53%,-50%,0) skewX(-8deg) scaleY(.92)",
            filter: "blur(0)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,0) skewX(0) scale(1)",
            filter: "blur(0)"
          }
        ]
      },
      {
        name: "spiral-entry",
        keyframes: [
          {
            opacity: 0,
            transform:
              "translate3d(-50%,-50%,-1500px) rotateY(360deg) rotateZ(-180deg) scale(.04)",
            filter: "blur(16px)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,0) rotateY(0) rotateZ(8deg) scale(1.08)",
            filter: "blur(0)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,0) rotateZ(0) scale(1)",
            filter: "blur(0)"
          }
        ]
      },
      {
        name: "hero-flip",
        keyframes: [
          {
            opacity: 0,
            transform:
              "translate3d(-50%,-50%,-800px) rotateX(-90deg) scale(.3)",
            filter: "blur(12px)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,100px) rotateX(12deg) scale(1.08)",
            filter: "blur(0)"
          },
          {
            opacity: 1,
            transform:
              "translate3d(-50%,-50%,0) rotateX(0) scale(1)",
            filter: "blur(0)"
          }
        ]
      }
    ];

    return styles[index % styles.length];
  }

  function showCinematicLabel(label, index) {
    activateLabel(label);

    const style = getAnimationStyle(index);

    label.getAnimations().forEach((animation) => animation.cancel());
    label.className = `label cinematic-label cinematic-${style.name}`;
    label.style.top = "50%";
    label.style.left = "50%";
    label.style.width = "min(92vw, 1500px)";
    label.style.maxWidth = "92vw";
    label.style.whiteSpace = "normal";
    label.style.opacity = reducedMotion ? "1" : "0";
    label.style.visibility = "visible";
    label.style.transform = "translate(-50%, -50%)";

    if (!reducedMotion) {
      label.animate(style.keyframes, {
        duration: 1100,
        easing: "cubic-bezier(.18, .78, .2, 1)",
        fill: "forwards"
      });
    }
  }

  function showLabel(label, index) {
    replaceOldPhrase(label);

    if (shouldRemoveLabel(label)) {
      hideLabel(label);
      label.style.display = "none";
      return;
    }

    if (isFounderLabel(label)) {
      showFounderWords(label);
    } else if (isChapterLabel(label)) {
      showChapterLabel(label);
    } else {
      showCinematicLabel(label, index);
    }
  }

  function resetIntroVisuals() {
    activeLabel = null;

    labels.forEach((id) => {
      const label = document.getElementById(id);
      if (!label) return;

      label.getAnimations().forEach((animation) => animation.cancel());
      label.className = "label";
      label.style.display = "";
      label.style.opacity = "0";
      label.style.visibility = "hidden";
      label.style.whiteSpace = "";
      label.style.width = "";
      label.style.maxWidth = "";
      label.style.top = "";
      label.style.left = "";
      label.style.transform = "";
      label.style.fontFamily = "";
      label.style.textShadow = "";
      label.style.color = "";

      if (!label.dataset.originalText) {
        label.dataset.originalText = label.textContent;
      }

      label.textContent = label.dataset.originalText;
      replaceOldPhrase(label);

      if (shouldRemoveLabel(label)) {
        label.style.display = "none";
      }
    });

    mainTitle.getAnimations().forEach((animation) => animation.cancel());
    mainTitle.className = "";
    mainTitle.style.opacity = "";
    mainTitle.style.top = "50%";
    mainTitle.style.left = "50%";
    mainTitle.style.width = "90%";
    mainTitle.style.fontSize = "clamp(32px, 7vw, 92px)";

    removeFlowerEffects();
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
    removeFlowerEffects();

    window.location.href = "home.html";
  }

  function startIntro() {
    if (introStarted) return;

    introStarted = true;
    resetIntroVisuals();

    startScreen.classList.add("hidden");
    skipBtn.style.display = "block";

    const totalDuration = getIntroDuration();

    // Audio begins three seconds after PLAY is clicked.
    schedule(startAudio, timeline.audioStart);

    const usableLabels = labels
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .filter((label) => !shouldRemoveLabel(label));

    const founderLabel = usableLabels.find(isFounderLabel);
    const chapterLabel = usableLabels.find(isChapterLabel);

    const regularLabels = usableLabels
      .filter((label) => label !== founderLabel && label !== chapterLabel)
      .slice(0, 4);

    const sentenceTimes = [
      timeline.firstSentence,
      timeline.secondSentence,
      timeline.thirdSentence,
      timeline.fourthSentence
    ];

    regularLabels.forEach((label, index) => {
      const showTime = sentenceTimes[index];

      scheduleAfterAudio(() => showLabel(label, index), showTime);

      scheduleAfterAudio(() => {
        if (activeLabel === label) {
          fadeLabel(label, 650);
        }
      }, showTime + 3000);
    });

    usableLabels
      .filter(
        (label) =>
          label !== founderLabel &&
          label !== chapterLabel &&
          !regularLabels.includes(label)
      )
      .forEach(hideLabel);

    if (founderLabel) {
      scheduleAfterAudio(
        () => showFounderWords(founderLabel),
        timeline.founderSentence
      );

      scheduleAfterAudio(() => {
        if (activeLabel === founderLabel) {
          fadeLabel(founderLabel, 650);
        }
      }, timeline.founderFade - 650);
    }

    if (chapterLabel) {
      scheduleAfterAudio(
        () => showChapterLabel(chapterLabel),
        timeline.sixthSentence
      );

      scheduleAfterAudio(() => {
        if (activeLabel === chapterLabel) {
          fadeLabel(chapterLabel, 650);
        }
      }, timeline.sixthFade - 650);
    }

    scheduleAfterAudio(() => {
      mainTitle.getAnimations().forEach((animation) => animation.cancel());
      mainTitle.className = "";

      if (reducedMotion) {
        mainTitle.style.opacity = "1";
      } else {
        requestAnimationFrame(() => {
          mainTitle.classList.add("title-reveal");
        });
      }
    }, timeline.titleStart);

    scheduleAfterAudio(() => {
      mainTitle.classList.add("title-fade");
      removeFlowerEffects();
    }, timeline.titleFade);

    schedule(
      goToHome,
      timeline.audioStart +
        Math.max(totalDuration, timeline.titleFade + 5000)
    );
  }

  function skipIntro() {
    goToHome();
  }

  startBtn?.addEventListener("click", startIntro);
  skipBtn?.addEventListener("click", skipIntro);

  removeFlowerEffects();
})();
