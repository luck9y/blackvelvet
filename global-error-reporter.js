if (!window.__blackVelvetErrorReporterInstalled) {
  window.__blackVelvetErrorReporterInstalled = true;

  const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
  const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
  const STORAGE_KEY = "blackVelvetLocalConsoleErrors";

  const originalConsoleError = console.error.bind(console);
  const originalConsoleWarn = console.warn.bind(console);
  const originalFetch = window.fetch.bind(window);
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("black-velvet-console-errors") : null;

  let queue = Promise.resolve();
  let lastSignature = "";
  let lastTime = 0;
  let lastReporterFailure = 0;

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem("blackVelvetProfile") || "null");
    } catch {
      return null;
    }
  }

  function stringify(value) {
    if (value instanceof Error) return value.message || value.stack || "Error";

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  function shouldIgnore(message = "", url = "") {
    const text = `${message} ${url}`;
    return text.includes("blackVelvetLocalConsoleErrors");
  }

  function saveLocal(payload) {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      current.unshift(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 300)));
    } catch {}

    window.dispatchEvent(new CustomEvent("blackVelvetConsoleError", { detail: payload }));
    channel?.postMessage(payload);
  }

  function makePayload(source, message, stack = "") {
    const profile = getProfile();

    return {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      created_at: new Date().toISOString(),
      source,
      message: String(message || "Unknown error").slice(0, 4000),
      stack_trace: String(stack || "").slice(0, 12000) || null,
      page_url: location.href,
      username: profile?.username || null,
      user_role: profile?.staffRank || profile?.role || null,
      device_hex: localStorage.getItem("blackVelvetDeviceHex") || null,
      browser: navigator.userAgent
    };
  }

  async function saveRemote(payload) {
    const response = await originalFetch(`${SUPABASE_URL}/rest/v1/system_errors`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`system_errors insert failed: ${response.status} ${response.statusText} | ${await response.text()}`);
    }
  }

  function saveReporterFailure(error) {
    const now = Date.now();
    if (now - lastReporterFailure < 5000) return;
    lastReporterFailure = now;

    saveLocal(makePayload(
      "reporter.supabase",
      `Supabase error reporter save failed: ${error.message}`,
      error.stack || ""
    ));
  }

  function reportError(source, message, stack = "") {
    const text = String(message || "").trim();
    if (!text || shouldIgnore(text)) return;

    const signature = `${source}:${text}:${location.pathname}`;
    const now = Date.now();

    if (signature === lastSignature && now - lastTime < 1200) return;

    lastSignature = signature;
    lastTime = now;

    const payload = makePayload(source, text, stack);

    saveLocal(payload);

    queue = queue
      .then(() => saveRemote(payload))
      .catch(error => saveReporterFailure(error));
  }

  window.BlackVelvetReportError = reportError;
  window.BlackVelvetSaveConsolePayload = saveLocal;

  console.error = (...parts) => {
    originalConsoleError(...parts);

    const firstError = parts.find(part => part instanceof Error);

    reportError(
      "console.error",
      parts.map(stringify).join(" "),
      firstError?.stack || new Error().stack || ""
    );
  };

  console.warn = (...parts) => {
    originalConsoleWarn(...parts);

    reportError(
      "console.warn",
      parts.map(stringify).join(" "),
      new Error().stack || ""
    );
  };

  window.addEventListener("error", event => {
    if (event.target && event.target !== window) {
      const target = event.target;
      const url = target.src || target.href || "unknown resource";

      reportError(
        "resource.error",
        `Failed to load ${target.tagName || "resource"}: ${url}`,
        ""
      );

      return;
    }

    reportError(
      "window.error",
      event.error?.message || event.message || "Unknown browser error",
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    );
  }, true);

  window.addEventListener("unhandledrejection", event => {
    reportError(
      "unhandledrejection",
      stringify(event.reason || "Unhandled promise rejection"),
      event.reason?.stack || ""
    );
  });

  window.fetch = async (...args) => {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    try {
      const response = await originalFetch(...args);

      if (!response.ok && !shouldIgnore("", url) && !url.includes("/system_errors")) {
        let body = "";

        try {
          body = await response.clone().text();
        } catch {}

        reportError(
          "fetch.error",
          `${response.status} ${response.statusText} while requesting ${url || "unknown URL"}${body ? ` | Response: ${body}` : ""}`,
          ""
        );
      }

      return response;
    } catch (error) {
      if (!shouldIgnore(error.message, url) && !url.includes("/system_errors")) {
        reportError(
          "fetch.exception",
          `${error.message} while requesting ${url || "unknown URL"}`,
          error.stack
        );
      }

      throw error;
    }
  };

  window.BlackVelvetTestConsoleError = () => {
    reportError(
      "test.live",
      "Black Velvet live console test error",
      new Error("Black Velvet live console test error").stack
    );
  };

  window.dispatchEvent(new Event("blackVelvetErrorReporterReady"));
}
