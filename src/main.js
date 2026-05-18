import * as THREE from "three";
import "./style.css";
import { publicStudents } from "./publicStudents.js";
import { deriveNpcProfile, getStudentRefFromUrl, loadStudentMetrics } from "./studentMetrics.js";

const sceneRoot = document.querySelector("#scene-root");

const overlay = document.createElement("section");
overlay.className = "overlay";
overlay.innerHTML = `
  <h1>Metricas del alumno</h1>
  <p>Seleccion por alias publico. Nunca se expone el id real.</p>
  <label for="student-select">Alumno</label>
  <select id="student-select"></select>
  <div class="metrics" id="metrics-panel"></div>
  <div class="overlay-status" id="metrics-status">Cargando metricas...</div>
`;
sceneRoot.appendChild(overlay);

const studentSelect = overlay.querySelector("#student-select");
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

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.5),
    new THREE.MeshStandardMaterial({ color: "#324f70" })
  );
  marker.position.set(0, 0.5, 0.52);

  const label = makeLabelSprite("Player", "#18212b");
  label.position.set(0, 2.3, 0);

  group.add(
            body, 
            head, 
            // marker, 
            label
          );
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
const initialStudentRef = getStudentRefFromUrl() || publicStudents[0]?.studentRef || "alpha-sam";
let selectedStudent =
  publicStudents.find((student) => student.studentRef === initialStudentRef) ??
  publicStudents[0];
let npcProfile = deriveNpcProfile({
  studentRef: "local-demo",
  label: "Demo local",
  attendancePct: null,
  punctualityAvgLateMinutes: null,
  practicesPct: null,
  gradesPct: null,
  points: null,
  level: 0
});

function formatMetric(value, suffix = "", digits = 0) {
  if (value == null) {
    return "—";
  }

  return `${Number(value).toFixed(digits)}${suffix}`;
}

function renderMetrics(metrics) {
  const rows = [
    ["Alias", metrics.label ?? selectedStudent.label],
    ["Ref", metrics.studentRef],
    ["Asistencia", formatMetric(metrics.attendancePct, "%", 1)],
    ["Retardo prom.", formatMetric(metrics.punctualityAvgLateMinutes, " min", 1)],
    ["Practicas", formatMetric(metrics.practicesPct, "%", 1)],
    ["Calificacion", formatMetric(metrics.gradesPct, "", 1)],
    ["Puntos", formatMetric(metrics.points, "", 1)],
    ["Nivel", formatMetric(metrics.level)]
  ];

  metricsPanel.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`
    )
    .join("");

  metricsStatus.textContent =
    metrics.source === "deutsch"
      ? "Fuente: endpoint de deutsch"
      : "Fuente: demo local";
}

function syncSelectedStudentInUrl(studentRef) {
  const url = new URL(window.location.href);
  url.searchParams.set("studentRef", studentRef);
  window.history.replaceState({}, "", url);
}

async function refreshSelectedStudent() {
  metricsStatus.textContent = "Cargando metricas...";

  try {
    const metrics = await loadStudentMetrics(
      selectedStudent.studentRef,
      selectedStudent.label
    );
    renderMetrics(metrics);
    applyNpcProfile(deriveNpcProfile(metrics));
  } catch {
    metricsStatus.textContent = "No se pudieron cargar las metricas.";
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
    syncSelectedStudentInUrl(selectedStudent.studentRef);
    void refreshSelectedStudent();
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
void refreshSelectedStudent();

updateNpcVisual(player.position.distanceTo(npc.position));
tick();
