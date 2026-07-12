// Bussola dei Venti — main app logic
// Wind names & dialect terms live in js/data/venti.json — edit that file to fill in the
// "dialettale" field for Manduria; no UI editing is exposed here on purpose.

const DEFAULT_COORDS = { lat: 40.4014, lon: 17.6335 }; // Manduria, used as fallback

let WINDS = [];

async function loadWinds() {
  try {
    const res = await fetch('js/data/venti.json');
    WINDS = await res.json();
  } catch (e) {
    console.error('Could not load js/data/venti.json — check that the file exists and, if testing locally, that you are serving the project over http(s) rather than opening index.html directly.');
    WINDS = [];
  }
}

function nearestWind(deg) {
  let best = WINDS[0], bestDiff = Infinity;
  for (const w of WINDS) {
    const diff = Math.abs(((deg - w.deg + 180 + 360) % 360) - 180);
    if (diff < bestDiff) { bestDiff = diff; best = w; }
  }
  return best;
}

// --- draw static compass face (ticks, rhumb star, labels) ---
function drawFace() {
  const ticks = document.getElementById('ticks');
  const rhumb = document.getElementById('rhumb');
  const labels = document.getElementById('labels');
  const cx = 150, cy = 150;

  for (let d = 0; d < 360; d += 15) {
    const rad = (d - 90) * Math.PI / 180;
    const isMajor = d % 45 === 0;
    const r1 = isMajor ? 128 : 134;
    const r2 = 144;
    const x1 = cx + r1 * Math.cos(rad), y1 = cy + r1 * Math.sin(rad);
    const x2 = cx + r2 * Math.cos(rad), y2 = cy + r2 * Math.sin(rad);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("stroke-width", isMajor ? 1.6 : 0.8);
    ticks.appendChild(line);
  }

  WINDS.forEach(w => {
    const rad = (w.deg - 90) * Math.PI / 180;
    const x1 = cx + 6 * Math.cos(rad), y1 = cy + 6 * Math.sin(rad);
    const x2 = cx + 112 * Math.cos(rad), y2 = cy + 112 * Math.sin(rad);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    rhumb.appendChild(line);

    const lr = 100;
    const lx = cx + lr * Math.cos(rad), ly = cy + lr * Math.sin(rad);
    const shortLabel = w.italiano.startsWith("Ostro") ? "OSTRO" : w.italiano;
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", lx); t.setAttribute("y", ly + 3.5);
    if (w.italiano.startsWith("Ostro")) t.setAttribute("font-size", "9.5");
    t.textContent = shortLabel.toUpperCase();
    labels.appendChild(t);
  });
}

// --- DOM refs ---
const statusEl = document.getElementById('status');
const needle = document.getElementById('needle');
const windNameEl = document.getElementById('windName');
const windDegEl = document.getElementById('windDeg');
const windSpeedEl = document.getElementById('windSpeed');
const factsEl = document.getElementById('facts');
const langSwitch = document.getElementById('langSwitch');
const langLeft = document.getElementById('langLeft');
const langRight = document.getElementById('langRight');
const refreshBtn = document.getElementById('refreshBtn');

let lastReading = null; // { deg, speedKmh, place }
let lastCoords = null;

function setNeedle(deg) {
  needle.setAttribute('transform', `rotate(${deg} 150 150)`);
}

function updateToggleLabels() {
  langLeft.classList.toggle('active', !langSwitch.checked);
  langRight.classList.toggle('active', langSwitch.checked);
}

function renderWind(deg, speedKmh, place) {
  lastReading = { deg, speedKmh, place };
  const w = nearestWind(deg);
  if (!w) return;
  const useDialetto = langSwitch.checked;
  const hasDialetto = !!w.dialettale;

  windNameEl.textContent = (useDialetto && hasDialetto) ? w.dialettale : w.italiano;
  windDegEl.textContent = (useDialetto && hasDialetto)
    ? `${w.italiano} · ${Math.round(deg)}°`
    : `${Math.round(deg)}°`;
  windSpeedEl.textContent = `${Math.round(speedKmh)} km/h`;
  setNeedle(deg);
  factsEl.innerHTML = (place ? `<span><b>Luogo</b> ${place}</span>` : "") +
    (hasDialetto
      ? `<span><b>Manduria</b> ${w.dialettale}</span>`
      : `<span style="opacity:.6">nessun termine dialettale in venti.json per questo vento</span>`);
}

function renderCurrentWind() {
  if (lastReading) renderWind(lastReading.deg, lastReading.speedKmh, lastReading.place);
}

async function fetchWind(lat, lon, place) {
  statusEl.textContent = "Consultando il vento…";
  statusEl.classList.remove('error');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`;
    const res = await fetch(url);
    const data = await res.json();
    renderWind(data.current.wind_direction_10m, data.current.wind_speed_10m, place);
    statusEl.textContent = "Aggiornato ora";
  } catch (e) {
    statusEl.textContent = "Non riesco a leggere il vento in questo momento.";
    statusEl.classList.add('error');
  }
}

// --- Reverse geocoding via BigDataCloud ---
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`;
    const res = await fetch(url);
    const data = await res.json();
    return data.city || data.locality || null;
  } catch (e) {
    console.error('Reverse geocoding failed:', e);
    return null;
  }
}

function locate() {
  statusEl.textContent = "Sto cercando la tua posizione…";
  statusEl.classList.remove('error');
  if (!navigator.geolocation) {
    statusEl.textContent = "Geolocalizzazione non disponibile — uso Manduria come riferimento.";
    lastCoords = DEFAULT_COORDS;
    fetchWind(lastCoords.lat, lastCoords.lon, "Manduria (predefinito)");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      lastCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const placeName = await reverseGeocode(lastCoords.lat, lastCoords.lon);
      fetchWind(lastCoords.lat, lastCoords.lon, placeName || "posizione attuale");
    },
    err => {
      let errorMsg = "Posizione non concessa — uso Manduria come riferimento.";
      
      if (err.code === 1) {
        errorMsg = "permesso negato — controlla i permessi di posizione del browser per questo sito. Uso Manduria come riferimento.";
      } else if (err.code === 2) {
        errorMsg = "posizione non disponibile — GPS/rete non riescono a localizzarti. Uso Manduria come riferimento.";
      } else if (err.code === 3) {
        errorMsg = "richiesta scaduta — nessuna risposta entro il tempo limite. Uso Manduria come riferimento.";
      }
      
      statusEl.textContent = errorMsg;
      lastCoords = DEFAULT_COORDS;
      fetchWind(lastCoords.lat, lastCoords.lon, "Manduria (predefinito)");
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 }
  );
}

refreshBtn.addEventListener('click', () => {
  if (lastCoords) fetchWind(lastCoords.lat, lastCoords.lon);
  else locate();
});

langSwitch.addEventListener('change', () => {
  updateToggleLabels();
  renderCurrentWind();
});

(async function init() {
  await loadWinds();
  drawFace();
  updateToggleLabels();
  locate();
})();
