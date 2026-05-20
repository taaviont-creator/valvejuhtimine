import React, { useState } from 'react';
import { PREPARED_SCENARIO_INJECTS, PreparedScenarioInject } from '../../data/incidentTemplates';
import { Building, DecisionLogEntry, Incident, Officer, Warning } from '../../models';
import { formatTime, getIncidentOfficers } from '../../lib/calculations';

export type OverviewEscalationAction = 'more_resources' | 'needs_taser' | 'needs_escort' | 'under_control';

interface Props {
  buildings: Building[];
  incidents: Incident[];
  officers: Officer[];
  warnings: Warning[];
  decisionLog: DecisionLogEntry[];
  activatedInjectIds: string[];
  onActivateInject: (inject: PreparedScenarioInject, buildingId: string) => void;
  onOpenEscalation: (incidentId: string) => void;
  onQuickEscalation: (incidentId: string, action: OverviewEscalationAction) => void;
  onMarkOfficerInjured: (incidentId: string, officerId: string) => void;
  onCloseIncident: (incidentId: string) => void;
}

const severityLabels: Record<string, string> = {
  low: 'Madal',
  medium: 'Keskmine',
  high: 'Kõrge',
  critical: 'Kriitiline',
};

export const ScenarioOverviewPanel: React.FC<Props> = ({
  buildings,
  incidents,
  officers,
  warnings,
  decisionLog,
  activatedInjectIds,
  onActivateInject,
  onOpenEscalation,
  onQuickEscalation,
  onMarkOfficerInjured,
  onCloseIncident,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [injurySelections, setInjurySelections] = useState<Record<string, string>>({});
  const unactivatedInjects = PREPARED_SCENARIO_INJECTS.filter((inject) => !activatedInjectIds.includes(inject.id));
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const escalatedIncidents = activeIncidents.filter((incident) => incident.status === 'escalated' || incident.updates.length > 0);
  const closedIncidents = incidents.filter((incident) => incident.status === 'closed');
  const freeOfficers = officers.filter((officer) => officer.currentBuildingId && !officer.currentIncidentId && !officer.currentBusId && officer.status !== 'unavailable').length;
  const onIncident = officers.filter((officer) => officer.currentIncidentId).length;
  const onEscort = officers.filter((officer) => officer.currentBusId).length;
  const unavailable = officers.filter((officer) => officer.status === 'unavailable').length;

  const activateInject = (inject: PreparedScenarioInject) => {
    const building = buildings.find((item) => item.name === inject.targetBuildingName) ?? buildings.find((item) => !item.isResourcePool);
    if (!building) return;
    onActivateInject(inject, building.id);
  };

  return (
    <section style={panelStyle}>
      <button onClick={() => setCollapsed((value) => !value)} style={headerButtonStyle}>
        <span>Stsenaariumi ülevaade</span>
        <span style={collapseStyle}>{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div style={bodyStyle}>
          <div style={resourceBarStyle}>
            <Metric label="Vabad" value={freeOfficers} color="var(--green)" />
            <Metric label="Sündmusel" value={onIncident} color="var(--amber)" />
            <Metric label="Saatmisel" value={onEscort} color="#ff99cc" />
            <Metric label="Mängust väljas" value={unavailable} color="var(--red)" />
          </div>
          {warnings.length > 0 && <div style={warningLineStyle}>{warnings.length} aktiivset hoiatust</div>}

          <OverviewSection title="Käivitamata valmis sündmused" count={unactivatedInjects.length}>
            {unactivatedInjects.length === 0 ? (
              <EmptyText text="Kõik valmis sündmused on selles vaates käivitatud." />
            ) : (
              unactivatedInjects.map((inject) => (
                <div key={inject.id} style={smallCardStyle}>
                  <div style={rowTopStyle}>
                    <strong>{inject.title}</strong>
                    <span style={mutedMonoStyle}>{severityLabels[inject.severity]}</span>
                  </div>
                  <div style={mutedTextStyle}>{inject.targetBuildingName} | vajalik {inject.requiredOfficers}</div>
                  <button onClick={() => activateInject(inject)} style={miniPrimaryStyle}>Käivita</button>
                </div>
              ))
            )}
          </OverviewSection>

          <OverviewSection title="Aktiivsed sündmused" count={activeIncidents.length}>
            {activeIncidents.length === 0 ? <EmptyText text="Aktiivseid sündmusi pole." /> : activeIncidents.map((incident) => {
              const assigned = getIncidentOfficers(incident, officers);
              const buildingName = buildings.find((building) => building.id === incident.buildingId)?.name ?? '';
              const latestUpdate = incident.updates[incident.updates.length - 1];
              const missing = Math.max(0, incident.requiredOfficers - assigned.length);
              const selectedOfficerId = injurySelections[incident.id] ?? assigned[0]?.id ?? '';
              return (
                <article key={incident.id} style={incidentCardStyle(incident.status === 'escalated')}>
                  <IncidentSummary
                    incident={incident}
                    buildingName={buildingName}
                    assigned={assigned}
                    latestUpdate={latestUpdate?.text}
                    missing={missing}
                  />
                  <div style={buttonGridStyle}>
                    <button onClick={() => onQuickEscalation(incident.id, 'more_resources')} style={quickButtonStyle}>Vaja lisaressurssi</button>
                    <button onClick={() => onQuickEscalation(incident.id, 'needs_taser')} style={quickButtonStyle}>Vajalik EŠR õigusega ametnik</button>
                    <button onClick={() => onQuickEscalation(incident.id, 'needs_escort')} style={quickButtonStyle}>Vajalik 2 saateõigusega ametnikku</button>
                    <button onClick={() => onQuickEscalation(incident.id, 'under_control')} style={quickButtonStyle}>Olukord kontrolli all</button>
                  </div>
                  <div style={actionRowStyle}>
                    <button onClick={() => onOpenEscalation(incident.id)} style={secondaryButtonStyle}>Lisa eskalatsioon</button>
                    <button onClick={() => onCloseIncident(incident.id)} style={secondaryButtonStyle}>Lõpeta sündmus</button>
                  </div>
                  <div style={injuryRowStyle}>
                    <select
                      value={selectedOfficerId}
                      onChange={(event) => setInjurySelections((current) => ({ ...current, [incident.id]: event.target.value }))}
                      disabled={assigned.length === 0}
                      style={selectStyle}
                    >
                      {assigned.length === 0 ? (
                        <option value="">Ametnikke pole</option>
                      ) : (
                        assigned.map((officer) => (
                          <option key={officer.id} value={officer.id}>{officer.name}</option>
                        ))
                      )}
                    </select>
                    <button
                      onClick={() => selectedOfficerId && onMarkOfficerInjured(incident.id, selectedOfficerId)}
                      disabled={!selectedOfficerId}
                      style={{ ...dangerButtonStyle, opacity: selectedOfficerId ? 1 : 0.45 }}
                    >
                      Ametnik vigastatud
                    </button>
                  </div>
                </article>
              );
            })}
          </OverviewSection>

          <OverviewSection title="Eskaleeritud sündmused" count={escalatedIncidents.length}>
            {escalatedIncidents.length === 0 ? <EmptyText text="Eskaleeritud sündmusi pole." /> : escalatedIncidents.map((incident) => {
              const assigned = getIncidentOfficers(incident, officers);
              const latestUpdate = incident.updates[incident.updates.length - 1];
              const missing = Math.max(0, incident.requiredOfficers - assigned.length);
              return (
                <div key={incident.id} style={smallCardStyle}>
                  <div style={rowTopStyle}>
                    <strong>{incident.title}</strong>
                    <span style={escalatedBadgeStyle}>Eskaleeritud</span>
                  </div>
                  {latestUpdate && <div style={latestStyle}>Viimane muutus: {latestUpdate.text}</div>}
                  <div style={missing ? dangerTextStyle : mutedTextStyle}>
                    {missing ? `Vajalik lisaressurss: ${missing} ametnikku` : 'Nõuded on hetkel täidetud'}
                  </div>
                </div>
              );
            })}
          </OverviewSection>

          <OverviewSection title="Lõpetatud sündmused" count={closedIncidents.length}>
            {closedIncidents.length === 0 ? <EmptyText text="Lõpetatud sündmusi pole." /> : closedIncidents.map((incident) => {
              const closeLog = decisionLog.find((entry) => entry.text.includes(incident.title) && entry.text.toLowerCase().includes('lõpet'));
              return (
                <div key={incident.id} style={smallCardStyle}>
                  <div style={rowTopStyle}>
                    <strong>{incident.title}</strong>
                    <span style={mutedMonoStyle}>Lõpetatud</span>
                  </div>
                  <div style={mutedTextStyle}>{buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}</div>
                  <div style={mutedTextStyle}>Lõpetamise aeg: {closeLog ? formatTime(closeLog.createdAt) : 'pole eraldi salvestatud'}</div>
                  <div style={mutedTextStyle}>Määratud ametnikud enne lõpetamist: pole eraldi salvestatud</div>
                </div>
              );
            })}
          </OverviewSection>
        </div>
      )}
    </section>
  );
};

const IncidentSummary: React.FC<{
  incident: Incident;
  buildingName: string;
  assigned: Officer[];
  latestUpdate?: string;
  missing: number;
}> = ({ incident, buildingName, assigned, latestUpdate, missing }) => (
  <>
    <div style={rowTopStyle}>
      <strong>{incident.title} — {buildingName}</strong>
      <span style={incident.status === 'escalated' ? escalatedBadgeStyle : statusBadgeStyle}>{incident.status === 'escalated' ? 'Eskaleeritud' : 'Aktiivne'}</span>
    </div>
    <div style={mutedTextStyle}>
      Määratud: {assigned.length ? assigned.map((officer) => `${officer.name} [${officer.role === 'vanemvalvur' ? 'VV' : 'V'}]`).join(', ') : 'puudub'} / Vajalik: {incident.requiredOfficers}
    </div>
    {missing > 0 && <div style={dangerTextStyle}>Puudu: {missing} ametnik{missing === 1 ? '' : 'ku'}</div>}
    <div style={tagRowStyle}>
      {incident.requiresEscortPermission && <span style={tagStyle}>Saateõigus</span>}
      {incident.requiresTaserPermission && <span style={tagStyle}>EŠR õigus</span>}
    </div>
    {latestUpdate && <div style={latestStyle}>Viimane muutus: {latestUpdate}</div>}
  </>
);

const OverviewSection: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <section style={sectionStyle}>
    <div style={sectionTitleStyle}>{title} <span style={{ color: 'var(--cyan)' }}>{count}</span></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</div>
  </section>
);

const Metric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={metricStyle}>
    <strong style={{ color }}>{value}</strong>
    <span>{label}</span>
  </div>
);

const EmptyText: React.FC<{ text: string }> = ({ text }) => <div style={emptyStyle}>{text}</div>;

const emptyStyle: React.CSSProperties = {
  padding: '6px 0',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(0,212,255,0.025)',
  marginBottom: 8,
};

const headerButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 34,
  padding: '8px 10px',
  background: 'var(--bg-card)',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  color: 'var(--cyan)',
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const collapseStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
};

const bodyStyle: React.CSSProperties = {
  maxHeight: 520,
  overflowY: 'auto',
  padding: 7,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const resourceBarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 5,
};

const metricStyle: React.CSSProperties = {
  padding: '5px 6px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 5,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const warningLineStyle: React.CSSProperties = {
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  paddingTop: 7,
};

const sectionTitleStyle: React.CSSProperties = {
  marginBottom: 5,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const smallCardStyle: React.CSSProperties = {
  padding: 7,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11,
};

const incidentCardStyle = (escalated: boolean): React.CSSProperties => ({
  ...smallCardStyle,
  borderLeft: `3px solid ${escalated ? 'var(--red)' : 'var(--amber)'}`,
});

const rowTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'flex-start',
  lineHeight: 1.25,
};

const mutedTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 10,
  marginTop: 4,
};

const mutedMonoStyle: React.CSSProperties = {
  flexShrink: 0,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
};

const dangerTextStyle: React.CSSProperties = {
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  marginTop: 4,
};

const latestStyle: React.CSSProperties = {
  marginTop: 5,
  padding: '5px 6px',
  background: 'rgba(255,170,0,0.06)',
  border: '1px solid rgba(255,170,0,0.22)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--amber)',
  fontSize: 10,
  lineHeight: 1.3,
};

const tagRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 5,
};

const tagStyle: React.CSSProperties = {
  padding: '1px 4px',
  border: '1px solid var(--amber)',
  borderRadius: 2,
  color: 'var(--amber)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
};

const statusBadgeStyle: React.CSSProperties = {
  ...mutedMonoStyle,
  color: 'var(--green)',
};

const escalatedBadgeStyle: React.CSSProperties = {
  ...mutedMonoStyle,
  color: 'var(--red)',
};

const miniPrimaryStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  minHeight: 26,
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const buttonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 4,
  marginTop: 7,
};

const quickButtonStyle: React.CSSProperties = {
  minHeight: 26,
  padding: '4px 5px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 5,
  marginTop: 6,
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 27,
  background: 'transparent',
  border: '1px solid var(--amber)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--amber)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const injuryRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 112px',
  gap: 5,
  marginTop: 6,
};

const selectStyle: React.CSSProperties = {
  minWidth: 0,
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '5px 6px',
  fontSize: 10,
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 27,
  background: 'rgba(255,51,85,0.1)',
  border: '1px solid var(--red)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
};
