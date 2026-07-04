import "./style.css";
import nexusImg from "./images/nexus.png";
import WaveSurfer from "wavesurfer.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
              <div class="menu-item" data-target="home" tabindex="0">home</div>
              <div class="menu-item selected" data-target="members" tabindex="0">members</div>
              <div class="menu-item" data-target="tracks" tabindex="0">tracks</div>
              <div class="menu-item" data-target="prices" tabindex="0">prices</div>
              <div class="menu-item" data-target="merch" tabindex="0">merch</div>
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

    <div class="members-container" id="members">
      <h2 class="members-header">MEMBERS</h2>
      <div class="members-grid"></div>
    </div>

    <div class="music-container" id="tracks">
      <h2 class="members-header">TRACKS</h2>
      <div class="track-list"></div>
    </div>

    <div class="services-container" id="prices">
      <h2 class="members-header">PRICES</h2>
      <div class="services-grid"></div>
    </div>

    <div class="merch-container" id="merch">
      <h2 class="members-header">MERCH</h2>
      <div class="merch-grid"></div>
    </div>
  </main>
`;

const bannerBody = document.querySelector(".banner-body");
const membersGrid = document.querySelector(".members-grid");
const trackList = document.querySelector(".track-list");
const servicesGrid = document.querySelector(".services-grid");
const merchGrid = document.querySelector(".merch-grid");
const menuSelectionRight = document.querySelector(".menu-selection-right");
const footerPreset = document.querySelector(".footer-preset");

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
      .addEventListener("click", () => ws.setTime(0));
    row
      .querySelector(".tp-next")
      .addEventListener("click", () => ws.setTime(ws.getDuration()));

    instances.push(ws);
  });
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
}

async function loadBanners() {
  const res = await fetch(`${API}/api/banners`);
  const banners = await res.json();
  bannerBody.innerHTML = "";

  // nothing active -> leave the bar empty
  if (!banners.length) {
    document.querySelector(".banner-bar").style.display = banners.length
      ? ""
      : "none";
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

async function loadMerch() {
  const res = await fetch(`${API}/api/merch`);
  const items = await res.json();
  merchGrid.innerHTML = "";
  items.forEach((m) => {
    const el = document.createElement("div");
    el.className = "merch-item";
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

loadBanners();
loadMembers();
loadServices();
loadMerch();

/* ---- right menu (preset list) ---- */
const rightMenuSources = {
  members: { url: `${API}/api/members`, label: (x) => x.name },
};

function selectRightItem(item) {
  menuSelectionRight
    .querySelectorAll(".menu-item")
    .forEach((i) => i.classList.remove("selected"));
  item.classList.add("selected");
  if (footerPreset) footerPreset.textContent = item.textContent;
}

function renderRightMenu(items, label) {
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
    el.addEventListener("click", () => selectRightItem(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        selectRightItem(el);
      }
    });
    menuSelectionRight.appendChild(el);
    if (idx === 0) selectRightItem(el);
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
    renderRightMenu(await res.json(), source.label);
  } catch {
    menuSelectionRight.innerHTML = `<div class="menu-item menu-item--empty">failed to load</div>`;
  }
}

/* ---- left menu (categories) ---- */
function goToTarget(el) {
  const id = el.dataset.target;
  if (!id) return;
  const section = document.getElementById(id);
  if (!section) return;
  history.pushState(null, "", `#${id}`);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateLeftItem(item, { scroll = true } = {}) {
  document
    .querySelectorAll(".menu-selection-left .menu-item")
    .forEach((i) => i.classList.remove("selected"));
  item.classList.add("selected");
  loadRightMenu(item.dataset.target);
  if (scroll) goToTarget(item);
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

const defaultLeft =
  document.querySelector(".menu-selection-left .menu-item.selected") ||
  document.querySelector(".menu-selection-left .menu-item");
if (defaultLeft) activateLeftItem(defaultLeft, { scroll: false });
