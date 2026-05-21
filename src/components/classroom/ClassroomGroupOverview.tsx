import React from 'react';
import { ClassroomExercise, SimulationSnapshot } from '../../models';
import { calculateWarnings, getIncidentOfficers } from '../../lib/calculations';

interface Props {
  exercise: ClassroomExercise;
  snapshots: SimulationSnapshot[];
  currentSimulationId?: string;
  onOpenGroup: (simulationId: string) => void;
}

export const ClassroomGroupOverview: React.FC<Props> = ({ exercise, snapshots, currentSimulationId, onOpenGroup }) => {
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.simulation.id, snapshot]));

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      window.prompt('Õpilase kood', code);
    }
  };

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Ühine stsenaarium</div>
          <div style={titleStyle}>Gruppide eraldi lahendused</div>
          <div style={subtitleStyle}>Kõik grupid lahendavad sama situatsiooni</div>
        </div>
        <div style={teacherCodeStyle}>
          <span>Õppejõu kood</span>
          <strong>{exercise.teacherCode}</strong>
        </div>
      </div>

      <div style={contentStyle}>
        <div style={scenarioListStyle}>
          {(exercise.sharedScenarioEvents ?? []).filter((event) => event.kind === 'incident').slice(0, 3).map((event) => (
            <section key={event.id} style={scenarioStyle}>
              <div style={scenarioTitleStyle}>
                <strong>Ühine sündmus: {event.title}</strong>
                <span>{event.targetBuildingName} | {event.sentToAllGroups ? 'Saadetud kõigile gruppidele' : 'Valitud grupp'}</span>
              </div>
              <div style={responseGridStyle}>
                {exercise.groups.map((group) => {
                  const snapshot = snapshotById.get(group.simulationId);
                  const incident = snapshot?.incidents.find((item) => item.sharedScenarioEventId === event.id);
                  const assigned = incident && snapshot ? getIncidentOfficers(incident, snapshot.officers).length : 0;
                  const warnings = snapshot
                    ? calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses).length
                    : 0;
                  const latest = snapshot?.decisionLog.find((entry) => entry.actor !== 'system') ?? snapshot?.decisionLog[0];
                  const statusText = incident
                    ? incident.status === 'closed'
                      ? 'lõpetatud'
                      : incident.status === 'under_control'
                      ? 'kontrolli all'
                      : incident.status === 'escalated'
                      ? 'eskaleeritud'
                      : 'aktiivne'
                    : 'reageerimata';

                  return (
                    <div key={`${event.id}-${group.simulationId}`} style={responseStyle}>
                      <strong>{group.groupName}: {statusText}</strong>
                      <span>{incident ? `${assigned}/${incident.requiredOfficers} ametnikku määratud` : 'sündmus avamata'}, hoiatusi {warnings}</span>
                      <span>{latest?.text ?? 'Grupi otsused puuduvad'}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {(exercise.sharedScenarioEvents ?? []).filter((event) => event.kind === 'incident').length === 0 && (
            <div style={emptyScenarioStyle}>Ühist situatsiooni pole veel gruppidele saadetud.</div>
          )}
        </div>

        <div style={gridStyle}>
          {exercise.groups.map((group) => {
            const snapshot = snapshotById.get(group.simulationId);
            const activeIncidents = snapshot?.incidents.filter((incident) => incident.status !== 'closed').length ?? 0;
            const warnings = snapshot
              ? calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses).length
              : 0;
            const latest = snapshot?.decisionLog.find((entry) => entry.actor !== 'system') ?? snapshot?.decisionLog[0];
            const selected = currentSimulationId === group.simulationId;

            return (
              <article key={group.simulationId} style={groupStyle(selected)}>
                <div style={groupTopStyle}>
                  <strong>{group.groupName}</strong>
                  <span style={codeStyle}>Õpilase kood {group.studentCode}</span>
                </div>
                <div style={metricRowStyle}>
                  <span>Aktiivsed sündmused: <strong>{activeIncidents}</strong></span>
                  <span>Hoiatused: <strong>{warnings}</strong></span>
                </div>
                <div style={latestStyle}>Grupi otsused: {latest?.text ?? 'tegevusi pole veel logitud'}</div>
                <div style={buttonRowStyle}>
                  <button onClick={() => onOpenGroup(group.simulationId)} style={primaryButtonStyle}>
                    Ava grupi töölaud
                  </button>
                  <button onClick={() => void copyCode(group.studentCode)} style={secondaryButtonStyle}>
                    Kopeeri õpilase kood
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  borderBottom: '1px solid var(--border)',
  padding: '10px 12px',
  display: 'grid',
  gridTemplateColumns: '200px 1fr',
  gap: 12,
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 8,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--cyan)',
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  color: 'var(--text-primary)',
  fontSize: 20,
  lineHeight: 1,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--text-secondary)',
  fontSize: 11,
  lineHeight: 1.25,
};

const teacherCodeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  color: 'var(--amber)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 8,
  maxHeight: 130,
  overflowY: 'auto',
};

const contentStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: 10,
  minWidth: 0,
};

const scenarioListStyle: React.CSSProperties = {
  maxHeight: 130,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const scenarioStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--amber)',
  borderRadius: 'var(--radius-sm)',
  padding: 8,
};

const scenarioTitleStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};

const responseGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 5,
  marginTop: 6,
};

const responseStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: 6,
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 9.5,
  lineHeight: 1.25,
};

const emptyScenarioStyle: React.CSSProperties = {
  padding: 10,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const groupStyle = (selected: boolean): React.CSSProperties => ({
  border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border)'}`,
  borderLeft: `3px solid ${selected ? 'var(--cyan)' : 'var(--border-bright)'}`,
  borderRadius: 'var(--radius-sm)',
  background: selected ? 'rgba(34,121,157,0.07)' : 'var(--bg-card)',
  padding: 8,
  minWidth: 0,
});

const groupTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 6,
  color: 'var(--text-primary)',
  fontSize: 12,
};

const codeStyle: React.CSSProperties = {
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const metricRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  marginTop: 5,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const latestStyle: React.CSSProperties = {
  minHeight: 30,
  marginTop: 5,
  color: 'var(--text-muted)',
  fontSize: 10,
  lineHeight: 1.25,
  overflow: 'hidden',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '0.8fr 1.2fr',
  gap: 5,
  marginTop: 6,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 26,
  background: 'rgba(34,121,157,0.09)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'transparent',
  borderColor: 'var(--border)',
  color: 'var(--text-secondary)',
};
