const DEFAULT_METRICS = {
  studentRef: "local-demo",
  label: "Demo local",
  attendancePct: null,
  punctualityAvgLateMinutes: null,
  practicesPct: null,
  gradesPct: null,
  points: null,
  level: 0,
  source: "fallback"
};

const MOCK_METRICS_BY_REF = {
  "alpha-sam": {
    studentRef: "alpha-sam",
    label: "Alumno Alfa",
    attendancePct: 91,
    punctualityAvgLateMinutes: 1.1,
    practicesPct: 88,
    gradesPct: 86,
    points: 67,
    level: 4,
    source: "mock"
  },
  "bravo-son": {
    studentRef: "bravo-son",
    label: "Alumno Bravo",
    attendancePct: 76,
    punctualityAvgLateMinutes: 3.4,
    practicesPct: 73,
    gradesPct: 71,
    points: 31,
    level: 2,
    source: "mock"
  },
  "charlie-priv": {
    studentRef: "charlie-priv",
    label: "Alumno Charlie",
    attendancePct: 62,
    punctualityAvgLateMinutes: 7.5,
    practicesPct: 58,
    gradesPct: 61,
    points: 12,
    level: 1,
    source: "mock"
  }
};

function toFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeDeutschMetrics(payload, studentRef, label = "Alumno") {
  const levelInput = payload?.level?.resolvedInput ?? {};

  return {
    studentRef,
    label,
    attendancePct: toFiniteNumber(levelInput.attendancePct),
    punctualityAvgLateMinutes: toFiniteNumber(
      levelInput.punctualityAvgLateMinutes
    ),
    practicesPct: toFiniteNumber(levelInput.practicesPct),
    gradesPct: toFiniteNumber(levelInput.gradesPct),
    points: toFiniteNumber(levelInput.points),
    level: toFiniteNumber(payload?.level?.currentLevel) ?? 0,
    source: "deutsch"
  };
}

export function getStudentRefFromUrl() {
  return new URLSearchParams(window.location.search).get("studentRef") || "";
}

export function getMockMetrics(studentRef, label = "Alumno") {
  return MOCK_METRICS_BY_REF[studentRef] ?? {
    ...DEFAULT_METRICS,
    studentRef,
    label
  };
}

export async function loadStudentMetrics(studentRef, label = "Alumno") {
  const endpoint = import.meta.env.VITE_DEUTSCH_METRICS_URL;
  const resolvedStudentRef =
    studentRef || getStudentRefFromUrl() || import.meta.env.VITE_DEUTSCH_STUDENT_REF || "";

  if (!resolvedStudentRef) {
    return DEFAULT_METRICS;
  }

  if (!endpoint) {
    return getMockMetrics(resolvedStudentRef, label);
  }

  const url = new URL(endpoint);
  url.searchParams.set("studentRef", resolvedStudentRef);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`Metrics request failed with status ${res.status}`);
  }

  const payload = await res.json();
  return normalizeDeutschMetrics(payload, resolvedStudentRef, label);
}

export function deriveNpcProfile(metrics) {
  const attendanceNorm =
    metrics.attendancePct == null ? 0.5 : clamp01(metrics.attendancePct / 100);
  const practicesNorm =
    metrics.practicesPct == null ? 0.5 : clamp01(metrics.practicesPct / 100);
  const gradesNorm =
    metrics.gradesPct == null ? 0.5 : clamp01(metrics.gradesPct / 100);
  const punctualityNorm =
    metrics.punctualityAvgLateMinutes == null
      ? 0.5
      : clamp01(1 - metrics.punctualityAvgLateMinutes / 10);
  const levelNorm = clamp01((metrics.level || 0) / 5);

  const confidence =
    attendanceNorm * 0.3 +
    practicesNorm * 0.2 +
    gradesNorm * 0.2 +
    punctualityNorm * 0.2 +
    levelNorm * 0.1;

  if (confidence >= 0.78) {
    return {
      state: "avance",
      bodyColor: "#3fbf7f",
      headColor: "#dff7ea",
      detectionRadius: 2.9,
      bobSpeed: 0.0032,
      bobAmount: 0.09,
      heightScale: 1.1,
      label: `NPC L${metrics.level || 0}`
    };
  }

  if (confidence >= 0.52) {
    return {
      state: "equilibrio",
      bodyColor: "#66a3ff",
      headColor: "#d7e7ff",
      detectionRadius: 2.4,
      bobSpeed: 0.0024,
      bobAmount: 0.06,
      heightScale: 1,
      label: `NPC L${metrics.level || 0}`
    };
  }

  return {
    state: "apoyo",
    bodyColor: "#ff8a3d",
    headColor: "#fff1c9",
    detectionRadius: 3.2,
    bobSpeed: 0.0018,
    bobAmount: 0.04,
    heightScale: 0.92,
    label: `NPC apoyo`
  };
}
