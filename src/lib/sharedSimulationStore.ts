import { SimulationSnapshot } from '../models';

const INDEX_KEY = 'prison-shift-simulation:index';
const CHANNEL_NAME = 'prison-shift-simulation-sync';
const TABLE_NAME = 'simulation_snapshots';

type Listener = (snapshot: SimulationSnapshot) => void;

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

function snapshotKey(id: string) {
  return `prison-shift-simulation:${id}`;
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
  index[snapshot.simulation.joinCode.toUpperCase()] = snapshot.simulation.id;
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
  const id = readIndex()[joinCode.toUpperCase()];
  return id ? getLocalById(id) : null;
}

async function saveRemote(snapshot: SimulationSnapshot) {
  if (!hasSupabaseConfig) return;

  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({
      id: snapshot.simulation.id,
      join_code: snapshot.simulation.joinCode,
      payload: snapshot,
      updated_at: snapshot.simulation.updatedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase save failed: ${response.status}`);
  }
}

async function getRemoteByJoinCode(joinCode: string): Promise<SimulationSnapshot | null> {
  if (!hasSupabaseConfig) return null;

  const query = `join_code=eq.${encodeURIComponent(joinCode.toUpperCase())}&select=payload&limit=1`;
  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}?${query}`, {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(`Supabase load failed: ${response.status}`);
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
    throw new Error(`Supabase load failed: ${response.status}`);
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
    await saveRemote(snapshot);
    return 'supabase';
  }

  return 'local';
}

export async function loadSnapshotByJoinCode(joinCode: string): Promise<SimulationSnapshot | null> {
  const normalized = joinCode.trim().toUpperCase();
  const remote = await getRemoteByJoinCode(normalized);
  if (remote) {
    saveLocal(remote);
    return remote;
  }
  return getLocalByJoinCode(normalized);
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
