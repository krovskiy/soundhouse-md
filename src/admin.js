import "./style.css";
import "./admin.css";

import Cropper from "cropperjs";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function api(pathname, opts = {}) {
  return fetch(API + pathname, { credentials: "include", ...opts });
}

async function jsonPost(pathname, body, method = "POST") {
  const res = await api(pathname, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error((await res.json().catch(() => ({}))).error || res.status);
  return res.json();
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function cropImage(file, aspect) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);

    const overlay = document.createElement("div");
    overlay.className = "adm-crop-overlay";
    overlay.innerHTML = `
      <div class="adm-crop-box">
        <div class="adm-panel-head">crop image</div>
        <div class="adm-crop-stage"></div>
        <div class="adm-crop-bar">
          <button class="adm-btn" data-act="ok">crop</button>
          <button class="adm-btn adm-ghost" data-act="cancel">cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const image = new Image();
    image.src = url;

    const cropper = new Cropper(image, {
      container: overlay.querySelector(".adm-crop-stage"),
      template: `
        <cropper-canvas background style="height:60vh">
          <cropper-image rotatable scalable translatable></cropper-image>
          <cropper-shade hidden></cropper-shade>
          <cropper-handle action="move" plain></cropper-handle>
          <cropper-selection initial-coverage="0.9" ${aspect ? `aspect-ratio="${aspect}"` : ""} movable resizable outlined>
            <cropper-grid role="grid" bordered covered></cropper-grid>
            <cropper-crosshair centered></cropper-crosshair>
            <cropper-handle action="move" theme-color="rgba(168,151,204,0.35)"></cropper-handle>
            <cropper-handle action="n-resize"></cropper-handle>
            <cropper-handle action="e-resize"></cropper-handle>
            <cropper-handle action="s-resize"></cropper-handle>
            <cropper-handle action="w-resize"></cropper-handle>
            <cropper-handle action="ne-resize"></cropper-handle>
            <cropper-handle action="nw-resize"></cropper-handle>
            <cropper-handle action="se-resize"></cropper-handle>
            <cropper-handle action="sw-resize"></cropper-handle>
          </cropper-selection>
        </cropper-canvas>
      `,
    });

    const done = (blob) => {
      URL.revokeObjectURL(url);
      overlay.remove();
      resolve(blob);
    };

    overlay.querySelector('[data-act="cancel"]').onclick = () => done(null);
    overlay.querySelector('[data-act="ok"]').onclick = async () => {
      try {
        const canvasEl = cropper.getCropperCanvas();
        const selection = canvasEl.querySelector("cropper-selection");
        const cropperImage = canvasEl.querySelector("cropper-image");

        const natural = cropperImage.$image.naturalWidth;
        const shown = cropperImage.getBoundingClientRect().width;
        const scale = natural && shown ? natural / shown : 1;

        const canvas = await selection.$toCanvas({
          width: Math.round(selection.width * scale),
          height: Math.round(selection.height * scale),
        });

        canvas.toBlob((blob) => done(blob), "image/jpeg", 0.92);
      } catch (e) {
        console.error("crop failed:", e);
        done(null);
      }
    };
  });
}
const app = document.querySelector("#app");

function renderLogin(msg = "") {
  app.innerHTML = /*html*/ `
    <div class="adm-login">
      <div class="adm-panel adm-login-box">
        <div class="adm-panel-head">admin // access</div>
        <div class="adm-login-body">
          ${msg ? `<div class="adm-error">${esc(msg)}</div>` : ""}
          <input class="adm-input" id="u" placeholder="username" autocomplete="username">
          <input class="adm-input" id="p" type="password" placeholder="password" autocomplete="current-password">
          <button class="adm-btn adm-btn-go" id="go">enter</button>
        </div>
      </div>
    </div>
  `;
  const go = document.querySelector("#go");
  const submit = async () => {
    go.disabled = true;
    try {
      await jsonPost("/api/admin/login", {
        username: document.querySelector("#u").value,
        password: document.querySelector("#p").value,
      });
      renderDash();
    } catch {
      renderLogin("invalid credentials");
    }
  };
  go.addEventListener("click", submit);
  app
    .querySelectorAll(".adm-input")
    .forEach((i) =>
      i.addEventListener("keydown", (e) => e.key === "Enter" && submit()),
    );
}

async function upload(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).path;
}

async function deleteMedia(path) {
  if (!path || !path.startsWith("/media/")) return;
  try {
    await api("/api/admin/media", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
  } catch (e) {
    console.warn("could not delete old media:", path, e);
  }
}

function section(cfg) {
  return { ...cfg };
}

const SECTIONS = {
  members: section({
    title: "members",
    base: "/api/admin/members",
    fields: [
      { key: "name", label: "name", type: "text" },
      { key: "img_path", label: "image", type: "image", aspect: 3 / 4 },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (m) => m.name,
    hasTracks: true,
  }),
  showcase: section({
    title: "showcase",
    base: "/api/admin/showcase",
    fields: [
      { key: "img_path", label: "image", type: "image", aspect: 16 / 9 },
      { key: "caption", label: "caption", type: "text" },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (s) => `${s.caption || "(no caption)"}`,
  }),
  services: section({
    title: "services",
    base: "/api/admin/services",
    fields: [
      { key: "title", label: "title", type: "text" },
      { key: "description", label: "description", type: "textarea" },
      { key: "price", label: "price", type: "text" },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (s) => `${s.title} — ${s.price}`,
  }),
  merch: section({
    title: "merch",
    base: "/api/admin/merch",
    fields: [
      { key: "name", label: "name", type: "text" },
      { key: "price", label: "price", type: "text" },
      {
        key: "sizes",
        label: "sizes (comma-separated, blank = none)",
        type: "text",
      },
      { key: "img_path", label: "image", type: "image" },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (m) => `${m.name} — ${m.price}`,
  }),
  banners: section({
    title: "banners",
    base: "/api/admin/banners",
    fields: [
      { key: "text", label: "text", type: "text" },
      { key: "active", label: "active", type: "toggle" },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (b) => `${b.active ? "●" : "○"} ${b.text}`,
  }),
  releases: section({
    title: "releases",
    base: "/api/admin/releases",
    fields: [
      { key: "title", label: "title", type: "text" },
      { key: "img_path", label: "cover (1000x1000)", type: "image", aspect: 1 },
      { key: "soundcloud", label: "soundcloud url", type: "text" },
      { key: "spotify", label: "spotify url", type: "text" },
      { key: "apple", label: "apple music url", type: "text" },
      { key: "youtube", label: "youtube url", type: "text" },
      { key: "sort", label: "sort", type: "number" },
    ],
    row: (r) => r.title || "(untitled)",
  }),
};

let activeKey = "members";

function renderDash() {
  app.innerHTML = /*html*/ `
    <div class="adm-shell">
      <aside class="adm-side adm-panel">
        <div class="adm-panel-head">soundhouse // admin</div>
        <nav class="adm-nav">
          ${Object.keys(SECTIONS)
            .map(
              (k) =>
                `<button class="adm-navbtn ${k === activeKey ? "on" : ""}" data-k="${k}">${SECTIONS[k].title}</button>`,
            )
            .join("")}
        </nav>
        <button class="adm-btn adm-logout" id="logout">log out</button>
      </aside>
      <div class="adm-main" id="main"></div>
    </div>
  `;
  app.querySelectorAll(".adm-navbtn").forEach((b) =>
    b.addEventListener("click", () => {
      activeKey = b.dataset.k;
      renderDash();
    }),
  );
  app.querySelector("#logout").addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST" });
    renderLogin();
  });
  renderSection(SECTIONS[activeKey]);
}

function fieldInputs(cfg, data = {}) {
  const wrap = document.createElement("div");
  wrap.className = "adm-fields";
  const getters = {};
  const mediaFields = [];

  for (const f of cfg.fields) {
    const g = document.createElement("div");
    g.className = "adm-field";
    g.innerHTML = `<label>${f.label}</label>`;
    let el;

    if (f.type === "textarea") {
      el = document.createElement("textarea");
      el.value = data[f.key] ?? "";
      getters[f.key] = () => el.value;
    } else if (f.type === "image" || f.type === "audio") {
      el = document.createElement("input");
      el.value = data[f.key] ?? "";
      el.placeholder = "/media/...";
      el.className = "adm-input";

      const media = {
        getValue: () => el.value,
        persisted: data[f.key] ?? "",
        session: "",
      };
      mediaFields.push(media);

      const file = document.createElement("input");
      file.type = "file";
      file.accept = f.type === "image" ? "image/*" : "audio/*";
      file.className = "adm-file";
      file.addEventListener("change", async () => {
        if (!file.files[0]) return;
        file.disabled = true;
        try {
          let toUpload = file.files[0];
          if (f.type === "image") {
            const cropped = await cropImage(toUpload, f.aspect);
            if (!cropped) {
              file.value = "";
              file.disabled = false;
              return;
            }
            toUpload = new File([cropped], "crop.jpg", { type: "image/jpeg" });
          }
          const newPath = await upload(toUpload);

          if (media.session && media.session !== newPath)
            deleteMedia(media.session);
          media.session = newPath;
          el.value = newPath;
        } catch (e) {
          console.error("FAILED AT:", e);
          alert("upload failed: " + (e?.message || e));
        }
        file.disabled = false;
      });

      g.appendChild(el);
      g.appendChild(file);
      getters[f.key] = () => el.value;
      wrap.appendChild(g);
      continue;
    } else if (f.type === "toggle") {
      el = document.createElement("input");
      el.type = "checkbox";
      el.className = "adm-toggle";
      el.checked = data[f.key] ?? true;
      getters[f.key] = () => el.checked;
      g.appendChild(el);
      wrap.appendChild(g);
      continue;
    } else {
      el = document.createElement("input");
      el.type = f.type === "number" ? "number" : "text";
      el.value = data[f.key] ?? "";
      getters[f.key] =
        f.type === "number" ? () => Number(el.value) || 0 : () => el.value;
    }
    el.className = "adm-input";
    g.appendChild(el);
    wrap.appendChild(g);
  }

  return {
    wrap,
    collect: () =>
      Object.fromEntries(Object.entries(getters).map(([k, f]) => [k, f()])),

    commit: () => {
      for (const m of mediaFields) {
        const now = m.getValue();
        if (m.persisted && m.persisted !== now) deleteMedia(m.persisted);
        m.persisted = now;
        m.session = "";
      }
    },

    discard: () => {
      for (const m of mediaFields) {
        if (m.session && m.session !== m.persisted) deleteMedia(m.session);
        m.session = "";
      }
    },
  };
}

async function renderSection(cfg) {
  const main = document.querySelector("#main");
  main.innerHTML = `<div class="adm-panel"><div class="adm-panel-head">${cfg.title}</div><div class="adm-list" id="list">loading…</div></div>`;
  const list = main.querySelector("#list");

  let rows = [];
  try {
    rows = await (await api(cfg.base)).json();
  } catch {
    list.innerHTML = `<div class="adm-error">failed to load</div>`;
    return;
  }

  list.innerHTML = "";

  rows.forEach((r) => {
    const item = document.createElement("div");
    item.className = "adm-item";
    item.innerHTML = `
      <span class="adm-item-label">${esc(cfg.row(r))}</span>
      <span class="adm-item-actions">
        ${cfg.hasTracks ? `<button class="adm-mini" data-act="tracks">tracks</button>` : ""}
        <button class="adm-mini" data-act="edit">edit</button>
        <button class="adm-mini adm-danger" data-act="del">del</button>
      </span>
    `;
    item
      .querySelector('[data-act="del"]')
      .addEventListener("click", async () => {
        if (!confirm("delete this?")) return;
        await api(`${cfg.base}/${r.id}`, { method: "DELETE" });

        for (const f of cfg.fields)
          if (f.type === "image" || f.type === "audio") deleteMedia(r[f.key]);
        renderSection(cfg);
      });
    item
      .querySelector('[data-act="edit"]')
      .addEventListener("click", () => openForm(cfg, r));
    if (cfg.hasTracks)
      item
        .querySelector('[data-act="tracks"]')
        .addEventListener("click", () => renderTracks(r));
    list.appendChild(item);
  });

  const add = document.createElement("button");
  add.className = "adm-btn adm-add";
  add.textContent = `+ new ${cfg.title.replace(/s$/, "")}`;
  add.addEventListener("click", () => openForm(cfg, null));
  list.appendChild(add);
}

function openForm(cfg, data) {
  const main = document.querySelector("#main");
  const editing = !!data;
  const { wrap, collect, commit, discard } = fieldInputs(cfg, data || {});

  main.innerHTML = `<div class="adm-panel"><div class="adm-panel-head">${editing ? "edit" : "new"} ${cfg.title.replace(/s$/, "")}</div><div class="adm-form" id="form"></div></div>`;
  const form = main.querySelector("#form");
  form.appendChild(wrap);

  const bar = document.createElement("div");
  bar.className = "adm-formbar";
  bar.innerHTML = `<button class="adm-btn" id="save">save</button><button class="adm-btn adm-ghost" id="cancel">cancel</button>`;
  form.appendChild(bar);

  bar.querySelector("#cancel").addEventListener("click", () => {
    discard();
    renderSection(cfg);
  });
  bar.querySelector("#save").addEventListener("click", async () => {
    try {
      const body = collect();
      if (editing) await jsonPost(`${cfg.base}/${data.id}`, body, "PUT");
      else await jsonPost(cfg.base, body, "POST");
      commit();
      renderSection(cfg);
    } catch (e) {
      alert("save failed: " + e.message);
    }
  });
}

async function renderTracks(member) {
  const main = document.querySelector("#main");
  main.innerHTML = `<div class="adm-panel"><div class="adm-panel-head">tracks // ${esc(member.name)}</div><div class="adm-list" id="list">loading…</div></div>`;
  const list = main.querySelector("#list");

  const trackCfg = {
    fields: [
      { key: "position", label: "position", type: "number" },
      { key: "title", label: "title", type: "text" },
      { key: "file_path", label: "audio", type: "audio" },
      { key: "cover_path", label: "cover", type: "image" },
    ],
  };

  let rows = [];
  try {
    rows = await (await api(`/api/admin/members/${member.id}/tracks`)).json();
  } catch {
    list.innerHTML = `<div class="adm-error">failed to load</div>`;
    return;
  }

  list.innerHTML = "";

  const back = document.createElement("button");
  back.className = "adm-btn adm-ghost adm-back";
  back.textContent = "← members";
  back.addEventListener("click", () => renderSection(SECTIONS.members));
  list.appendChild(back);

  rows.forEach((t) => {
    const item = document.createElement("div");
    item.className = "adm-item";
    item.innerHTML = `
      <span class="adm-item-label">${String(t.position).padStart(2, "0")} — ${esc(t.title)}</span>
      <span class="adm-item-actions">
        <button class="adm-mini" data-act="edit">edit</button>
        <button class="adm-mini adm-danger" data-act="del">del</button>
      </span>`;
    item
      .querySelector('[data-act="del"]')
      .addEventListener("click", async () => {
        if (!confirm("delete this track?")) return;
        await api(`/api/admin/tracks/${t.id}`, { method: "DELETE" });
        deleteMedia(t.file_path);
        deleteMedia(t.cover_path);
        renderTracks(member);
      });
    item
      .querySelector('[data-act="edit"]')
      .addEventListener("click", () => openTrackForm(member, t, trackCfg));
    list.appendChild(item);
  });

  const add = document.createElement("button");
  add.className = "adm-btn adm-add";
  add.textContent = "+ new track";
  add.addEventListener("click", () => openTrackForm(member, null, trackCfg));
  list.appendChild(add);
}

function openTrackForm(member, data, trackCfg) {
  const main = document.querySelector("#main");
  const editing = !!data;
  const { wrap, collect, commit, discard } = fieldInputs(
    trackCfg,
    data || { position: 1 },
  );

  main.innerHTML = `<div class="adm-panel"><div class="adm-panel-head">${editing ? "edit" : "new"} track</div><div class="adm-form" id="form"></div></div>`;
  const form = main.querySelector("#form");
  form.appendChild(wrap);

  const bar = document.createElement("div");
  bar.className = "adm-formbar";
  bar.innerHTML = `<button class="adm-btn" id="save">save</button><button class="adm-btn adm-ghost" id="cancel">cancel</button>`;
  form.appendChild(bar);

  bar.querySelector("#cancel").addEventListener("click", () => {
    discard();
    renderTracks(member);
  });
  bar.querySelector("#save").addEventListener("click", async () => {
    try {
      const body = collect();
      if (!body.file_path) throw new Error("audio required");
      if (editing) await jsonPost(`/api/admin/tracks/${data.id}`, body, "PUT");
      else
        await jsonPost(`/api/admin/members/${member.id}/tracks`, body, "POST");
      commit();
      renderTracks(member);
    } catch (e) {
      alert("save failed: " + e.message);
    }
  });
}

(async () => {
  const res = await api("/api/admin/me");
  if (res.ok) renderDash();
  else renderLogin();
})();
