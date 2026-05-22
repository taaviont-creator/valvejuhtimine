import React, { useEffect, useMemo, useState } from 'react';
import { ClassroomExercise, ClassroomGroup, SimulationSnapshot, SimulationStatus } from '../../models';
import {
  archiveSimulationSnapshot,
  deleteSimulationSnapshot,
  listSimulationSnapshots,
} from '../../lib/sharedSimulationStore';

interface Props {
  currentSimulationId?: string;
  onOpenSimulation: (simulationId: string) => Promise<boolean> | boolean;
  initialCollapsed?: boolean;
  onCreateNew?: () => void;
}

type ManagedSimulationEntry =
  | {
      kind: 'single';
      id: string;
      snapshot: SimulationSnapshot;
      status: SimulationStatus;
      updatedAt: string;
      createdAt: string;
    }
  | {
      kind: 'classroom';
      id: string;
      title: string;
      exercise: ClassroomExercise | null;
      snapshots: SimulationSnapshot[];
      groups: ManagedGroup[];
      status: SimulationStatus;
      updatedAt: string;
      createdAt: string;
      teacherCode: string;
      groupCount: number;
      oldSnapshot: boolean;
    };

interface ManagedGroup extends ClassroomGroup {
  snapshot?: SimulationSnapshot;
}

const statusLabels: Record<SimulationStatus, string> = {
  setup: 'ettevalmistus',
  active: 'käimas',
  completed: 'lõpetatud',
  archived: 'arhiveeritud',
};

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('et-EE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function isGroupSimulation(snapshot: SimulationSnapshot) {
  return Boolean(snapshot.simulation.classroomExerciseId || snapshot.simulation.classroomGroupName);
}

function classroomEntryKey(snapshot: SimulationSnapshot) {
  if (snapshot.simulation.classroomExerciseId) return snapshot.simulation.classroomExerciseId;
  if (snapshot.classroomExercise?.id) return snapshot.classroomExercise.id;
  if (snapshot.simulation.classroomGroupName && snapshot.classroomExercise?.teacherCode) {
    return `legacy-${snapshot.classroomExercise.teacherCode}`;
  }
  return null;
}

function stripGroupSuffix(name: string, groupName?: string) {
  if (!groupName) return name || 'Grupisimulatsioon';
  const suffix = ` - ${groupName}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name || 'Grupisimulatsioon';
}

function latestDate(values: string[]) {
  return values.reduce((latest, value) => (!latest || value > latest ? value : latest), '');
}

function earliestDate(values: string[]) {
  return values.reduce((earliest, value) => (!earliest || value < earliest ? value : earliest), '');
}

function classroomStatus(snapshots: SimulationSnapshot[]): SimulationStatus {
  const statuses = snapshots.map((snapshot) => snapshot.simulation.status);
  if (statuses.length > 0 && statuses.every((status) => status === 'archived')) return 'archived';
  if (statuses.includes('active')) return 'active';
  if (statuses.includes('setup')) return 'setup';
  if (statuses.includes('completed')) return 'completed';
  return snapshots[0]?.simulation.status ?? 'setup';
}

function buildManagedEntries(snapshots: SimulationSnapshot[]): ManagedSimulationEntry[] {
  const singles: ManagedSimulationEntry[] = [];
  const classroomGroups = new Map<string, SimulationSnapshot[]>();

  snapshots.forEach((snapshot) => {
    const key = classroomEntryKey(snapshot);
    if (!key) {
      singles.push({
        kind: 'single',
        id: snapshot.simulation.id,
        snapshot,
        status: snapshot.simulation.status,
        updatedAt: snapshot.simulation.updatedAt,
        createdAt: snapshot.simulation.createdAt,
      });
      return;
    }

    classroomGroups.set(key, [...(classroomGroups.get(key) ?? []), snapshot]);
  });

  const classrooms = Array.from(classroomGroups.entries()).map(([id, groupSnapshots]) => {
    const sortedSnapshots = [...groupSnapshots].sort((left, right) => {
      const leftIndex = left.simulation.classroomGroupIndex ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = right.simulation.classroomGroupIndex ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.simulation.name.localeCompare(right.simulation.name, 'et');
    });
    const exercise = sortedSnapshots.find((snapshot) => snapshot.classroomExercise)?.classroomExercise ?? null;
    const firstSnapshot = sortedSnapshots[0];
    const title = exercise?.title ?? stripGroupSuffix(firstSnapshot.simulation.name, firstSnapshot.simulation.classroomGroupName);
    const snapshotsById = new Map(sortedSnapshots.map((snapshot) => [snapshot.simulation.id, snapshot]));
    const exerciseGroups =
      exercise?.groups.map((group) => ({
        ...group,
        snapshot: snapshotsById.get(group.simulationId),
      })) ?? [];
    const knownGroupIds = new Set(exerciseGroups.map((group) => group.simulationId));
    const extraGroups = sortedSnapshots
      .filter((snapshot) => !knownGroupIds.has(snapshot.simulation.id))
      .map((snapshot, index) => ({
        simulationId: snapshot.simulation.id,
        groupName: snapshot.simulation.classroomGroupName ?? `Grupp ${index + 1}`,
        groupIndex: snapshot.simulation.classroomGroupIndex ?? index + 1,
        studentCode: snapshot.simulation.studentCode ?? snapshot.simulation.joinCode,
        teacherCode: snapshot.simulation.teacherCode ?? snapshot.simulation.joinCode,
        snapshot,
      }));
    const groups = [...exerciseGroups, ...extraGroups].sort((left, right) => left.groupIndex - right.groupIndex);

    return {
      kind: 'classroom' as const,
      id,
      title,
      exercise,
      snapshots: sortedSnapshots,
      groups,
      status: classroomStatus(sortedSnapshots),
      updatedAt: latestDate(sortedSnapshots.map((snapshot) => snapshot.simulation.updatedAt)),
      createdAt: exercise?.createdAt ?? earliestDate(sortedSnapshots.map((snapshot) => snapshot.simulation.createdAt)),
      teacherCode: exercise?.teacherCode ?? firstSnapshot.classroomExercise?.teacherCode ?? firstSnapshot.simulation.teacherCode ?? firstSnapshot.simulation.joinCode,
      groupCount: exercise?.groupCount ?? groups.length,
      oldSnapshot: sortedSnapshots.some((snapshot) => !snapshot.simulation.dataVersion),
    };
  });

  return [...singles, ...classrooms].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function entryIsCurrent(entry: ManagedSimulationEntry, currentSimulationId?: string) {
  if (!currentSimulationId) return false;
  return entry.kind === 'single'
    ? entry.snapshot.simulation.id === currentSimulationId
    : entry.snapshots.some((snapshot) => snapshot.simulation.id === currentSimulationId);
}

function firstOpenableSnapshot(entry: ManagedSimulationEntry, currentSimulationId?: string) {
  if (entry.kind === 'single') return entry.snapshot;
  return (
    (currentSimulationId ? entry.snapshots.find((snapshot) => snapshot.simulation.id === currentSimulationId) : undefined) ??
    entry.snapshots.find((snapshot) => snapshot.simulation.status !== 'archived') ??
    entry.snapshots[0]
  );
}

async function copyCode(label: string, code: string) {
  try {
    await navigator.clipboard?.writeText(code);
  } catch {
    window.prompt(label, code);
  }
}

export const SimulationManagementPanel: React.FC<Props> = ({
  currentSimulationId,
  onOpenSimulation,
  initialCollapsed = true,
  onCreateNew,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedClassrooms, setExpandedClassrooms] = useState<Set<string>>(new Set());

  const loadList = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await listSimulationSnapshots();
      setSnapshots(result.snapshots);
      setMessage(result.message ?? (result.mode === 'supabase' ? 'Nimekiri laaditi Supabase andmetest.' : 'Nimekiri laaditi kohalikust demorežiimist.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Simulatsioonide nimekirja laadimine ebaõnnestus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!collapsed && snapshots.length === 0 && !loading) {
      void loadList();
    }
  }, [collapsed]);

  const managedEntries = useMemo(() => buildManagedEntries(snapshots), [snapshots]);
  const activeEntries = useMemo(
    () => managedEntries.filter((entry) => entry.status !== 'archived'),
    [managedEntries]
  );
  const archivedEntries = useMemo(
    () => managedEntries.filter((entry) => entry.status === 'archived'),
    [managedEntries]
  );

  const archiveEntry = async (entry: ManagedSimulationEntry) => {
    const title = entry.kind === 'classroom' ? entry.title : entry.snapshot.simulation.name;
    const confirmText =
      entry.kind === 'classroom'
        ? `Arhiveeri grupisimulatsioon "${title}" ja kõik selle grupid?`
        : `Arhiveeri simulatsioon "${title}"?`;
    if (!window.confirm(confirmText)) return;
    setBusyId(entry.id);
    setMessage(null);
    try {
      const targets = entry.kind === 'classroom' ? entry.snapshots : [entry.snapshot];
      await Promise.all(targets.map((snapshot) => archiveSimulationSnapshot(snapshot.simulation.id)));
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Arhiveerimine ebaõnnestus.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteEntry = async (entry: ManagedSimulationEntry) => {
    const confirmText =
      entry.kind === 'classroom'
        ? 'Kas oled kindel? Seda grupiharjutust ja kõigi gruppide test-simulatsioone ei saa pärast kustutamist taastada.'
        : 'Kas oled kindel? Seda test-simulatsiooni ei saa pärast kustutamist taastada.';
    if (!window.confirm(confirmText)) return;
    setBusyId(entry.id);
    setMessage(null);
    try {
      const targets = entry.kind === 'classroom' ? entry.snapshots : [entry.snapshot];
      await Promise.all(targets.map((snapshot) => deleteSimulationSnapshot(snapshot.simulation.id)));
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Test-simulatsiooni kustutamine ebaõnnestus.');
    } finally {
      setBusyId(null);
    }
  };

  const openEntry = async (entry: ManagedSimulationEntry) => {
    const snapshot = firstOpenableSnapshot(entry, currentSimulationId);
    if (!snapshot) {
      setMessage('Simulatsiooni avamine ebaõnnestus.');
      return;
    }
    await openSnapshot(snapshot);
  };

  const openSnapshot = async (snapshot: SimulationSnapshot) => {
    setBusyId(snapshot.simulation.id);
    setMessage(null);
    try {
      const opened = await onOpenSimulation(snapshot.simulation.id);
      if (!opened) setMessage('Simulatsiooni avamine ebaõnnestus.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Simulatsiooni avamine ebaõnnestus.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleClassroom = (entryId: string) => {
    setExpandedClassrooms((current) => {
      const next = new Set(current);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  return (
    <section style={panelStyle}>
      <button onClick={() => setCollapsed((value) => !value)} style={headerButtonStyle}>
        <span>Simulatsioonide haldus</span>
        <span>{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div style={bodyStyle}>
          <p style={teacherNoteStyle}>
            Uute arendusmuudatuste testimiseks loo uus puhas simulatsioon. Vanad koodid avavad vana salvestatud seisu.
          </p>

          <div style={toolbarStyle}>
            <button onClick={() => void loadList()} disabled={loading} style={secondaryButtonStyle}>
              {loading ? 'Laadimine...' : 'Värskenda nimekirja'}
            </button>
            <label style={toggleStyle}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Näita arhiveeritud simulatsioone
            </label>
          </div>

          {message && <div style={messageStyle}>{message}</div>}

          <SimulationList
            title="Loodud simulatsioonid"
            entries={activeEntries}
            currentSimulationId={currentSimulationId}
            busyId={busyId}
            expandedClassrooms={expandedClassrooms}
            onOpen={openEntry}
            onOpenSnapshot={openSnapshot}
            onArchive={archiveEntry}
            onDelete={deleteEntry}
            onToggleClassroom={toggleClassroom}
            onCreateNew={onCreateNew}
          />

          {showArchived && (
            <SimulationList
              title="Arhiveeritud simulatsioonid"
              entries={archivedEntries}
              currentSimulationId={currentSimulationId}
              busyId={busyId}
              expandedClassrooms={expandedClassrooms}
              onOpen={openEntry}
              onOpenSnapshot={openSnapshot}
              onArchive={archiveEntry}
              onDelete={deleteEntry}
              onToggleClassroom={toggleClassroom}
              onCreateNew={onCreateNew}
            />
          )}
        </div>
      )}
    </section>
  );
};

const SimulationList: React.FC<{
  title: string;
  entries: ManagedSimulationEntry[];
  currentSimulationId?: string;
  busyId: string | null;
  expandedClassrooms: Set<string>;
  onOpen: (entry: ManagedSimulationEntry) => void;
  onOpenSnapshot: (snapshot: SimulationSnapshot) => void;
  onArchive: (entry: ManagedSimulationEntry) => void;
  onDelete: (entry: ManagedSimulationEntry) => void;
  onToggleClassroom: (entryId: string) => void;
  onCreateNew?: () => void;
}> = ({ title, entries, currentSimulationId, busyId, expandedClassrooms, onOpen, onOpenSnapshot, onArchive, onDelete, onToggleClassroom, onCreateNew }) => (
  <div style={listSectionStyle}>
    <div style={sectionTitleStyle}>{title}</div>
    {entries.length === 0 ? (
      <div style={emptyStyle}>
        <span>Ühtegi loodud simulatsiooni ei leitud.</span>
        {onCreateNew && (
          <button type="button" onClick={onCreateNew} style={emptyActionStyle}>
            Loo uus simulatsioon
          </button>
        )}
      </div>
    ) : (
      <div style={listStyle}>
        {entries.map((entry) =>
          entry.kind === 'classroom' ? (
            <ClassroomSimulationRow
              key={entry.id}
              entry={entry}
              current={entryIsCurrent(entry, currentSimulationId)}
              busy={busyId === entry.id}
              busyId={busyId}
              expanded={expandedClassrooms.has(entry.id)}
              onOpen={() => onOpen(entry)}
              onOpenSnapshot={onOpenSnapshot}
              onArchive={() => onArchive(entry)}
              onDelete={() => onDelete(entry)}
              onToggle={() => onToggleClassroom(entry.id)}
            />
          ) : (
            <SingleSimulationRow
              key={entry.id}
              entry={entry}
              current={entryIsCurrent(entry, currentSimulationId)}
              busy={busyId === entry.id}
              onOpen={() => onOpen(entry)}
              onArchive={() => onArchive(entry)}
              onDelete={() => onDelete(entry)}
            />
          )
        )}
      </div>
    )}
  </div>
);

const SingleSimulationRow: React.FC<{
  entry: Extract<ManagedSimulationEntry, { kind: 'single' }>;
  current: boolean;
  busy: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
}> = ({ entry, current, busy, onOpen, onArchive, onDelete }) => {
  const { simulation } = entry.snapshot;
  const oldSnapshot = !simulation.dataVersion;
  const teacherCode = simulation.teacherCode ?? simulation.joinCode;
  const studentCode = simulation.studentCode ?? simulation.joinCode;
  const legacyCode =
    simulation.joinCode !== simulation.teacherCode && simulation.joinCode !== simulation.studentCode
      ? simulation.joinCode
      : undefined;
  const groupSimulation = isGroupSimulation(entry.snapshot);

  return (
    <article style={rowStyle(current)}>
      <div style={rowMainStyle}>
        <div style={simulationTitleStyle}>
          <span>{simulation.name || 'Simulatsioon'}</span>
          {current && <span style={currentBadgeStyle}>Praegu avatud</span>}
          <span style={typeBadgeStyle}>{groupSimulation ? 'Grupi simulatsioon' : 'Üksiksimulatsioon'}</span>
        </div>

        <div style={metaGridStyle}>
          <Info label="Simulatsioon" value={simulation.id} compact />
          <Info label="Loodud" value={formatDate(simulation.createdAt)} />
          <Info label="Muudetud" value={formatDate(simulation.updatedAt)} />
          <Info label="Staatus" value={statusLabels[simulation.status] ?? simulation.status} />
          <Info label="Õppejõu kood" value={teacherCode} />
          <Info label="Õpilase kood" value={studentCode} />
          <Info label="Vana kood" value={legacyCode ?? '-'} />
          <Info label="Grupp" value={simulation.classroomGroupName ?? '-'} />
        </div>

        {oldSnapshot && (
          <div style={oldSnapshotStyle}>
            <strong>Vana simulatsiooni põhi</strong>
            <span>See simulatsioon loodi vanema versiooniga. Uute funktsioonide testimiseks loo uus puhas simulatsioon.</span>
          </div>
        )}
        {groupSimulation && <div style={groupDeleteNoteStyle}>Vana grupikirje: sellel puudub piisav grupiharjutuse metadata ühiseks koondamiseks.</div>}
      </div>

      <div style={actionColumnStyle}>
        <button onClick={onOpen} disabled={busy} style={primaryButtonStyle}>Ava</button>
        <button onClick={() => void copyCode('Õppejõu kood', teacherCode)} disabled={busy} style={secondaryButtonStyle}>Kopeeri õpetaja kood</button>
        <button onClick={() => void copyCode('Õpilase kood', studentCode)} disabled={busy} style={secondaryButtonStyle}>Kopeeri õpilase kood</button>
        {simulation.status !== 'archived' && (
          <button onClick={onArchive} disabled={busy} style={secondaryButtonStyle}>Arhiveeri</button>
        )}
        <button onClick={onDelete} disabled={busy} style={dangerButtonStyle}>Kustuta test-simulatsioon</button>
      </div>
    </article>
  );
};

const ClassroomSimulationRow: React.FC<{
  entry: Extract<ManagedSimulationEntry, { kind: 'classroom' }>;
  current: boolean;
  busy: boolean;
  busyId: string | null;
  expanded: boolean;
  onOpen: () => void;
  onOpenSnapshot: (snapshot: SimulationSnapshot) => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggle: () => void;
}> = ({ entry, current, busy, busyId, expanded, onOpen, onOpenSnapshot, onArchive, onDelete, onToggle }) => (
  <article style={rowStyle(current)}>
    <div style={rowMainStyle}>
      <div style={simulationTitleStyle}>
        <span>{entry.title}</span>
        {current && <span style={currentBadgeStyle}>Praegu avatud</span>}
        <span style={typeBadgeStyle}>Grupisimulatsioon</span>
      </div>

      <div style={metaGridStyle}>
        <Info label="Simulatsioon" value={entry.id} compact />
        <Info label="Loodud" value={formatDate(entry.createdAt)} />
        <Info label="Muudetud" value={formatDate(entry.updatedAt)} />
        <Info label="Staatus" value={statusLabels[entry.status] ?? entry.status} />
        <Info label="Õppejõu kood" value={entry.teacherCode} />
        <Info label="Gruppide arv" value={`${entry.groupCount}`} />
      </div>

      {entry.oldSnapshot && (
        <div style={oldSnapshotStyle}>
          <strong>Vana simulatsiooni põhi</strong>
          <span>See grupiharjutus sisaldab vanema versiooniga loodud grupi seise. Uute funktsioonide testimiseks loo uus puhas simulatsioon.</span>
        </div>
      )}

      <div style={classroomSummaryStyle}>
        <div>
          <strong>Grupid</strong>
          <span>{entry.groups.length} töölauda</span>
        </div>
        <button onClick={onToggle} style={miniButtonStyle}>
          {expanded ? 'Peida grupid' : 'Ava grupid'}
        </button>
      </div>

      {expanded && (
        <div style={groupListStyle}>
          {entry.groups.map((group) => (
            <div key={group.simulationId} style={groupRowStyle}>
              <div style={groupInfoStyle}>
                <strong>{group.groupName}</strong>
                <span>Õpilase kood: {group.studentCode}</span>
                <span>Staatus: {group.snapshot ? statusLabels[group.snapshot.simulation.status] ?? group.snapshot.simulation.status : 'seis puudub'}</span>
              </div>
              <button
                onClick={() => group.snapshot && onOpenSnapshot(group.snapshot)}
                disabled={!group.snapshot || busyId === group.simulationId}
                style={secondaryButtonStyle}
              >
                {group.snapshot?.simulation.status === 'completed' ? 'Vaata grupi lahendust' : 'Ava grupi töölaud'}
              </button>
              <button
                onClick={() => void copyCode(`${group.groupName} õpilase kood`, group.studentCode)}
                style={secondaryButtonStyle}
              >
                Kopeeri õpilase kood
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    <div style={actionColumnStyle}>
      <button onClick={onOpen} disabled={busy} style={primaryButtonStyle}>Halda grupisimulatsiooni</button>
      <button onClick={() => void copyCode('Õppejõu kood', entry.teacherCode)} disabled={busy} style={secondaryButtonStyle}>Kopeeri õpetaja kood</button>
      {entry.status !== 'archived' && (
        <button onClick={onArchive} disabled={busy} style={secondaryButtonStyle}>Arhiveeri</button>
      )}
      <button onClick={onDelete} disabled={busy} style={dangerButtonStyle}>Kustuta kogu grupiharjutus</button>
    </div>
  </article>
);

const Info: React.FC<{ label: string; value: string; compact?: boolean }> = ({ label, value, compact }) => (
  <div style={infoStyle}>
    <span style={infoLabelStyle}>{label}</span>
    <span style={compact ? compactInfoValueStyle : infoValueStyle}>{value}</span>
  </div>
);

const panelStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderBottom: '1px solid var(--border-bright)',
  flexShrink: 0,
};

const headerButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 32,
  padding: '7px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#edf3f8',
  border: 'none',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const bodyStyle: React.CSSProperties = {
  padding: '10px 12px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const teacherNoteStyle: React.CSSProperties = {
  margin: 0,
  padding: '8px 10px',
  background: 'rgba(34,121,157,0.08)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
};

const toggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const messageStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const listSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const sectionTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 18,
  lineHeight: 1,
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  padding: 10,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const emptyActionStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--cyan)',
  border: '1px solid var(--cyan)',
  borderRadius: 'var(--radius-sm)',
  color: '#ffffff',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  padding: '5px 8px',
};

const listStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  maxHeight: 360,
  overflowY: 'auto',
  paddingRight: 2,
};

const rowStyle = (current: boolean): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 10,
  padding: 10,
  background: current ? 'rgba(34,121,157,0.07)' : 'var(--bg-card)',
  border: `1px solid ${current ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--shadow-card)',
});

const rowMainStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const simulationTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  color: 'var(--text-primary)',
  fontWeight: 800,
  fontSize: 14,
};

const currentBadgeStyle: React.CSSProperties = {
  padding: '2px 5px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(34,121,157,0.10)',
  border: '1px solid var(--cyan-dim)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const typeBadgeStyle: React.CSSProperties = {
  padding: '2px 5px',
  borderRadius: 'var(--radius-sm)',
  background: '#f1f5f9',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const metaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
  gap: 6,
};

const infoStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const infoLabelStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontWeight: 800,
};

const infoValueStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 700,
  overflowWrap: 'anywhere',
};

const compactInfoValueStyle: React.CSSProperties = {
  ...infoValueStyle,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
};

const oldSnapshotStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '7px 8px',
  background: 'rgba(166,111,31,0.08)',
  border: '1px solid var(--amber-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 11,
};

const groupDeleteNoteStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const classroomSummaryStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  padding: '7px 8px',
  background: '#f8fafc',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const miniButtonStyle: React.CSSProperties = {
  minHeight: 24,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  padding: '4px 7px',
};

const groupListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
};

const groupRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  gap: 8,
  alignItems: 'center',
  padding: '7px 8px',
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
};

const groupInfoStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const actionColumnStyle: React.CSSProperties = {
  width: 160,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--cyan)',
  border: '1px solid var(--cyan)',
  borderRadius: 'var(--radius-sm)',
  color: '#ffffff',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  padding: '5px 8px',
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  padding: '5px 8px',
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'rgba(185,67,77,0.08)',
  border: '1px solid var(--red-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  padding: '5px 8px',
};
