import { AppRole, SimulationSnapshot } from '../models';

const INDEX_KEY = 'prison-shift-simulation:index';
const CHANNEL_NAME = 'prison-shift-simulation-sync';
const TABLE_NAME = 'simulation_snapshots';

type Listener = (snapshot: SimulationSnapshot) => void;
export type SnapshotLoadResult = {
  snapshot: SimulationSnapshot | null;
  mode: 'supabase' | 'local';
  message?: string;
  matchedRole?: AppRole;
};

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL)?.replace(/\/$/, '');
const supabaseKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
const unsafeKeyReason = supabaseKey && looksLikeServiceRoleKey(supabaseKey)
  ? 'Brauserirakenduses ei kasutata service_role võtit. Kasuta Supabase anon avalikku võtit.'
  : undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey && !unsafeKeyReason);
export const syncModeLabel = hasSupabaseConfig ? 'Supabase sünkroonimine sees' : 'Kohalik demorežiim';
export const supabaseConfigWarning = unsafeKeyReason;

function cleanEnvValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function looksLikeServiceRoleKey(key: string): boolean {
  try {
    const [, payload] = key.split('.');
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(paddedPayload)) as { role?: string };
    return decoded.role === 'service_role';
  } catch {
    return false;
  }
}

function snapshotKey(id: string) {
  return `prison-shift-simulation:${id}`;
}

export function normalizeJoinCode(joinCode: string): string {
  return joinCode.trim().toUpperCase();
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    apikey: supabaseKey ?? '',
    Authorization: `Bearer ${supabaseKey ?? ''}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function readIndex(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, string>) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function saveLocal(snapshot: SimulationSnapshot) {
  localStorage.setItem(snapshotKey(snapshot.simulation.id), JSON.stringify(snapshot));
  const index = readIndex();
  for (const code of accessCodes(snapshot)) {
    index[normalizeJoinCode(code)] = snapshot.simulation.id;
  }
  writeIndex(index);
}

function getLocalById(simulationId: string): SimulationSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(simulationId));
    return raw ? (JSON.parse(raw) as SimulationSnapshot) : null;
  } catch {
    return null;
  }
}

function getLocalByJoinCode(joinCode: string): SimulationSnapshot | null {
  const id = readIndex()[normalizeJoinCode(joinCode)];
  return id ? getLocalById(id) : null;
}

function accessCodes(snapshot: SimulationSnapshot): string[] {
  return [
    snapshot.simulation.joinCode,
    snapshot.simulation.teacherCode,
    snapshot.simulation.studentCode,
  ].filter((code): code is string => Boolean(code));
}

function matchedRoleForCode(snapshot: SimulationSnapshot, joinCode: string): AppRole | undefined {
  const normalized = normalizeJoinCode(joinCode);
  if (snapshot.simulation.teacherCode && normalizeJoinCode(snapshot.simulation.teacherCode) === normalized) return 'facilitator';
  if (snapshot.simulation.studentCode && normalizeJoinCode(snapshot.simulation.studentCode) === normalized) return 'commander';
  if (normalizeJoinCode(snapshot.simulation.joinCode) === normalized) return 'commander';
  return undefined;
}

async function saveRemote(snapshot: SimulationSnapshot) {
  if (!hasSupabaseConfig) return;

  const body = {
    id: snapshot.simulation.id,
    join_code: snapshot.simulation.joinCode,
    teacher_code: snapshot.simulation.teacherCode,
    student_code: snapshot.simulation.studentCode ?? snapshot.simulation.joinCode,
    payload: snapshot,
    updated_at: snapshot.simulation.updatedAt,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?on_conflict=id`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await describeSupabaseError(response, 'save');
    if (error.includes('teacher_code') || error.includes('student_code')) {
      const legacyResponse = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?on_conflict=id`, {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({
          id: snapshot.simulation.id,
          join_code: snapshot.simulation.studentCode ?? snapshot.simulation.joinCode,
          payload: snapshot,
          updated_at: snapshot.simulation.updatedAt,
        }),
      });
      if (legacyResponse.ok) return;
      throw new Error(await describeSupabaseError(legacyResponse, 'save'));
    }
    throw new Error(error);
  }
}

async function getRemoteByJoinCode(joinCode: string): Promise<SimulationSnapshot | null> {
  if (!hasSupabaseConfig) return null;

  const normalized = encodeURIComponent(normalizeJoinCode(joinCode));
  const query = `select=payload,join_code,teacher_code,student_code&or=(teacher_code.eq.${normalized},student_code.eq.${normalized},join_code.eq.${normalized})&limit=1`;
  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?${query}`, {
    headers: headers(),
  });

  if (!response.ok) {
    const error = await describeSupabaseError(response, 'load by access code');
    if (error.includes('teacher_code') || error.includes('student_code')) {
      const legacyQuery = `select=payload&join_code=eq.${normalized}&limit=1`;
      const legacyResponse = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?${legacyQuery}`, {
        headers: headers(),
      });
      if (!legacyResponse.ok) {
        throw new Error(await describeSupabaseError(legacyResponse, 'load by join code'));
      }
      const legacyRows = (await legacyResponse.json()) as Array<{ payload: SimulationSnapshot }>;
      return legacyRows[0]?.payload ?? null;
    }
    throw new Error(error);
  }

  const rows = (await response.json()) as Array<{ payload: SimulationSnapshot }>;
  return rows[0]?.payload ?? null;
}

async function getRemoteById(simulationId: string): Promise<SimulationSnapshot | null> {
  if (!hasSupabaseConfig) return null;

  const query = `id=eq.${encodeURIComponent(simulationId)}&select=payload&limit=1`;
  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?${query}`, {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(await describeSupabaseError(response, 'load by simulation id'));
  }

  const rows = (await response.json()) as Array<{ payload: SimulationSnapshot }>;
  return rows[0]?.payload ?? null;
}

export async function saveSnapshot(snapshot: SimulationSnapshot): Promise<'supabase' | 'local'> {
  saveLocal(snapshot);

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(snapshot);
    channel.close();
  }

  if (hasSupabaseConfig) {
    try {
      await saveRemote(snapshot);
      return 'supabase';
    } catch {
      return 'local';
    }
  }

  return 'local';
}

export async function getSimulationByJoinCode(joinCode: string): Promise<SnapshotLoadResult> {
  const normalized = normalizeJoinCode(joinCode);
  let message: string | undefined;

  if (!normalized) {
    return { snapshot: null, mode: hasSupabaseConfig ? 'supabase' : 'local' };
  }

  if (hasSupabaseConfig) {
    try {
      const remote = await getRemoteByJoinCode(normalized);
      if (remote) {
        saveLocal(remote);
        return { snapshot: remote, mode: 'supabase', matchedRole: matchedRoleForCode(remote, normalized) };
      }
    } catch {
      message = 'Supabase ühendus ebaõnnestus, kasutatakse kohalikku režiimi';
    }
  }

  return {
    snapshot: getLocalByJoinCode(normalized),
    mode: 'local',
    message,
    matchedRole: getLocalByJoinCode(normalized) ? matchedRoleForCode(getLocalByJoinCode(normalized)!, normalized) : undefined,
  };
}

export async function loadSnapshotByJoinCode(joinCode: string): Promise<SimulationSnapshot | null> {
  return (await getSimulationByJoinCode(joinCode)).snapshot;
}

export function loadLocalSnapshotById(simulationId: string): SimulationSnapshot | null {
  return getLocalById(simulationId);
}

export function subscribeToSimulation(
  simulationId: string,
  listener: Listener
): () => void {
  let stopped = false;
  let lastUpdated = getLocalById(simulationId)?.simulation.updatedAt ?? '';
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  const receive = (snapshot: SimulationSnapshot | null) => {
    if (!snapshot || snapshot.simulation.id !== simulationId) return;
    if (snapshot.simulation.updatedAt <= lastUpdated) return;
    lastUpdated = snapshot.simulation.updatedAt;
    saveLocal(snapshot);
    listener(snapshot);
  };

  if (channel) {
    channel.onmessage = (event) => receive(event.data as SimulationSnapshot);
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== snapshotKey(simulationId) || !event.newValue) return;
    try {
      receive(JSON.parse(event.newValue) as SimulationSnapshot);
    } catch {
      // Ignore malformed local storage writes from other pages.
    }
  };
  window.addEventListener('storage', onStorage);

  const interval = window.setInterval(async () => {
    if (stopped) return;
    try {
      receive(hasSupabaseConfig ? await getRemoteById(simulationId) : getLocalById(simulationId));
    } catch {
      receive(getLocalById(simulationId));
    }
  }, hasSupabaseConfig ? 1500 : 900);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

async function describeSupabaseError(response: Response, operation: string): Promise<string> {
  let detail = '';
  try {
    const body = await response.json() as { message?: string; details?: string; hint?: string };
    detail = body.message ?? body.details ?? body.hint ?? '';
  } catch {
    detail = await response.text().catch(() => '');
  }

  const suffix = detail ? `: ${detail}` : '';
  return `Supabase toiming ebaõnnestus (${operation}, ${response.status})${suffix}`;
}
