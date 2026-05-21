import React, { useMemo, useState } from 'react';
import {
  Building,
  ClassroomExercise,
  DecisionLogEntry,
  EscortBus,
  Incident,
  Officer,
  Simulation,
  SimulationSnapshot,
  Warning,
} from '../../models';
import { calculateWarnings, getIncidentOfficers } from '../../lib/calculations';

interface Props {
  simulation: Simulation;
  classroomExercise: ClassroomExercise | null;
  classroomSnapshots: SimulationSnapshot[];
  buildings: Building[];
  officers: Officer[];
  incidents: Incident[];
  buses: EscortBus[];
  warnings: Warning[];
  decisionLog: DecisionLogEntry[];
}

type GroupStatusLabel = 'Reageerimata' | 'Reageerimisel' | 'Puudulik ressurss' | 'Piisav ressurss' | 'Lõpetatud';

const simulationStatusLabels: Record<Simulation['status'], string> = {
  setup: 'ettevalmistus',
  active: 'käimas',
  completed: 'lõpetatud',
  archived: 'arhiveeritud',
};

const incidentStatusLabels: Record<Incident['status'], string> = {
  active: 'Aktiivne',
  escalated: 'Eskaleeritud',
  under_control: 'Kontrolli all',
  closed: 'Lõpetatud',
};

const severityLabels: Record<Incident['severity'], string> = {
  low: 'Madal',
  medium: 'Keskmine',
  high: 'Kõrge',
  critical: 'Kriitiline',
};

function statusForGroup(snapshot?: SimulationSnapshot): GroupStatusLabel {
  if (!snapshot) return 'Reageerimata';
  const activeIncidents = snapshot.incidents.filter((incident) => incident.status !== 'closed');
  if (snapshot.incidents.length > 0 && activeIncidents.length === 0) return 'Lõpetatud';
  if (activeIncidents.length === 0) return 'Reageerimata';

  const anyAssigned = activeIncidents.some((incident) => getIncidentOfficers(incident, snapshot.officers).length > 0);
  if (!anyAssigned) return 'Reageerimata';

  const warnings = calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses);
  const hasResourceWarning = warnings.some((warning) =>
    ['incident_understaffed', 'incident_unassigned', 'missing_escort_permission', 'missing_taser_permission', 'missing_senior_officer'].includes(warning.type)
  );
  if (hasResourceWarning) return 'Puudulik ressurss';

  const allStaffed = activeIncidents.every((incident) => getIncidentOfficers(incident, snapshot.officers).length >= incident.requiredOfficers);
  return allStaffed ? 'Piisav ressurss' : 'Reageerimisel';
}

function statusColor(status: GroupStatusLabel) {
  if (status === 'Lõpetatud' || status === 'Piisav ressurss') return 'var(--green)';
  if (status === 'Puudulik ressurss') return 'var(--red)';
  if (status === 'Reageerimisel') return 'var(--amber)';
  return 'var(--text-muted)';
}

function latestDecision(snapshot?: SimulationSnapshot) {
  return snapshot?.decisionLog.find((entry) => entry.actor !== 'system') ?? snapshot?.decisionLog[0];
}

function latestIncidentUpdate(incident: Incident) {
  const assessment = [...incident.updates].reverse().find((update) => update.type === 'scene_assessment');
  return assessment ?? incident.updates[incident.updates.length - 1];
}

function buildingName(buildings: Building[], buildingId: string) {
  return buildings.find((building) => building.id === buildingId)?.name ?? 'Asukoht puudub';
}

function requirementText(incident: Incident, assigned: Officer[]) {
  const taserMet = !incident.requiresTaserPermission || assigned.some((officer) => officer.hasTaserPermission);
  const escortCount = assigned.filter((officer) => officer.hasEscortPermission).length;
  const escortMet = !incident.requiresEscortPermission || escortCount > 0;
  const seniorMet = !incident.requiresSeniorOfficer || assigned.some((officer) => officer.role === 'vanemvalvur');
  return [
    incident.requiresTaserPermission ? `EŠR: ${taserMet ? 'täidetud' : 'puudu'}` : 'EŠR: ei nõua',
    incident.requiresEscortPermission ? `Saade: ${escortMet ? 'täidetud' : 'puudu'} (${escortCount})` : 'Saade: ei nõua',
    incident.requiresSeniorOfficer ? `Vanemvalvur: ${seniorMet ? 'täidetud' : 'puudu'}` : 'Vanemvalvur: ei nõua',
  ];
}

function mergeCurrentSnapshot(
  snapshots: SimulationSnapshot[],
  current: Omit<SimulationSnapshot, 'participants'>
) {
  const currentSnapshot: SimulationSnapshot = { ...current, participants: [] };
  const others = snapshots.filter((snapshot) => snapshot.simulation.id !== current.simulation.id);
  return [currentSnapshot, ...others];
}

export const DebriefSummaryPanel: React.FC<Props> = ({
  simulation,
  classroomExercise,
  classroomSnapshots,
  buildings,
  officers,
  incidents,
  buses,
  warnings,
  decisionLog,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [notes, setNotes] = useState('');

  const allSnapshots = useMemo(
    () =>
      mergeCurrentSnapshot(classroomSnapshots, {
        simulation,
        classroomExercise,
        buildings,
        officers,
        incidents,
        buses,
        decisionLog,
      }),
    [buildings, buses, classroomExercise, classroomSnapshots, decisionLog, incidents, officers, simulation]
  );
  const snapshotById = useMemo(() => new Map(allSnapshots.map((snapshot) => [snapshot.simulation.id, snapshot])), [allSnapshots]);

  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const closedIncidents = incidents.filter((incident) => incident.status === 'closed');
  const injuredOfficers = officers.filter((officer) => officer.status === 'unavailable');
  const recentLog = decisionLog.slice(0, 10);
  const sharedIncidentEvents = (classroomExercise?.sharedScenarioEvents ?? []).filter((event) => event.kind === 'incident');

  return (
    <section style={panelStyle}>
      <button type="button" onClick={() => setCollapsed((value) => !value)} style={headerButtonStyle}>
        <span>
          <span style={eyebrowStyle}>Õppejõu vaade</span>
          <strong style={titleStyle}>Harjutuse kokkuvõte</strong>
        </span>
        <span style={toggleStyle}>{collapsed ? 'Ava kokkuvõte' : 'Peida kokkuvõte'}</span>
      </button>

      {!collapsed && (
        <div style={bodyStyle}>
          <div style={summaryGridStyle}>
            <SummaryMetric label="Simulatsioon" value={simulation.name} />
            <SummaryMetric label="Staatus" value={simulationStatusLabels[simulation.status]} />
            <SummaryMetric label="Sündmused" value={`${incidents.length}`} />
            <SummaryMetric label="Aktiivsed" value={`${activeIncidents.length}`} />
            <SummaryMetric label="Lõpetatud" value={`${closedIncidents.length}`} />
            <SummaryMetric label="Hoiatused" value={`${warnings.length}`} warning={warnings.length > 0} />
            <SummaryMetric label="Vigastatud / mängust väljas" value={`${injuredOfficers.length}`} warning={injuredOfficers.length > 0} />
          </div>

          {classroomExercise && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Gruppide võrdlus</h3>
              <div style={groupGridStyle}>
                {classroomExercise.groups.map((group) => {
                  const snapshot = snapshotById.get(group.simulationId);
                  const groupWarnings = snapshot
                    ? calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses)
                    : [];
                  const groupActive = snapshot?.incidents.filter((incident) => incident.status !== 'closed').length ?? 0;
                  const groupClosed = snapshot?.incidents.filter((incident) => incident.status === 'closed').length ?? 0;
                  const groupInjured = snapshot?.officers.filter((officer) => officer.status === 'unavailable').length ?? 0;
                  const status = statusForGroup(snapshot);
                  const latest = latestDecision(snapshot);

                  return (
                    <article key={group.simulationId} style={groupCardStyle}>
                      <div style={groupHeaderStyle}>
                        <strong>{group.groupName}</strong>
                        <span style={{ ...statusBadgeStyle, color: statusColor(status) }}>{status}</span>
                      </div>
                      <div style={smallMetricGridStyle}>
                        <span>Aktiivsed: <strong>{groupActive}</strong></span>
                        <span>Lõpetatud: <strong>{groupClosed}</strong></span>
                        <span>Hoiatused: <strong>{groupWarnings.length}</strong></span>
                        <span>Väljas: <strong>{groupInjured}</strong></span>
                      </div>
                      <div style={latestStyle}>Viimane otsus: {latest?.text ?? 'tegevusi pole veel logitud'}</div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {classroomExercise && sharedIncidentEvents.length > 0 && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Ühised sündmused</h3>
              <div style={sharedListStyle}>
                {sharedIncidentEvents.map((event) => (
                  <article key={event.id} style={sharedEventStyle}>
                    <strong>Ühine sündmus: {event.targetBuildingName} — {event.title}</strong>
                    <div style={sharedResponseGridStyle}>
                      {classroomExercise.groups.map((group) => {
                        const snapshot = snapshotById.get(group.simulationId);
                        const incident = snapshot?.incidents.find((item) => item.sharedScenarioEventId === event.id);
                        const assigned = incident && snapshot ? getIncidentOfficers(incident, snapshot.officers).length : 0;
                        const groupWarnings = snapshot
                          ? calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses).length
                          : 0;

                        return (
                          <span key={`${event.id}-${group.simulationId}`} style={sharedResponseStyle}>
                            <strong>{group.groupName}</strong>
                            {incident ? `${assigned}/${incident.requiredOfficers} ametnikku, hoiatusi ${groupWarnings}` : 'reageerimata'}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Sündmused</h3>
            {incidents.length === 0 ? (
              <div style={emptyStyle}>Sündmusi pole veel loodud.</div>
            ) : (
              <div style={incidentGridStyle}>
                {incidents.map((incident) => {
                  const assigned = getIncidentOfficers(incident, officers);
                  const latest = latestIncidentUpdate(incident);
                  const requirements = requirementText(incident, assigned);

                  return (
                    <article key={incident.id} style={incidentCardStyle}>
                      <div style={incidentHeaderStyle}>
                        <strong>{incident.title}</strong>
                        <span>{incidentStatusLabels[incident.status]}</span>
                      </div>
                      <div style={incidentMetaStyle}>
                        <span>Asukoht: {buildingName(buildings, incident.buildingId)}</span>
                        <span>Raskus: {severityLabels[incident.severity]}</span>
                        <span>Ametnikud: {assigned.length}/{incident.requiredOfficers}</span>
                        <span>{incident.status === 'closed' ? 'Lõpetatud' : 'Aktiivne'}</span>
                      </div>
                      <div style={requirementLineStyle}>{requirements.join(' | ')}</div>
                      <div style={assignedLineStyle}>
                        Määratud: {assigned.length > 0 ? assigned.map((officer) => officer.name).join(', ') : 'ametnikke pole'}
                      </div>
                      <div style={latestStyle}>Viimane info: {latest?.text ?? 'uuendusi pole'}</div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Otsuste logi</h3>
            {recentLog.length === 0 ? (
              <div style={emptyStyle}>Otsuseid pole veel logitud.</div>
            ) : (
              <ol style={logListStyle}>
                {recentLog.map((entry) => (
                  <li key={entry.id} style={logItemStyle}>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Õppejõu märkmed</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Kirjuta arutelu märkmed..."
              style={notesStyle}
            />
            <div style={noteHintStyle}>Õppejõu märkmed on selles vaates kohalikud. Märkmete salvestamine lisatakse hiljem.</div>
          </section>
        </div>
      )}
    </section>
  );
};

const SummaryMetric: React.FC<{ label: string; value: string; warning?: boolean }> = ({ label, value, warning }) => (
  <div style={metricStyle(warning)}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  borderBottom: '1px solid var(--border)',
  padding: '10px 12px',
  flexShrink: 0,
};

const headerButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  padding: 10,
  textAlign: 'left',
};

const eyebrowStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 18,
};

const toggleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const bodyStyle: React.CSSProperties = {
  marginTop: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 8,
};

const metricStyle = (warning?: boolean): React.CSSProperties => ({
  padding: 8,
  border: `1px solid ${warning ? 'var(--amber)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
});

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  padding: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 15,
};

const groupGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 8,
};

const groupCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-panel)',
  padding: 8,
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};

const statusBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 800,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const smallMetricGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 5,
  marginTop: 6,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const latestStyle: React.CSSProperties = {
  marginTop: 6,
  color: 'var(--text-muted)',
  fontSize: 10,
  lineHeight: 1.3,
};

const sharedListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const sharedEventStyle: React.CSSProperties = {
  borderLeft: '3px solid var(--amber)',
  padding: 8,
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
};

const sharedResponseGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 6,
  marginTop: 6,
};

const sharedResponseStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: 6,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const incidentGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 8,
};

const incidentCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-panel)',
  padding: 8,
};

const incidentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
};

const incidentMetaStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 4,
  marginTop: 6,
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const requirementLineStyle: React.CSSProperties = {
  marginTop: 6,
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
};

const assignedLineStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--text-secondary)',
  fontSize: 10,
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
};

const logListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  maxHeight: 150,
  overflowY: 'auto',
};

const logItemStyle: React.CSSProperties = {
  marginBottom: 5,
  color: 'var(--text-secondary)',
  fontSize: 10.5,
  lineHeight: 1.3,
};

const notesStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 74,
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  padding: 8,
  resize: 'vertical',
};

const noteHintStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--text-muted)',
  fontSize: 10,
};
