import * as THREE from "three";
import "./style.css";

const sceneRoot = document.querySelector("#scene-root");
const npcState = document.querySelector("#npc-state");
const playerState = document.querySelector("#player-state");

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
  return sprite;
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
    new THREE.MeshStandardMaterial({ color: "#f0c8a0" })
  );
  head.position.y = 1.34;
  head.castShadow = true;

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.5),
    new THREE.MeshStandardMaterial({ color: "#ffd166" })
  );
  marker.position.set(0, 0.5, 0.52);

  const label = makeLabelSprite("Player", "#18212b");
  label.position.set(0, 2.3, 0);

  group.add(body, head, marker, label);
  group.position.set(0, 1.1, 3);
  scene.add(group);

  return group;
}

function buildNpc() {
  const group = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.86, 2.1, 32),
    new THREE.MeshStandardMaterial({ color: "#66a3ff" })
  );
  robe.castShadow = true;

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#f8dfc5" })
  );
  face.position.y = 1.32;
  face.castShadow = true;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.06, 12, 36),
    new THREE.MeshStandardMaterial({ color: "#fff6c4", emissive: "#ffe49c" })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.72;

  const label = makeLabelSprite("NPC", "#2d6cdf");
  label.position.set(0, 2.45, 0);

  group.add(robe, face, halo, label);
  group.position.set(0, 1.4, -1.5);
  scene.add(group);

  return group;
}

const player = buildPlayer();
const npc = buildNpc();
const keys = new Set();
const playerVelocity = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0, 5.5, 7.5);
const npcBaseY = npc.position.y;

function updateHud(distance) {
  playerState.textContent = `x ${player.position.x.toFixed(1)} | z ${player.position.z.toFixed(1)}`;

  if (distance < 2.4) {
    npcState.textContent = "El NPC te detecta y se prepara para interactuar.";
    npc.children[0].material.color.set("#ff8a3d");
    return;
  }

  npcState.textContent = "El NPC esta en espera.";
  npc.children[0].material.color.set("#66a3ff");
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

  npc.position.y = npcBaseY + Math.sin(performance.now() * 0.002) * 0.06;

  const distance = player.position.distanceTo(npc.position);
  updateHud(distance);

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}

updateHud(player.position.distanceTo(npc.position));
tick();
