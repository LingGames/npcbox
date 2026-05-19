const DEFAULT_METRICS = {
  studentRef: "player-session",
  studentKey: null,
  targetStudentId: null,
  targetStudentCode: null,
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
  recommendedStrategy: "Start the scene and connect a signed student session.",
  level: 0,
  nextLevel: null,
  missingForNext: [],
  warnings: [],
  source: "fallback"
};

const MOCK_METRICS_BY_REF = {
  "alpha-sam": {
    studentRef: "alpha-sam",
    studentKey: "mock-alpha",
    targetStudentId: null,
    targetStudentCode: "a1",
    label: "Alumno Alfa",
    attendancePct: 91,
    punctualityAvgLateMinutes: 1.1,
    practicesPct: 88,
    practicesCount: 9,
    gradesPct: 86,
    mxp: 67,
    pointsClass: 67,
    pointsTotal: 74,
    supportNeed: "low",
    npcTone: "challenging",
    challengeLevel: "high",
    engagement: "high",
    confidence: "high",
    reliability: "high",
    pace: "fast",
    recommendedStrategy: "Use richer dialogue and stretch vocabulary.",
    level: 4,
    nextLevel: 5,
    missingForNext: ["Puntos"],
    warnings: [],
    source: "mock"
  },
  "bravo-son": {
    studentRef: "bravo-son",
    studentKey: "mock-bravo",
    targetStudentId: null,
    targetStudentCode: "b2",
    label: "Alumno Bravo",
    attendancePct: 76,
    punctualityAvgLateMinutes: 3.4,
    practicesPct: 73,
    practicesCount: 7,
    gradesPct: 71,
    mxp: 31,
    pointsClass: 31,
    pointsTotal: 36,
    supportNeed: "medium",
    npcTone: "balanced",
    challengeLevel: "medium",
    engagement: "medium",
    confidence: "medium",
    reliability: "medium",
    pace: "steady",
    recommendedStrategy: "Use balanced dialogue with gentle correction.",
    level: 2,
    nextLevel: 3,
    missingForNext: ["Practicas", "Calificacion"],
    warnings: [],
    source: "mock"
  },
  "charlie-priv": {
    studentRef: "charlie-priv",
    studentKey: "mock-charlie",
    targetStudentId: null,
    targetStudentCode: "c3",
    label: "Alumno Charlie",
    attendancePct: 62,
    punctualityAvgLateMinutes: 7.5,
    practicesPct: 58,
    practicesCount: 5,
    gradesPct: 61,
    mxp: 12,
    pointsClass: 12,
    pointsTotal: 18,
    supportNeed: "high",
    npcTone: "gentle",
    challengeLevel: "low",
    engagement: "low",
    confidence: "low",
    reliability: "low",
    pace: "slow",
    recommendedStrategy: "Use short prompts, reassurance, and one-step goals.",
    level: 1,
    nextLevel: 2,
    missingForNext: ["Asistencia", "Puntualidad", "Practicas"],
    warnings: [],
    source: "mock"
  }
};

const ACCESS_TOKEN_KEY = "linggames.accessToken";
const STUDENT_KEY_KEY = "linggames.studentKey";
const TARGET_STUDENT_ID_KEY = "linggames.targetStudentId";
const TARGET_STUDENT_CODE_KEY = "linggames.targetStudentCode";

export class LingGamesHandoffRequiredError extends Error {
  constructor(handoffUrl) {
    super("LingGames handoff required");
    this.name = "LingGamesHandoffRequiredError";
    this.code = "LINGGAMES_HANDOFF_REQUIRED";
    this.handoffUrl = handoffUrl;
  }
}

function toAllowedBand(value) {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "unknown";
}

function normalizeTargetStudentId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTargetStudentCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function clearStoredSession() {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(STUDENT_KEY_KEY);
  window.sessionStorage.removeItem(TARGET_STUDENT_ID_KEY);
  window.sessionStorage.removeItem(TARGET_STUDENT_CODE_KEY);
}

function storeSession(accessToken, studentKey, targetStudentId, targetStudentCode) {
  if (accessToken) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (studentKey) {
    window.sessionStorage.setItem(STUDENT_KEY_KEY, studentKey);
  }

  if (targetStudentId) {
    window.sessionStorage.setItem(TARGET_STUDENT_ID_KEY, String(targetStudentId));
  } else {
    window.sessionStorage.removeItem(TARGET_STUDENT_ID_KEY);
  }

  if (targetStudentCode) {
    window.sessionStorage.setItem(TARGET_STUDENT_CODE_KEY, String(targetStudentCode));
  } else {
    window.sessionStorage.removeItem(TARGET_STUDENT_CODE_KEY);
  }
}

function readStoredSession() {
  return {
    accessToken: window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || "",
    studentKey: window.sessionStorage.getItem(STUDENT_KEY_KEY) || "",
    targetStudentId: normalizeTargetStudentId(
      window.sessionStorage.getItem(TARGET_STUDENT_ID_KEY)
    ),
    targetStudentCode: normalizeTargetStudentCode(
      window.sessionStorage.getItem(TARGET_STUDENT_CODE_KEY)
    )
  };
}

function consumeHandoffParamsFromUrl() {
  const url = new URL(window.location.href);
  const accessToken = url.searchParams.get("lg_access_token") || "";
  const studentKey = url.searchParams.get("lg_student_key") || "";
  const targetStudentId = normalizeTargetStudentId(
    url.searchParams.get("lg_target_student_id")
  );
  const targetStudentCode = normalizeTargetStudentCode(
    url.searchParams.get("lg_target_student_code")
  );
  const error = url.searchParams.get("lg_error") || "";

  if (accessToken || studentKey || error || targetStudentId || targetStudentCode) {
    if (accessToken || studentKey) {
      storeSession(accessToken, studentKey, targetStudentId, targetStudentCode);
    }

    url.searchParams.delete("lg_access_token");
    url.searchParams.delete("lg_student_key");
    url.searchParams.delete("lg_target_student_id");
    url.searchParams.delete("lg_target_student_code");
    url.searchParams.delete("lg_error");
    window.history.replaceState({}, "", url);
  }

  return error;
}

function buildReturnToUrl() {
  return window.location.href;
}

function buildHandoffUrl(baseUrl, targetStudentCode) {
  const handoffUrl = new URL(`${baseUrl}/api/linggames/handoff`);
  handoffUrl.searchParams.set("returnTo", buildReturnToUrl());

  if (targetStudentCode) {
    handoffUrl.searchParams.set("studentCode", String(targetStudentCode));
  }

  return handoffUrl.toString();
}

export function getStudentRefFromUrl() {
  return new URLSearchParams(window.location.search).get("studentRef") || "";
}

export function getTargetStudentCodeFromUrl() {
  return normalizeTargetStudentCode(
    new URLSearchParams(window.location.search).get("targetStudentCode")
  );
}

export function getDeutschBaseUrl() {
  return (import.meta.env.VITE_DEUTSCH_BASE_URL || "").trim().replace(/\/$/, "");
}

export function getMockMetrics(studentRef, label = "Alumno") {
  return MOCK_METRICS_BY_REF[studentRef] ?? {
    ...DEFAULT_METRICS,
    studentRef,
    label,
    source: "mock"
  };
}

async function loadPlayerAccess(baseUrl, targetStudentCode) {
  const url = new URL(`${baseUrl}/api/linggames/player-access`);
  if (targetStudentCode) {
    url.searchParams.set("studentCode", String(targetStudentCode));
  }

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  });

  if (res.status === 401) {
    throw new LingGamesHandoffRequiredError(
      buildHandoffUrl(baseUrl, targetStudentCode)
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.error ? `: ${payload.error}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`player-access failed with status ${res.status}${detail}`);
  }

  return res.json();
}

async function loadNpcMetrics(baseUrl, accessToken) {
  const res = await fetch(`${baseUrl}/api/internal/linggames/npc-metrics`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (res.status === 401) {
    throw new LingGamesHandoffRequiredError(buildHandoffUrl(baseUrl, null));
  }

  if (!res.ok) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.error ? `: ${payload.error}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`npc-metrics failed with status ${res.status}${detail}`);
  }

  return res.json();
}

export async function loadStudentCatalog(baseUrl, accessToken) {
  const res = await fetch(`${baseUrl}/api/internal/linggames/current-students`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (res.status === 401) {
    throw new LingGamesHandoffRequiredError(buildHandoffUrl(baseUrl, null));
  }

  if (res.status === 403) {
    return [];
  }

  if (!res.ok) {
    throw new Error(`current-students failed with status ${res.status}`);
  }

  const payload = await res.json();
  return Array.isArray(payload?.students) ? payload.students : [];
}

export function normalizeNpcMetrics(payload, fallbackLabel = "Sesion actual") {
  return {
    studentRef: "player-session",
    studentKey: payload?.studentKey ?? null,
    targetStudentId: null,
    targetStudentCode: null,
    label: fallbackLabel,
    attendancePct: Number.isFinite(Number(payload?.academics?.attendancePct))
      ? Number(payload.academics.attendancePct)
      : null,
    punctualityAvgLateMinutes: Number.isFinite(
      Number(payload?.academics?.punctualityAvgLateMinutes)
    )
      ? Number(payload.academics.punctualityAvgLateMinutes)
      : null,
    practicesPct: Number.isFinite(Number(payload?.academics?.practicesPct))
      ? Number(payload.academics.practicesPct)
      : null,
    practicesCount: Number.isFinite(Number(payload?.academics?.practicesCount))
      ? Number(payload.academics.practicesCount)
      : 0,
    gradesPct: Number.isFinite(Number(payload?.academics?.gradesPct))
      ? Number(payload.academics.gradesPct)
      : null,
    mxp: Number.isFinite(Number(payload?.academics?.mxp))
      ? Number(payload.academics.mxp)
      : null,
    pointsClass: Number.isFinite(Number(payload?.academics?.pointsClass))
      ? Number(payload.academics.pointsClass)
      : null,
    pointsTotal: Number.isFinite(Number(payload?.academics?.pointsTotal))
      ? Number(payload.academics.pointsTotal)
      : null,
    supportNeed: payload?.profile?.supportNeed ?? "medium",
    npcTone: payload?.profile?.npcTone ?? "balanced",
    challengeLevel: payload?.profile?.challengeLevel ?? "medium",
    engagement: toAllowedBand(payload?.profile?.engagement),
    confidence: toAllowedBand(payload?.profile?.confidence),
    reliability: toAllowedBand(payload?.profile?.reliability),
    pace: payload?.profile?.pace ?? "steady",
    recommendedStrategy:
      payload?.profile?.recommendedStrategy ?? DEFAULT_METRICS.recommendedStrategy,
    level: Number.isFinite(Number(payload?.signals?.level))
      ? Number(payload.signals.level)
      : 0,
    nextLevel: Number.isFinite(Number(payload?.signals?.nextLevel))
      ? Number(payload.signals.nextLevel)
      : null,
    missingForNext: Array.isArray(payload?.signals?.missingForNext)
      ? payload.signals.missingForNext
      : [],
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    source: "deutsch"
  };
}

export async function loadStudentMetrics(student, label = "Alumno", options = {}) {
  const selected =
    typeof student === "string"
      ? { studentRef: student, label, mode: "mock" }
      : student;

  const resolvedStudentRef =
    selected?.studentRef || getStudentRefFromUrl() || DEFAULT_METRICS.studentRef;
  const mode = selected?.mode || (resolvedStudentRef === "player-session" ? "session" : "mock");
  const baseUrl = getDeutschBaseUrl();
  const targetStudentCode = normalizeTargetStudentCode(options.targetStudentCode);

  if (mode !== "session") {
    return getMockMetrics(resolvedStudentRef, selected?.label || label);
  }

  if (!baseUrl) {
    throw new Error("Missing VITE_DEUTSCH_BASE_URL for session-based metrics.");
  }

  const handoffError = consumeHandoffParamsFromUrl();
  if (handoffError) {
    clearStoredSession();
    throw new Error(`LingGames handoff failed: ${handoffError}`);
  }

  const stored = readStoredSession();
  const storedTargetCode = stored.targetStudentCode;
  if (stored.accessToken && storedTargetCode !== targetStudentCode) {
    clearStoredSession();
  }

  const refreshedStored = readStoredSession();

  if (refreshedStored.accessToken) {
    try {
      const payload = await loadNpcMetrics(baseUrl, refreshedStored.accessToken);
      const metrics = normalizeNpcMetrics(payload, selected?.label || "Sesion actual");
      return {
        ...metrics,
        targetStudentId: refreshedStored.targetStudentId,
        targetStudentCode,
      };
    } catch (error) {
      if (!(error instanceof LingGamesHandoffRequiredError)) {
        throw error;
      }

      clearStoredSession();
      throw new LingGamesHandoffRequiredError(
        buildHandoffUrl(baseUrl, targetStudentCode)
      );
    }
  }

  const access = await loadPlayerAccess(baseUrl, targetStudentCode);
  storeSession(
    access?.accessToken,
    access?.studentKey,
    access?.targetStudentId ?? null,
    targetStudentCode
  );
  const payload = await loadNpcMetrics(baseUrl, access.accessToken);
  const metrics = normalizeNpcMetrics(payload, selected?.label || "Sesion actual");
  return {
    ...metrics,
    targetStudentId: access?.targetStudentId ?? null,
    targetStudentCode,
  };
}

export function deriveNpcProfile(metrics) {
  const isSupport = metrics.supportNeed === "high";
  const isChallenge = metrics.challengeLevel === "high";
  const isLowEnergy = metrics.engagement === "low" || metrics.pace === "slow";

  if (isChallenge) {
    return {
      state: "reto",
      bodyColor: "#2f9e44",
      headColor: "#dff7ea",
      detectionRadius: 2.5,
      bobSpeed: 0.0032,
      bobAmount: 0.09,
      heightScale: 1.1,
      label: `NPC reto L${metrics.level || 0}`
    };
  }

  if (isSupport) {
    return {
      state: "apoyo",
      bodyColor: "#ff8a3d",
      headColor: "#fff1c9",
      detectionRadius: 3.3,
      bobSpeed: 0.0018,
      bobAmount: 0.04,
      heightScale: 0.94,
      label: "NPC apoyo"
    };
  }

  return {
    state: isLowEnergy ? "acompanamiento" : "equilibrio",
    bodyColor: "#66a3ff",
    headColor: "#d7e7ff",
    detectionRadius: isLowEnergy ? 2.9 : 2.4,
    bobSpeed: isLowEnergy ? 0.0021 : 0.0025,
    bobAmount: isLowEnergy ? 0.05 : 0.06,
    heightScale: 1,
    label: `NPC L${metrics.level || 0}`
  };
}
