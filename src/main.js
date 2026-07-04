import "./style.css";
import nexusImg from "./images/nexus.png";
import logoWord from "./images/logo-word.png";
import WaveSurfer from "wavesurfer.js";

import { initPrefs, applyLang, applyTheme, getCookie } from "./theme.js";
import { t } from "./i18n.js";

initPrefs(); // restore saved prefs before first render

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TELEGRAM_USER = import.meta.env.TELEGRAM_USER || "kafeshka";

// escape user text before it goes into innerHTML
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// prefix relative /media paths with the api origin
function media(p) {
  if (!p) return "";
  return p.startsWith("/media") ? API + p : p;
}

function fmt(sec) {
  if (!isFinite(sec)) return "-0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `-${m}:${String(s).padStart(2, "0")}`;
}

document.querySelector("#app").innerHTML = /*html*/ `
  <main>

    <nav class="banner-bar">
      <div class="banner-body"></div>
    </nav>

    <img class="logo-banner" src="${logoWord}" style="">

    <div class="vst-interface-container" id="home">
      <div class="vst-interface-wrapper">
        <img class="vst-interface-layer" src="${nexusImg}">
        <div class="interact-menu">
          <div class="category-bar">
            <h2><div class="category-title">category</div></h2>
            <div class="category-bar-right">
              <h2><div class="category-title">preset</div></h2>
              <h2><div class="category-title">cat</div></h2>
            </div>
          </div>
          <div class="menu-selection-grid">
            <div class="menu-selection-left">
              <div class="menu-item selected" data-target="members" tabindex="0">${t("m_members")}</div>
              <div class="menu-item" data-target="releases" tabindex="0">${t("m_releases")}</div>
              <div class="menu-item" data-target="prices" tabindex="0">${t("m_services")}</div>
              <div class="menu-item" data-target="merch" tabindex="0">${t("m_merch")}</div>
            </div>
            <div class="menu-selection-right"></div>
          </div>

          <div class="menu-footer">
            <div class="footer-body">
              <span class="footer-preset">-</span>
              <div class="footer-meta">
                <div class="footer-meta-row">
                  <span class="footer-meta-icon">&#9881;</span>
                  <span class="footer-meta-val">20%</span>
                  <span class="footer-meta-slot"><span style="width:20%"></span></span>
                </div>
                <div class="footer-meta-row">
                  <span class="footer-meta-icon">&#9634;</span>
                  <span class="footer-meta-val">0vc</span>
                  <span class="footer-meta-slot"><span style="width:0%"></span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="showcase-container" id="showcase">
      <h2 class="members-header">SHOWCASE</h2>
      <div class="showcase-slideshow">
        <div class="showcase-track"></div>
        <button class="showcase-arrow showcase-prev" aria-label="previous">&#9198;</button>
        <button class="showcase-arrow showcase-next" aria-label="next">&#9197;</button>
        <div class="showcase-dots"></div>
        <p class="showcase-caption"></p>
      </div>
    </div>

    <div class="members-container" id="members">
      <h2 class="members-header">MEMBERS</h2>
      <div class="members-grid"></div>
    </div>

    <div class="releases-container" id="releases">
      <h2 class="members-header">RELEASES</h2>
      <div class="releases-grid"></div>
    </div>

    <div class="music-container" id="tracks">
      <h2 class="members-header">TRACKS</h2>
      <div class="track-list"></div>
    </div>

    <div class="services-container" id="prices">
      <h2 class="members-header">SERVICES</h2>
      <div class="services-grid"></div>
      <a class="services-tg-btn"
     href="https://t.me/${TELEGRAM_USER}?text=${encodeURIComponent("Привет! Хочу узнать про услуги")}"
     target="_blank" rel="noopener">
    WRITE ON TELEGRAM
    <img src="/telegram.svg" class="telegram-icon">
  </a>
</div>
    </div>

    <div class="merch-container" id="merch">
      <h2 class="members-header">MERCH</h2>
      <div class="merch-grid"></div>
    </div>

    <div>
    <p class="footer-creator">created by <a href="https://kafeshka.cc">dima // <mark class="brown">kafeshka</mark>.cc</a></p>
    </div>
    <div class="prefs-bar">
          <button class="pref-btn" id="lang-toggle">EN</button>
          <button class="pref-btn" id="theme-toggle">◐</button>
        </div>

  </main>
`;

// ---- language toggle ----
const langBtn = document.querySelector("#lang-toggle");
function syncLangBtn() {
  const lang = getCookie("lang") || "en";
  langBtn.textContent = lang.toUpperCase();
}
syncLangBtn();
langBtn.addEventListener("click", () => {
  const next = (getCookie("lang") || "en") === "en" ? "ru" : "en";
  applyLang(next);
  syncLangBtn();
  location.reload(); // simplest: reload so all sections re-render translated
});

// ---- theme toggle ----
document.querySelector("#theme-toggle").addEventListener("click", () => {
  const next = (getCookie("theme") || "dark") === "dark" ? "light" : "dark";
  applyTheme(next);
});

// ---- fake VST meter jitter ----
(function animateMeters() {
  const rows = document.querySelectorAll(".footer-meta-row");
  if (!rows.length) return;

  // [current value, suffix, max] per row — tweak to taste
  const meters = [
    { val: 20, suffix: "%", max: 100 },
    { val: 0, suffix: "vc", max: 16 },
  ];

  rows.forEach((row, i) => {
    const m = meters[i];
    if (!m) return;
    const valEl = row.querySelector(".footer-meta-val");
    const barEl = row.querySelector(".footer-meta-slot > span");

    const tick = () => {
      // drift by a small random step, clamp to [0, max]
      m.val += (Math.random() - 0.5) * m.max * 0.25;
      m.val = Math.max(0, Math.min(m.max, m.val));
      const shown = Math.round(m.val);
      valEl.textContent = `${shown}${m.suffix}`;
      barEl.style.width = `${(m.val / m.max) * 100}%`;

      // schedule next tick at a random interval so they feel independent
      setTimeout(tick, 400 + Math.random() * 900);
    };
    tick();
  });
})();

const INTRO_TIPS = [
  "did you know: uhm... that... uhm... yeah",
  "tip: click a member to hear their tracks",
  "dima was here…",
  "where's the bass?",
  "loading presets",
  "made with love in chișinău",
  "turn it up",
];

const intro = document.createElement("div");
intro.className = "intro-overlay";
intro.innerHTML = /*html*/ `
  <div class="intro-inner">
    <img class="intro-logo" src="/public/logo.svg" alt="">
    <p class="intro-tip">${esc(INTRO_TIPS[Math.floor(Math.random() * INTRO_TIPS.length)])}</p>
  </div>
`;
document.body.appendChild(intro);
document.body.style.overflow = "hidden";

setTimeout(() => {
  intro.classList.add("intro-hide");
  document.body.style.overflow = "";
  intro.addEventListener("transitionend", () => intro.remove(), { once: true });
}, 2200);

// ---- background shards ----
function spawnShards(count = 14) {
  const layer = document.createElement("div");
  layer.className = "shard-layer";

  // a few angular "shard" silhouettes; picked at random per shard
  const shapes = [
    "polygon(0 0, 100% 20%, 80% 100%, 20% 80%)",
    "polygon(50% 0, 100% 60%, 60% 100%, 0 50%)",
    "polygon(20% 0, 100% 0, 80% 100%, 0 70%)",
    "polygon(0 20%, 80% 0, 100% 80%, 30% 100%)",
    "polygon(50% 0, 100% 100%, 0 100%)",
  ];
  const tints = ["#a897cc38", "#6d5c9339", "#c3b2e02a", "#8f7fb02e"];

  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "shard";
    const size = 20 + Math.random() * 80; // 20–100px
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.clipPath = shapes[(Math.random() * shapes.length) | 0];
    s.style.background = tints[(Math.random() * tints.length) | 0];
    s.style.opacity = (0.14 + Math.random() * 0.1).toFixed(2); // 0.04–0.14
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    s.style.animationDuration = `${12 + Math.random() * 18}s`;
    s.style.animationDelay = `${-Math.random() * 20}s`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
}
spawnShards();

const bannerBody = document.querySelector(".banner-body");
const membersGrid = document.querySelector(".members-grid");
const trackList = document.querySelector(".track-list");
const servicesGrid = document.querySelector(".services-grid");
const merchGrid = document.querySelector(".merch-grid");
const menuSelectionRight = document.querySelector(".menu-selection-right");
const footerPreset = document.querySelector(".footer-preset");
const releasesGrid = document.querySelector(".releases-grid");

let current = null;
let instances = [];

function destroyTracks() {
  if (current) {
    current.pause();
    current = null;
  }
  instances.forEach((ws) => ws.destroy());
  instances = [];
  trackList.innerHTML = "";
}

function renderTracks(tracks) {
  destroyTracks();

  if (!tracks.length) {
    trackList.innerHTML = `<div class="track-empty">No tracks for this member.</div>`;
    return;
  }

  tracks.forEach((t) => {
    const row = document.createElement("div");
    row.className = "track-item";
    row.innerHTML = /*html*/ `
      <div class="track-cover"></div>
      <span class="track-num">${String(t.position).padStart(2, "0")}</span>
      <span class="track-title">${esc(t.title)}</span>
      <div class="track-transport">
        <button class="tp-btn tp-prev" aria-label="previous">&#9198;</button>
        <button class="tp-btn tp-play" aria-label="play">&#9654;</button>
        <button class="tp-btn tp-next" aria-label="next">&#9197;</button>
      </div>
      <div class="track-wave"></div>
      <span class="track-remaining">-0:00</span>
    `;
    trackList.appendChild(row);

    if (t.cover_path) {
      row.querySelector(".track-cover").style.backgroundImage =
        `url(${media(t.cover_path)})`;
    }

    const remaining = row.querySelector(".track-remaining");
    const playBtn = row.querySelector(".tp-play");

    const ws = WaveSurfer.create({
      container: row.querySelector(".track-wave"),
      height: 40,
      barWidth: 2,
      barGap: 1,
      cursorWidth: 2,
      waveColor: "#8f7fb0",
      progressColor: "#c3b2e0",
      cursorColor: "#f2ecff",
      url: media(t.file_path),
    });

    ws.on("decode", (dur) => (remaining.textContent = fmt(dur)));
    ws.on("timeupdate", (time) => {
      remaining.textContent = fmt(ws.getDuration() - time);
    });
    ws.on("play", () => {
      playBtn.innerHTML = "&#9208;";
      if (current && current !== ws) current.pause();
      current = ws;
    });
    ws.on("pause", () => (playBtn.innerHTML = "&#9654;"));
    ws.on("finish", () => (remaining.textContent = fmt(ws.getDuration())));

    playBtn.addEventListener("click", () => ws.playPause());
    row
      .querySelector(".tp-prev")
      .addEventListener("click", () => skipTo(ws, -1));
    row
      .querySelector(".tp-next")
      .addEventListener("click", () => skipTo(ws, +1));
    instances.push(ws);
  });
}

function skipTo(fromWs, dir) {
  const i = instances.indexOf(fromWs);
  if (i === -1) return;
  const next = instances[i + dir];
  if (!next) return; // at the ends of the list, do nothing
  fromWs.pause();
  fromWs.setTime(0); // reset the one we're leaving
  next.setTime(0);
  next.play(); // triggers your existing "play" handler,
  // which pauses `current` and updates it
}

async function loadMemberTracks(id) {
  const res = await fetch(`${API}/api/members/${id}/tracks`);
  if (!res.ok) return;
  renderTracks(await res.json());
}

async function loadMembers() {
  const res = await fetch(`${API}/api/members`);
  const members = await res.json();

  membersGrid.innerHTML = "";
  members.forEach((m) => {
    const card = document.createElement("div");
    card.className = "member-card";
    card.dataset.memberId = m.id;
    card.innerHTML = /*html*/ `
      <div class="member-img-placeholder"></div>
      <p class="member-name">${esc(m.name)}</p>
    `;
    if (m.img_path) {
      const ph = card.querySelector(".member-img-placeholder");
      ph.style.backgroundImage = `url(${media(m.img_path)})`;
      ph.style.backgroundSize = "cover";
      ph.style.backgroundPosition = "center";
    }
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".member-card")
        .forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      loadMemberTracks(m.id);
    });
    membersGrid.appendChild(card);
  });
  const first = membersGrid.querySelector(".member-card");
  if (first) {
    first.classList.add("active");
    loadMemberTracks(members[0].id);
  }
}

async function loadBanners() {
  const res = await fetch(`${API}/api/banners`);
  const banners = await res.json();
  bannerBody.innerHTML = "";

  // nothing active -> hide the bar entirely
  if (banners.length == 1) {
    document.querySelector(".banner-bar").style.display = "none";
    return;
  }

  const text = banners.map((b) => b.text).join("   //   ");
  // repeat so the scrolling strip stays filled
  bannerBody.innerHTML = `
    <img class="banner-img" src="">
    <p class="banner-text">${esc(text)}</p>
    <img class="banner-img" src="">
  `;
}

async function loadServices() {
  const res = await fetch(`${API}/api/services`);
  const services = await res.json();
  servicesGrid.innerHTML = "";
  services.forEach((s) => {
    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = /*html*/ `
      <h3 class="service-title">${esc(s.title)}</h3>
      <p class="service-desc">${esc(s.description)}</p>
      <span class="service-price">${esc(s.price)}</span>
    `;
    servicesGrid.appendChild(card);
  });
}

async function loadReleases() {
  const res = await fetch(`${API}/api/releases`);
  const releases = await res.json();
  releasesGrid.innerHTML = "";

  if (!releases.length) {
    document.querySelector(".releases-container").style.display = "none";
    return;
  }

  const platforms = [
    { key: "soundcloud", label: "SoundCloud", icon: "/soundcloud.svg" },
    { key: "spotify", label: "Spotify", icon: "/spotify.svg" },
    { key: "apple", label: "Apple Music", icon: "/apple-music.svg" },
    { key: "youtube", label: "YouTube", icon: "/youtube.svg" },
  ];

  releases.forEach((r) => {
    const links = platforms
      .filter((p) => r[p.key])
      .map(
        (p) => `
          <a class="release-link release-${p.key}" href="${esc(r[p.key])}" target="_blank"
              rel="noopener" aria-label="${p.label}" title="${p.label}">
          <span class="release-icon" style="--icon:url(${p.icon})"></span>
        </a>`,
      )
      .join("");

    const card = document.createElement("div");
    card.className = "release-card";
    card.innerHTML = /*html*/ `
      <div class="release-cover"></div>
      <div class="release-overlay">${links || '<span class="release-soon">coming soon</span>'}</div>
      <p class="release-title">${esc(r.title)}</p>
    `;
    if (r.img_path) {
      card.querySelector(".release-cover").style.backgroundImage =
        `url(${media(r.img_path)})`;
    }
    releasesGrid.appendChild(card);
  });
}

function openMerchModal(m) {
  const sizes = (m.sizes || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const msg = encodeURIComponent(`Привет! Меня интересует: ${m.name}`);

  const overlay = document.createElement("div");
  overlay.className = "merch-modal-overlay";
  overlay.innerHTML = /*html*/ `
    <div class="merch-modal">
      <button class="merch-modal-close" aria-label="close">&times;</button>
      <div class="merch-modal-stage">
        <img class="merch-modal-img" src="${media(m.img_path)}" alt="${esc(m.name)}" draggable="false">
        <span class="merch-zoom-hint">scroll or double-click to zoom</span>
      </div>
      <div class="merch-modal-info">
        <h3 class="merch-modal-name">${esc(m.name)}</h3>
        <span class="merch-modal-price">${esc(m.price)}</span>
        ${
          sizes.length
            ? `
        <div class="merch-modal-sizes">
          <span class="merch-sizes-label">available in</span>
          <div class="merch-sizes-list">
            ${sizes.map((s) => `<span class="merch-size">${esc(s)}</span>`).join("")}
          </div>
        </div>`
            : ""
        }
        </div>
        <a class="merch-tg-btn" href="https://t.me/${TELEGRAM_USER}?text=${msg}"
           target="_blank" rel="noopener">write on telegram <img src="/public/telegram.svg" class="telegram-icon"></a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden"; // lock page scroll while open

  const close = () => {
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => e.key === "Escape" && close();
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => e.target === overlay && close());
  overlay.querySelector(".merch-modal-close").addEventListener("click", close);

  // ---- zoom + pan ----
  const stage = overlay.querySelector(".merch-modal-stage");
  const img = overlay.querySelector(".merch-modal-img");
  let scale = 1,
    x = 0,
    y = 0,
    dragging = false,
    sx = 0,
    sy = 0;

  const apply = () => {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.classList.toggle("zoomed", scale > 1);
  };

  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      scale = Math.min(4, Math.max(1, scale - e.deltaY * 0.0015));
      if (scale === 1) {
        x = 0;
        y = 0;
      }
      apply();
    },
    { passive: false },
  );

  img.addEventListener("dblclick", () => {
    if (scale === 1) scale = 2;
    else {
      scale = 1;
      x = 0;
      y = 0;
    }
    apply();
  });

  img.addEventListener("pointerdown", (e) => {
    if (scale === 1) return;
    dragging = true;
    sx = e.clientX - x;
    sy = e.clientY - y;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    x = e.clientX - sx;
    y = e.clientY - sy;
    apply();
  });
  img.addEventListener("pointerup", () => (dragging = false));
}

async function loadMerch() {
  const res = await fetch(`${API}/api/merch`);
  const items = await res.json();
  merchGrid.innerHTML = "";
  items.forEach((m) => {
    const el = document.createElement("div");
    el.className = "merch-item";
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openMerchModal(m));
    el.innerHTML = /*html*/ `
      <div class="merch-img-placeholder"></div>
      <p class="merch-name">${esc(m.name)}</p>
      <span class="merch-price">${esc(m.price)}</span>
    `;
    if (m.img_path) {
      const ph = el.querySelector(".merch-img-placeholder");
      ph.style.backgroundImage = `url(${media(m.img_path)})`;
      ph.style.backgroundSize = "cover";
      ph.style.backgroundPosition = "center";
    }
    merchGrid.appendChild(el);
  });
}

const showcaseTrack = document.querySelector(".showcase-track");
const showcaseDots = document.querySelector(".showcase-dots");
const showcaseCaption = document.querySelector(".showcase-caption");

let slides = [];
let slideIdx = 0;
let slideTimer = null;

function showSlide(i) {
  if (!slides.length) return;
  slideIdx = (i + slides.length) % slides.length;
  showcaseTrack.style.transform = `translateX(-${slideIdx * 100}%)`;
  showcaseCaption.textContent = slides[slideIdx].caption || "";
  showcaseDots
    .querySelectorAll("span")
    .forEach((d, n) => d.classList.toggle("on", n === slideIdx));
}

function nextSlide() {
  showSlide(slideIdx + 1);
}

function resetSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, 4000);
}

async function loadShowcase() {
  const res = await fetch(`${API}/api/showcase`);
  slides = await res.json();

  // nothing to show -> hide the whole section
  if (!slides.length) {
    document.querySelector(".showcase-container").style.display = "none";
    return;
  }

  showcaseTrack.innerHTML = slides
    .map(
      (s) =>
        `<div class="showcase-slide" style="background-image:url(${media(s.img_path)})"></div>`,
    )
    .join("");

  showcaseDots.innerHTML = slides.map(() => `<span></span>`).join("");
  showcaseDots.querySelectorAll("span").forEach((d, n) =>
    d.addEventListener("click", () => {
      showSlide(n);
      resetSlideTimer();
    }),
  );

  document.querySelector(".showcase-prev").addEventListener("click", () => {
    showSlide(slideIdx - 1);
    resetSlideTimer();
  });
  document.querySelector(".showcase-next").addEventListener("click", () => {
    nextSlide();
    resetSlideTimer();
  });

  showSlide(0);
  resetSlideTimer();
}

loadBanners();
loadMembers();
loadServices();
loadMerch();
loadShowcase();
loadReleases();

// scroll the page to a section by id
function scrollToSection(id) {
  if (!id) return;
  const section = document.getElementById(id);
  if (!section) return;
  history.pushState(null, "", `#${id}`);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---- right menu (preset list) ---- */
// each category: where to fetch, how to label, and which section to scroll to
const rightMenuSources = {
  members: {
    url: `${API}/api/members`,
    label: (x) => x.name,
    target: "members",
  },
  prices: {
    url: `${API}/api/services`,
    label: (x) => x.title,
    target: "prices",
  },
  merch: { url: `${API}/api/merch`, label: (x) => x.name, target: "merch" },
};

function selectRightItem(item) {
  menuSelectionRight
    .querySelectorAll(".menu-item")
    .forEach((i) => i.classList.remove("selected"));
  item.classList.add("selected");
  if (footerPreset) footerPreset.textContent = item.textContent;
}

function renderRightMenu(items, label, target) {
  menuSelectionRight.innerHTML = "";
  if (!items.length) {
    menuSelectionRight.innerHTML = `<div class="menu-item menu-item--empty">empty</div>`;
    if (footerPreset) footerPreset.textContent = "-";
    return;
  }
  items.forEach((it, idx) => {
    const el = document.createElement("div");
    el.className = "menu-item";
    el.tabIndex = 0;
    el.textContent = label(it);
    el.dataset.id = it.id;

    // select + scroll to the section this category points at
    const activate = () => {
      selectRightItem(el);
      scrollToSection(target);
    };

    el.addEventListener("click", activate);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        activate();
      }
    });
    menuSelectionRight.appendChild(el);
    if (idx === 0) selectRightItem(el); // default select on load, no scroll
  });
}

async function loadRightMenu(category) {
  const source = rightMenuSources[category];
  if (!source) {
    menuSelectionRight.innerHTML = `<div class="menu-item menu-item--empty">&mdash; ${esc(category)} &mdash;</div>`;
    if (footerPreset) footerPreset.textContent = "-";
    return;
  }
  try {
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(res.status);
    renderRightMenu(await res.json(), source.label, source.target);
  } catch {
    menuSelectionRight.innerHTML = `<div class="menu-item menu-item--empty">failed to load</div>`;
  }
}

/* ---- left menu (categories): only loads the right menu, no scrolling ---- */
function activateLeftItem(item) {
  document
    .querySelectorAll(".menu-selection-left .menu-item")
    .forEach((i) => i.classList.remove("selected"));
  item.classList.add("selected");
  loadRightMenu(item.dataset.target);
}

document.querySelectorAll(".menu-selection-left .menu-item").forEach((item) => {
  item.addEventListener("click", () => activateLeftItem(item));
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      activateLeftItem(item);
    }
  });
});

// populate the right menu once on load for the default-selected left item
const defaultLeft =
  document.querySelector(".menu-selection-left .menu-item.selected") ||
  document.querySelector(".menu-selection-left .menu-item");
if (defaultLeft) activateLeftItem(defaultLeft);
