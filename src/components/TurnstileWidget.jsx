import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function TurnstileWidget({ siteKey, resetKey, onTokenChange }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !turnstile || widgetIdRef.current !== null) return;

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          appearance: "always",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => onTokenChange(""),
        });
      })
      .catch(() => {
        onTokenChange("");
      });

    return () => {
      cancelled = true;

      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onTokenChange]);

  useEffect(() => {
    if (!window.turnstile || widgetIdRef.current === null) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenChange("");
  }, [resetKey, onTokenChange]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="authTurnstile">
      <div ref={containerRef} />
    </div>
  );
}
