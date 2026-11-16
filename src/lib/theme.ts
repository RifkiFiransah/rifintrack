export const THEME_STORAGE_KEY = "rifintrack-theme";

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var stored = window.localStorage.getItem(key);
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored !== "light" && prefersDark);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {}
})();
`;
