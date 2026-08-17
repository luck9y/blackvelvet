(() => {
  import("./global-error-reporter.js").catch(error => {
    console.warn("Black Velvet error reporter could not load:", error);
  });

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion) return;

  document.addEventListener("click", (event) => {
    if (
      event.target.closest("button") ||
      event.target.closest("a") ||
      event.target.closest("input") ||
      event.target.closest("textarea") ||
      event.target.closest("select")
    ) {
      return;
    }

    const splash = document.createElement("span");
    splash.className = "water-splash";
    splash.style.left = `${event.clientX}px`;
    splash.style.top = `${event.clientY}px`;

    for (let index = 0; index < 8; index += 1) {
      const drop = document.createElement("span");
      drop.className = "water-drop";
      drop.style.setProperty("--angle", `${index * 45}deg`);
      drop.style.setProperty("--distance", `${28 + Math.random() * 24}px`);
      splash.appendChild(drop);
    }

    document.body.appendChild(splash);
    splash.addEventListener("animationend", () => splash.remove(), {
      once: true
    });
  });
})();
