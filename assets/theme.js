/* Shared light/dark theme for interview.rajanagori.in pages. Uses localStorage key sd-theme (same as /play). */
(function (global) {
  "use strict";
  const KEY = "sd-theme";
  const LIGHT_META = "#f3f1ec";
  const DARK_META = "#141414";

  function preferred() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      /* private mode */
    }
    try {
      return global.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch (e) {
      return "dark";
    }
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function refreshChrome(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? LIGHT_META : DARK_META);
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      btn.title = theme === "dark" ? "Light theme" : "Dark theme";
    });
    const hljs = document.getElementById("hljsTheme");
    if (hljs) {
      const dark = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github-dark.min.css";
      const light = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css";
      const next = theme === "light" ? light : dark;
      if (hljs.getAttribute("href") !== next) hljs.setAttribute("href", next);
    }
  }

  function apply(theme, opts) {
    const persist = !opts || opts.persist !== false;
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (persist) {
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {
        /* private mode */
      }
    }
    refreshChrome(next);
    document.dispatchEvent(new CustomEvent("site-theme", { detail: { theme: next } }));
    return next;
  }

  function toggle() {
    return apply(current() === "dark" ? "light" : "dark");
  }

  function boot() {
    if (!document.documentElement.getAttribute("data-theme")) apply(preferred(), { persist: false });
    else refreshChrome(current());
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-toggle]");
      if (btn) {
        e.preventDefault();
        toggle();
      }
    });
  }

  global.SiteTheme = { KEY, preferred, current, apply, toggle, boot, refreshChrome };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
