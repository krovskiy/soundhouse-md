function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
}

function setCookie(name, val) {
  document.cookie = `${name}=${val}; path=/; max-age=31536000`;
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  setCookie("theme", theme);
}

export function applyAccent(accent) {
  document.documentElement.dataset.accent = accent;
  setCookie("accent", accent);
}

export function applyLang(lang) {
  document.documentElement.dataset.lang = lang;
  setCookie("lang", lang);
}

export function initPrefs() {
  applyTheme(getCookie("theme") || "dark");
  applyAccent(getCookie("accent") || "purple");
  applyLang(getCookie("lang") || "en");
}

export { getCookie };
