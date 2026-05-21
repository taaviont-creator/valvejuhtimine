import React, { useEffect, useMemo, useState } from 'react';
import { SimulationSnapshot, SimulationStatus } from '../../models';
import {
  archiveSimulationSnapshot,
  deleteSimulationSnapshot,
  listSimulationSnapshots,
} from '../../lib/sharedSimulationStore';

interface Props {
  currentSimulationId: string;
  onOpenSimulation: (simulationId: string) => Promise<boolean> | boolean;
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

export const SimulationManagementPanel: React.FC<Props> = ({ currentSimulationId, onOpenSimulation }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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

  const activeSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.simulation.status !== 'archived'),
    [snapshots]
  );
  const archivedSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.simulation.status === 'archived'),
    [snapshots]
  );

  const archiveSnapshot = async (snapshot: SimulationSnapshot) => {
    if (!window.confirm(`Arhiveeri simulatsioon "${snapshot.simulation.name}"?`)) return;
    setBusyId(snapshot.simulation.id);
    setMessage(null);
    try {
      await archiveSimulationSnapshot(snapshot.simulation.id);
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Arhiveerimine ebaõnnestus.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteSnapshot = async (snapshot: SimulationSnapshot) => {
    if (!window.confirm('Kas oled kindel? Seda test-simulatsiooni ei saa pärast kustutamist taastada.')) return;
    setBusyId(snapshot.simulation.id);
    setMessage(null);
    try {
      await deleteSimulationSnapshot(snapshot.simulation.id);
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Test-simulatsiooni kustutamine ebaõnnestus.');
    } finally {
      setBusyId(null);
    }
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
            title="Aktiivsed simulatsioonid"
            snapshots={activeSnapshots}
            currentSimulationId={currentSimulationId}
            busyId={busyId}
            onOpen={openSnapshot}
            onArchive={archiveSnapshot}
            onDelete={deleteSnapshot}
          />

          {showArchived && (
            <SimulationList
              title="Arhiveeritud simulatsioonid"
              snapshots={archivedSnapshots}
              currentSimulationId={currentSimulationId}
              busyId={busyId}
              onOpen={openSnapshot}
              onArchive={archiveSnapshot}
              onDelete={deleteSnapshot}
            />
          )}
        </div>
      )}
    </section>
  );
};

const SimulationList: React.FC<{
  title: string;
  snapshots: SimulationSnapshot[];
  currentSimulationId: string;
  busyId: string | null;
  onOpen: (snapshot: SimulationSnapshot) => void;
  onArchive: (snapshot: SimulationSnapshot) => void;
  onDelete: (snapshot: SimulationSnapshot) => void;
}> = ({ title, snapshots, currentSimulationId, busyId, onOpen, onArchive, onDelete }) => (
  <div style={listSectionStyle}>
    <div style={sectionTitleStyle}>{title}</div>
    {snapshots.length === 0 ? (
      <div style={emptyStyle}>Simulatsioone ei leitud.</div>
    ) : (
      <div style={listStyle}>
        {snapshots.map((snapshot) => (
          <SimulationRow
            key={snapshot.simulation.id}
            snapshot={snapshot}
            current={snapshot.simulation.id === currentSimulationId}
            busy={busyId === snapshot.simulation.id}
            onOpen={() => onOpen(snapshot)}
            onArchive={() => onArchive(snapshot)}
            onDelete={() => onDelete(snapshot)}
          />
        ))}
      </div>
    )}
  </div>
);

const SimulationRow: React.FC<{
  snapshot: SimulationSnapshot;
  current: boolean;
  busy: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
}> = ({ snapshot, current, busy, onOpen, onArchive, onDelete }) => {
  const { simulation } = snapshot;
  const oldSnapshot = !simulation.dataVersion;
  const teacherCode = simulation.teacherCode ?? simulation.joinCode;
  const studentCode = simulation.studentCode ?? simulation.joinCode;
  const legacyCode =
    simulation.joinCode !== simulation.teacherCode && simulation.joinCode !== simulation.studentCode
      ? simulation.joinCode
      : undefined;
  const groupName = simulation.classroomGroupName ?? snapshot.classroomExercise?.title;
  const groupSimulation = isGroupSimulation(snapshot);

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
          <Info label="Grupp" value={groupName ?? '-'} />
        </div>

        {oldSnapshot && (
          <div style={oldSnapshotStyle}>
            <strong>Vana simulatsiooni põhi</strong>
            <span>See simulatsioon loodi vanema versiooniga. Uute funktsioonide testimiseks loo uus puhas simulatsioon.</span>
          </div>
        )}
        {groupSimulation && <div style={groupDeleteNoteStyle}>Kustutamine eemaldab ainult selle grupi salvestatud seisu.</div>}
      </div>

      <div style={actionColumnStyle}>
        <button onClick={onOpen} disabled={busy} style={primaryButtonStyle}>Ava</button>
        {simulation.status !== 'archived' && (
          <button onClick={onArchive} disabled={busy} style={secondaryButtonStyle}>Arhiveeri</button>
        )}
        <button onClick={onDelete} disabled={busy} style={dangerButtonStyle}>Kustuta test-simulatsioon</button>
      </div>
    </article>
  );
};

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
  padding: 10,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 12,
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

const actionColumnStyle: React.CSSProperties = {
  width: 150,
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
