import * as THREE from "three";
import "./style.css";
import { students } from "./data/students.js";
import { npcProfiles } from "./sim/npcProfiles.js";
import { getNpcReaction } from "./sim/reactionEngine.js";

const sceneRoot = document.querySelector("#scene-root");
const studentDetails = document.querySelector("#student-details");
const npcReactions = document.querySelector("#npc-reactions");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d8e4ef");
scene.fog = new THREE.Fog("#d8e4ef", 10, 28);

const camera = new THREE.PerspectiveCamera(
  55,
  sceneRoot.clientWidth / sceneRoot.clientHeight,
  0.1,
  100
);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
renderer.shadowMap.enabled = true;
sceneRoot.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight("#ffffff", 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight("#fff2d9", 2.2);
sunLight.position.set(6, 12, 4);
sunLight.castShadow = true;
scene.add(sunLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshStandardMaterial({ color: "#eef3f8" })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.6, 0.8, 48),
  new THREE.MeshStandardMaterial({ color: "#b46b2e" })
);
platform.position.set(0, 0.4, 0);
platform.receiveShadow = true;
scene.add(platform);

const classroomRing = new THREE.Group();
scene.add(classroomRing);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const studentMeshes = [];
const npcMeshes = [];
let currentStudent = students[0];
let time = 0;

function makeLabelSprite(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "bold 28px Segoe UI";
  context.textAlign = "center";
  context.fillText(text, canvas.width / 2, 56);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 1.05, 1);
  return sprite;
}

function buildStudentAvatar(student, index) {
  const angle = (index / students.length) * Math.PI * 2 + Math.PI / 2;
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1.5, 6, 12),
    new THREE.MeshStandardMaterial({ color: "#405d72" })
  );
  body.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#f0c8a0" })
  );
  head.position.y = 1.42;
  head.castShadow = true;

  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: "#ffd166" })
  );
  badge.position.set(0, 0.4, 0.5);

  const label = makeLabelSprite(student.name, "#18212b");
  label.position.set(0, 2.45, 0);

  group.add(body, head, badge, label);
  group.position.set(Math.cos(angle) * 5.5, 1.2, Math.sin(angle) * 5.5);
  group.userData.student = student;
  classroomRing.add(group);
  studentMeshes.push(group);
}

function buildNpc(profile, index) {
  const x = (index - 1) * 2.2;
  const group = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.9, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: profile.tint })
  );
  robe.castShadow = true;

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#f8dfc5" })
  );
  face.position.y = 1.36;
  face.castShadow = true;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.06, 12, 36),
    new THREE.MeshStandardMaterial({ color: "#fff6c4", emissive: "#ffe49c" })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.82;

  const label = makeLabelSprite(profile.name, profile.tint);
  label.position.set(0, 2.55, 0);

  group.add(robe, face, halo, label);
  group.position.set(x, 1.5, -0.5);
  npcMeshes.push(group);
  scene.add(group);
}

function renderStudentDetails(student) {
  const metrics = [
    ["Puntualidad", student.punctuality],
    ["Actitud", student.classAttitude],
    ["Iniciativa", student.initiative],
    ["Lingüistica", student.linguisticSkill],
    ["Colaboracion", student.collaboration]
  ];

  studentDetails.innerHTML = `
    <div class="student-name">${student.name}</div>
    ${metrics
      .map(
        ([label, value]) =>
          `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`
      )
      .join("")}
  `;
}

function renderNpcReactions(student) {
  npcReactions.innerHTML = npcProfiles
    .map(
      (npc) => `
        <div class="reaction">
          <strong>${npc.name}</strong>
          <span>${getNpcReaction(npc, student)}</span>
        </div>
      `
    )
    .join("");
}

function highlightSelectedStudent() {
  studentMeshes.forEach((mesh) => {
    const selected = mesh.userData.student.id === currentStudent.id;
    mesh.scale.setScalar(selected ? 1.1 : 1);
    mesh.children[0].material.color.set(selected ? "#d96c54" : "#405d72");
  });
}

function selectStudent(student) {
  currentStudent = student;
  renderStudentDetails(student);
  renderNpcReactions(student);
  highlightSelectedStudent();
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(studentMeshes, true);
  const target = intersections.find((item) => item.object.parent.userData.student);
  if (target) {
    selectStudent(target.object.parent.userData.student);
  }
}

function onResize() {
  camera.aspect = sceneRoot.clientWidth / sceneRoot.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
}

students.forEach(buildStudentAvatar);
npcProfiles.forEach(buildNpc);
selectStudent(currentStudent);

renderer.domElement.addEventListener("pointerdown", onPointerDown);
window.addEventListener("resize", onResize);

function tick() {
  time += 0.01;
  classroomRing.rotation.y = Math.sin(time * 0.5) * 0.12;

  npcMeshes.forEach((npc, index) => {
    npc.position.y = 1.5 + Math.sin(time * 1.8 + index) * 0.08;
  });

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}

tick();
