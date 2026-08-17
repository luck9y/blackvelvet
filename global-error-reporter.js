if (!window.__blackVelvetErrorReporterInstalled) {
  window.__blackVelvetErrorReporterInstalled = true;

  const SUPABASE_URL = "https://ptgzhljvzyceawwohmym.supabase.co";
  const SUPABASE_KEY = "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk";
  const STORAGE_KEY = "blackVelvetLocalConsoleErrors";
  const CHANNEL_NAME = "black-velvet-console-errors";
  const REQUEST_TIMEOUT = 10000;

  const originalConsoleError = console.error.bind(console);
  const originalConsoleWarn = console.warn.bind(console);
  const originalFetch = window.fetch.bind(window);
  const channel = "BroadcastChannel" in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

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
    if (value instanceof Error) return value.stack || value.message || "Error";

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
    const text = `${message} ${url}`.toLowerCase();

    return text.includes("blackvelvetlocalconsoleerrors") ||
      text.includes("reporter.supabase") ||
      text.includes("system_errors");
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

  function saveLocal(payload) {
    try {
      const current = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      current.unshift(payload);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(current.slice(0, 500))
      );
    } catch {}

    window.dispatchEvent(new CustomEvent(
      "blackVelvetConsoleError",
      { detail: payload }
    ));

    channel?.postMessage(payload);
  }

  async function saveRemote(payload) {
    const { id, ...remotePayload } = payload;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

    try {
      const response = await originalFetch(
        `${SUPABASE_URL}/rest/v1/system_errors`,
        {
          method: "POST",
          mode: "cors",
          signal: controller.signal,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(remotePayload)
        }
      );

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `system_errors insert failed: ${response.status} ${body}`
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Supabase request timed out");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function saveReporterFailure(error) {
    const now = Date.now();

    if (now - lastReporterFailure < 30000) return;
    lastReporterFailure = now;

    // Use the original console only. Do not create another console record.
    originalConsoleWarn(
      "[Black Velvet] Remote error reporting unavailable:",
      error?.message || error
    );
  }

  function reportError(source, message, stack = "") {
    const text = String(message || "").trim();

    if (!text || shouldIgnore(text)) return;

    const signature = `${source}:${text}:${location.pathname}`;
    const now = Date.now();

    if (signature === lastSignature && now - lastTime < 1000) return;

    lastSignature = signature;
    lastTime = now;

    const payload = makePayload(source, text, stack);
    saveLocal(payload);

    if (!navigator.onLine) return;

    queue = queue
      .then(() => saveRemote(payload))
      .catch(saveReporterFailure);
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

    const text = parts.map(stringify).join(" ");

    if (!shouldIgnore(text)) {
      reportError("console.warn", text, new Error().stack || "");
    }
  };

  window.addEventListener("error", event => {
    if (event.target && event.target !== window) {
      const target = event.target;
      const url = target.src || target.href || "unknown resource";

      reportError(
        "resource.error",
        `Failed to load ${target.tagName || "resource"}: ${url}`
      );

      return;
    }

    reportError(
      "window.error",
      event.error?.message || event.message || "Unknown browser error",
      event.error?.stack ||
        `${event.filename}:${event.lineno}:${event.colno}`
    );
  }, true);

  window.addEventListener("unhandledrejection", event => {
    reportError(
      "unhandledrejection",
      stringify(event.reason || "Unhandled promise rejection"),
      event.reason?.stack || ""
    );
  });

  window.BlackVelvetTestConsoleError = () => {
    reportError(
      "test.live",
      "Black Velvet live console test error",
      new Error("Black Velvet live console test error").stack
    );
  };

  window.dispatchEvent(new Event("blackVelvetErrorReporterReady"));
}
