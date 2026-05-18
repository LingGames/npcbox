const scoreLabel = (value) => {
  if (value >= 85) return "alta";
  if (value >= 65) return "media";
  return "baja";
};

const buildFocus = (student) => {
  const weakAreas = [
    ["puntualidad", student.punctuality],
    ["actitud", student.classAttitude],
    ["iniciativa", student.initiative],
    ["habilidad linguistica", student.linguisticSkill],
    ["colaboracion", student.collaboration]
  ]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2);

  return weakAreas.map(([name]) => name).join(" y ");
};

export function getNpcReaction(npc, student) {
  const punctuality = scoreLabel(student.punctuality);
  const attitude = scoreLabel(student.classAttitude);
  const initiative = scoreLabel(student.initiative);
  const language = scoreLabel(student.linguisticSkill);
  const focus = buildFocus(student);

  if (npc.id === "mentor") {
    if (initiative === "alta" && language !== "baja") {
      return `Te dare retos extra. Tu iniciativa es ${initiative} y tu base linguistica aguanta mayor complejidad.`;
    }

    return `Hoy reforzaremos ${focus}. Mantendre un tono ${npc.style} para ayudarte a consolidar habitos.`;
  }

  if (npc.id === "coach") {
    if (punctuality === "baja" || attitude === "baja") {
      return "Necesito una accion concreta antes del siguiente bloque: llegar a tiempo, entrar enfocado y completar una tarea corta.";
    }

    return `Buen ritmo. Voy a exigirte mas participacion porque tu actitud es ${attitude} y puedes sostener mas presion.`;
  }

  return `Registro actual: puntualidad ${punctuality}, actitud ${attitude}, iniciativa ${initiative}, lenguaje ${language}. Recomiendo adaptar dialogos y misiones alrededor de ${focus}.`;
}
