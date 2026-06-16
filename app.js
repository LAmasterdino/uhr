const STORAGE_KEY = "de_clock_config_v1";

function byId(id) {
  return document.getElementById(id);
}

function safeJSONParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function clamp255(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(255, Math.max(0, n));
}

function getDefaultConfig() {
  return {
    bgMode: "preset",
    presetColor: "255,0,0",
    customRgb: { r: 255, g: 0, b: 0 },
    imageDataUrl: ""
  };
}

function loadConfig() {
  const cfg = safeJSONParse(localStorage.getItem(STORAGE_KEY), null);
  return cfg && typeof cfg === "object" ? { ...getDefaultConfig(), ...cfg } : getDefaultConfig();
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function applyBackgroundToClock(cfg) {
  const body = document.body;
  body.style.backgroundImage = "";
  body.style.backgroundColor = "";

  if (cfg.bgMode === "image" && cfg.imageDataUrl) {
    body.style.backgroundImage = `url("${cfg.imageDataUrl}")`;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat = "no-repeat";
  } else {
    const [r, g, b] = (cfg.presetColor || "255,0,0").split(",").map(n => Number.parseInt(n, 10));
    body.style.background = `linear-gradient(180deg, rgba(${r},${g},${b},0.50), rgba(17,24,39,0.96))`;
  }
}

function formatGermanyTime(date) {
  const time = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);

  const dateText = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit"
  }).format(date);

  return { time, dateText };
}

function initIndexPage() {
  const cfg = loadConfig();
  const presetButtons = Array.from(document.querySelectorAll(".color-swatch"));
  const bgModeInputs = Array.from(document.querySelectorAll('input[name="bgMode"]'));
  const presetArea = byId("presetArea");
  const imageArea = byId("imageArea");
  const imageInput = byId("imageInput");
  const imagePreview = byId("imagePreview");
  const goClockBtn = byId("goClockBtn");
  const resetBtn = byId("resetBtn");
  const rInput = byId("rInput");
  const gInput = byId("gInput");
  const bInput = byId("bInput");

  let selectedPresetColor = cfg.presetColor || "255,0,0";
  let imageDataUrl = cfg.imageDataUrl || "";

  function setMode(mode) {
    presetArea.classList.toggle("hidden", mode !== "preset");
    imageArea.classList.toggle("hidden", mode !== "image");
    bgModeInputs.forEach(input => {
      input.checked = input.value === mode;
    });
  }

  function setActivePreset(color) {
    selectedPresetColor = color;
    presetButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.color === color));
    const [r, g, b] = color.split(",").map(Number);
    rInput.value = r;
    gInput.value = g;
    bInput.value = b;
  }

  setMode(cfg.bgMode || "preset");
  setActivePreset(cfg.presetColor || "255,0,0");

  if (cfg.bgMode === "image" && cfg.imageDataUrl) {
    imagePreview.src = cfg.imageDataUrl;
    imagePreview.classList.remove("hidden");
  }

  bgModeInputs.forEach(input => {
    input.addEventListener("change", () => setMode(input.value));
  });

  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => setActivePreset(btn.dataset.color));
  });

  [rInput, gInput, bInput].forEach(input => {
    input.addEventListener("input", () => {
      const r = clamp255(rInput.value, 255);
      const g = clamp255(gInput.value, 0);
      const b = clamp255(bInput.value, 0);
      selectedPresetColor = `${r},${g},${b}`;
      presetButtons.forEach(btn => btn.classList.remove("active"));
    });
  });

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      imageDataUrl = String(reader.result || "");
      imagePreview.src = imageDataUrl;
      imagePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  goClockBtn.addEventListener("click", () => {
    const bgMode = bgModeInputs.find(input => input.checked)?.value || "preset";
    const customRgb = {
      r: clamp255(rInput.value, 255),
      g: clamp255(gInput.value, 0),
      b: clamp255(bInput.value, 0)
    };

    const finalPresetColor = selectedPresetColor || `${customRgb.r},${customRgb.g},${customRgb.b}`;
    const nextConfig = {
      bgMode,
      presetColor: finalPresetColor,
      customRgb,
      imageDataUrl
    };

    saveConfig(nextConfig);
    window.location.href = "clock.html";
  });

  resetBtn.addEventListener("click", () => {
    const defaults = getDefaultConfig();
    saveConfig(defaults);
    selectedPresetColor = defaults.presetColor;
    imageDataUrl = "";
    imageInput.value = "";
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    setMode(defaults.bgMode);
    setActivePreset(defaults.presetColor);
    rInput.value = defaults.customRgb.r;
    gInput.value = defaults.customRgb.g;
    bInput.value = defaults.customRgb.b;
  });
}

function initClockPage() {
  const cfg = loadConfig();
  const timeEl = byId("time");
  const dateEl = byId("date");
  const fullscreenBtn = byId("fullscreenBtn");
  const backBtn = byId("backBtn");

  applyBackgroundToClock(cfg);

  function updateClock() {
    const now = new Date();
    const { time, dateText } = formatGermanyTime(now);
    timeEl.textContent = time;
    dateEl.textContent = dateText;
  }

  updateClock();
  setInterval(updateClock, 1000);

  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Vollbild konnte nicht aktiviert werden:", err);
    }
  });

  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("page-index")) initIndexPage();
  if (document.body.classList.contains("page-clock")) initClockPage();
});
