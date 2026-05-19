import * as THREE from "three";
import "./style.css";
import { publicStudents } from "./publicStudents.js";
import {
  LingGamesHandoffRequiredError,
  deriveNpcProfile,
  getStudentRefFromUrl,
  getTargetStudentCodeFromUrl,
  getDeutschBaseUrl,
  loadStudentCatalog,
  loadStudentMetrics
} from "./studentMetrics.js";

const sceneRoot = document.querySelector("#scene-root");

const overlay = document.createElement("section");
overlay.className = "overlay";
overlay.innerHTML = `
  <h1>NPC Sandbox</h1>
  <p>Sesion segura con deutsch para adaptar el NPC sin exponer ids reales.</p>
  <label for="student-select">Modo</label>
  <select id="student-select"></select>
  <label id="target-student-label" for="target-student-trigger">Alumno objetivo</label>
  <button id="target-student-trigger" type="button" class="target-trigger">Elegir alumno</button>
  <div id="target-student-grid" class="target-grid" hidden></div>
  <div class="metrics" id="metrics-panel"></div>
  <div class="overlay-status" id="metrics-status">Cargando perfil...</div>
`;
sceneRoot.appendChild(overlay);

const studentSelect = overlay.querySelector("#student-select");
const targetStudentLabel = overlay.querySelector("#target-student-label");
const targetStudentTrigger = overlay.querySelector("#target-student-trigger");
const targetStudentGrid = overlay.querySelector("#target-student-grid");
const metricsPanel = overlay.querySelector("#metrics-panel");
const metricsStatus = overlay.querySelector("#metrics-status");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d8e4ef");
scene.fog = new THREE.Fog("#d8e4ef", 12, 30);

const camera = new THREE.PerspectiveCamera(
  55,
  sceneRoot.clientWidth / sceneRoot.clientHeight,
  0.1,
  100
);
camera.position.set(0, 7, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
renderer.shadowMap.enabled = true;
sceneRoot.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight("#ffffff", 1.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight("#fff2d9", 2.1);
sunLight.position.set(6, 10, 6);
sunLight.castShadow = true;
scene.add(sunLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 26),
  new THREE.MeshStandardMaterial({ color: "#edf3f7" })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(4, 4.4, 0.6, 48),
  new THREE.MeshStandardMaterial({ color: "#c27a3a" })
);
platform.position.set(0, 0.3, 0);
platform.receiveShadow = true;
scene.add(platform);

function makeLabelSprite(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "bold 28px Segoe UI";
  context.textAlign = "center";
  context.fillText(text, canvas.width / 2, 56);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6, 1, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  sprite.userData.texture = texture;
  sprite.userData.color = color;
  return sprite;
}

function updateLabelSprite(sprite, text, color = sprite.userData.color) {
  const { canvas, context, texture } = sprite.userData;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "bold 28px Segoe UI";
  context.textAlign = "center";
  context.fillText(text, canvas.width / 2, 56);
  texture.needsUpdate = true;
  sprite.userData.color = color;
}

function buildPlayer() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 1.4, 6, 12),
    new THREE.MeshStandardMaterial({ color: "#40647a" })
  );
  body.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#324f70" })
  );
  head.position.y = 1.34;
  head.castShadow = true;

  const label = makeLabelSprite("Player", "#18212b");
  label.position.set(0, 2.3, 0);

  group.add(body, head, label);
  group.position.set(0, 1.1, 3);
  scene.add(group);

  return group;
}

function buildNpc() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: "#66a3ff" })
  );
  body.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.68, 0.68),
    new THREE.MeshStandardMaterial({ color: "#d7e7ff" })
  );
  head.position.y = 1.58;
  head.castShadow = true;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 1.2),
    new THREE.MeshStandardMaterial({ color: "#34506c" })
  );
  base.position.y = -1.18;

  const label = makeLabelSprite("NPC", "#2d6cdf");
  label.position.set(0, 2.5, 0);

  group.add(body, head, base, label);
  group.position.set(0, 1.4, -1.5);
  group.userData.body = body;
  group.userData.head = head;
  group.userData.base = base;
  group.userData.label = label;
  scene.add(group);

  return group;
}

const player = buildPlayer();
const npc = buildNpc();
const keys = new Set();
const playerVelocity = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0, 5.5, 7.5);
const npcBaseY = npc.position.y;
const requestedStudentRef = getStudentRefFromUrl();
const initialStudentRef =
  requestedStudentRef === "alpha-sam" ||
  requestedStudentRef === "bravo-son" ||
  requestedStudentRef === "charlie-priv"
    ? requestedStudentRef
    : publicStudents[0]?.studentRef || "player-session";
let selectedStudent =
  publicStudents.find((student) => student.studentRef === initialStudentRef) ??
  publicStudents[0];
let targetStudentCode = getTargetStudentCodeFromUrl();
let catalogStudents = [];
let npcProfile = deriveNpcProfile({
  studentRef: "player-session",
  label: "Sesion actual",
  attendancePct: null,
  punctualityAvgLateMinutes: null,
  practicesPct: null,
  practicesCount: 0,
  gradesPct: null,
  mxp: null,
  pointsClass: null,
  pointsTotal: null,
  supportNeed: "medium",
  npcTone: "balanced",
  challengeLevel: "medium",
  engagement: "unknown",
  confidence: "unknown",
  reliability: "unknown",
  pace: "steady",
  recommendedStrategy: "Waiting for metrics.",
  level: 0
});

function formatMetric(value, suffix = "", digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(digits)}${suffix}`;
}

function sampleCatalogStudents(students, size = 5) {
  const copy = Array.isArray(students) ? [...students] : [];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy.slice(0, Math.max(0, size));
}

function getSelectedCatalogStudent() {
  return catalogStudents.find((student) => student.code === targetStudentCode) || null;
}

function renderMetrics(metrics) {
  const selectedCatalogStudent = getSelectedCatalogStudent();
  const rows = [
    ["Modo", selectedStudent.label],
    ["Alumno objetivo", selectedCatalogStudent ? `${selectedCatalogStudent.code} · ${selectedCatalogStudent.day}` : targetStudentCode ?? "Mi sesion"],
    ["Origen", metrics.source],
    ["Asistencia", formatMetric(metrics.attendancePct, "%")],
    ["Puntualidad", formatMetric(metrics.punctualityAvgLateMinutes, " min")],
    ["Practicas", formatMetric(metrics.practicesPct, "%")],
    ["Tareas medidas", metrics.practicesCount ?? 0],
    ["Calificacion", formatMetric(metrics.gradesPct, "", 1)],
    ["MXP", formatMetric(metrics.mxp, "", 1)],
    ["Puntos clase", formatMetric(metrics.pointsClass, "", 1)],
    ["Puntos totales", formatMetric(metrics.pointsTotal, "", 1)],
    ["Nivel actual", metrics.level ?? 0],
    ["Siguiente nivel", metrics.nextLevel ?? "—"],
    ["Support need", metrics.supportNeed],
    ["NPC tone", metrics.npcTone],
    ["Challenge", metrics.challengeLevel],
    ["Engagement", metrics.engagement],
    ["Confidence", metrics.confidence],
    ["Reliability", metrics.reliability],
    ["Pace", metrics.pace],
    ["Missing for next", metrics.missingForNext?.join(", ") || "—"],
    ["Strategy", metrics.recommendedStrategy]
  ];

  metricsPanel.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`
    )
    .join("");

  const warnings = Array.isArray(metrics.warnings) ? metrics.warnings : [];
  metricsStatus.textContent = warnings.length
    ? `Perfil cargado con advertencias: ${warnings[0]}`
    : metrics.source === "deutsch"
      ? "Fuente: player-access + npc-metrics"
      : "Fuente: mock local";
}

function syncStateInUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("studentRef", selectedStudent.studentRef);

  if (targetStudentCode) {
    url.searchParams.set("targetStudentCode", String(targetStudentCode));
  } else {
    url.searchParams.delete("targetStudentCode");
  }

  window.history.replaceState({}, "", url);
}

function syncTargetSelectorVisibility() {
  const visible = selectedStudent.mode === "session";
  targetStudentTrigger.style.display = visible ? "block" : "none";
  targetStudentLabel.style.display = visible ? "block" : "none";
  targetStudentGrid.hidden = !visible;
  if (!visible) {
    targetStudentGrid.classList.remove("open");
  }
}

function updateTargetTriggerLabel() {
  const selectedCatalogStudent = getSelectedCatalogStudent();

  if (!selectedCatalogStudent) {
    targetStudentTrigger.textContent = "Elegir alumno";
    return;
  }

  targetStudentTrigger.textContent = `${selectedCatalogStudent.code} · ${selectedCatalogStudent.day}`;
}

function renderTargetStudentGrid() {
  if (!catalogStudents.length) {
    targetStudentGrid.innerHTML = '<div class="target-grid-empty">Sin acceso al catalogo o sin alumnos disponibles.</div>';
    updateTargetTriggerLabel();
    return;
  }

  targetStudentGrid.innerHTML = catalogStudents
    .map((student) => {
      const active = student.code === targetStudentCode ? " active" : "";
      return `
        <button type="button" class="target-card${active}" data-code="${student.code}">
          <span class="target-card-code">${student.code}</span>
          <span class="target-card-name">Perfil protegido</span>
          <span class="target-card-day">${student.day}</span>
        </button>
      `;
    })
    .join("");

  for (const button of targetStudentGrid.querySelectorAll(".target-card")) {
    button.addEventListener("click", () => {
      targetStudentCode = button.dataset.code || null;
      syncStateInUrl();
      renderTargetStudentGrid();
      updateTargetTriggerLabel();
      targetStudentGrid.classList.remove("open");
      void refreshSelectedStudent();
    });
  }

  updateTargetTriggerLabel();
}

async function ensureCatalogLoaded() {
  if (selectedStudent.mode !== "session") {
    catalogStudents = [];
    renderTargetStudentGrid();
    return;
  }

  const baseUrl = getDeutschBaseUrl();
  const storedToken = window.sessionStorage.getItem("linggames.accessToken") || "";

  if (!baseUrl || !storedToken) {
    catalogStudents = [];
    renderTargetStudentGrid();
    return;
  }

  try {
    const loadedStudents = await loadStudentCatalog(baseUrl, storedToken);
    catalogStudents = sampleCatalogStudents(loadedStudents, 5);

    if (targetStudentCode && !catalogStudents.some((student) => student.code === targetStudentCode)) {
      targetStudentCode = null;
    }

    if (!targetStudentCode && catalogStudents[0]) {
      targetStudentCode = catalogStudents[0].code;
      syncStateInUrl();
    }
  } catch (error) {
    if (error instanceof LingGamesHandoffRequiredError) {
      window.location.href = error.handoffUrl;
      return;
    }

    catalogStudents = [];
  }

  renderTargetStudentGrid();
}

async function refreshSelectedStudent() {
  metricsStatus.textContent =
    selectedStudent.mode === "session"
      ? "Conectando con deutsch..."
      : "Cargando mock local...";

  try {
    const metrics = await loadStudentMetrics(selectedStudent, selectedStudent.label, {
      targetStudentCode
    });

    await ensureCatalogLoaded();
    renderMetrics(metrics);
    applyNpcProfile(deriveNpcProfile(metrics));
  } catch (error) {
    if (error instanceof LingGamesHandoffRequiredError) {
      metricsStatus.textContent = "Redirigiendo a deutsch para validar la sesion...";
      window.location.href = error.handoffUrl;
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    metricsStatus.textContent = `No se pudo cargar el perfil: ${message}`;
  }
}

function initStudentSelect() {
  studentSelect.innerHTML = publicStudents
    .map(
      (student) =>
        `<option value="${student.studentRef}">${student.label}</option>`
    )
    .join("");

  studentSelect.value = selectedStudent.studentRef;
  studentSelect.addEventListener("change", () => {
    const nextStudent = publicStudents.find(
      (student) => student.studentRef === studentSelect.value
    );

    if (!nextStudent) {
      return;
    }

    selectedStudent = nextStudent;
    syncTargetSelectorVisibility();
    syncStateInUrl();
    void refreshSelectedStudent();
  });
}

function initTargetSelector() {
  targetStudentTrigger.addEventListener("click", () => {
    if (selectedStudent.mode !== "session") {
      return;
    }

    targetStudentGrid.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    if (!overlay.contains(event.target)) {
      targetStudentGrid.classList.remove("open");
    }
  });
}

function applyNpcProfile(profile) {
  npcProfile = profile;
  npc.userData.body.material.color.set(profile.bodyColor);
  npc.userData.head.material.color.set(profile.headColor);
  npc.scale.y = profile.heightScale;
  updateLabelSprite(npc.userData.label, profile.label, profile.bodyColor);
}

function updateNpcVisual(distance) {
  if (distance < npcProfile.detectionRadius) {
    npc.userData.base.material.color.set("#18212b");
    return;
  }

  npc.userData.base.material.color.set("#34506c");
}

function onResize() {
  camera.aspect = sceneRoot.clientWidth / sceneRoot.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
}

window.addEventListener("resize", onResize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function tick() {
  const moveX = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  const moveZ = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);

  playerVelocity.set(moveX, 0, moveZ);
  if (playerVelocity.lengthSq() > 0) {
    playerVelocity.normalize().multiplyScalar(0.08);
    player.position.add(playerVelocity);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -5.5, 5.5);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -5.5, 5.5);
    player.lookAt(player.position.clone().add(playerVelocity));
  }

  camera.position.lerp(player.position.clone().add(cameraOffset), 0.08);
  camera.lookAt(player.position.x, 1.3, player.position.z - 2.5);

  npc.position.y =
    npcBaseY + Math.sin(performance.now() * npcProfile.bobSpeed) * npcProfile.bobAmount;

  const distance = player.position.distanceTo(npc.position);
  updateNpcVisual(distance);

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}

applyNpcProfile(npcProfile);
initStudentSelect();
initTargetSelector();
syncTargetSelectorVisibility();
void refreshSelectedStudent();

updateNpcVisual(player.position.distanceTo(npc.position));
tick();

