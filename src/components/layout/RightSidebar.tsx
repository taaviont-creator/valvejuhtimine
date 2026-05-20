import React, { useState } from 'react';
import { Building, DecisionLogEntry, Incident, Officer, Warning } from '../../models';
import { IncidentCard } from '../incidents/IncidentCard';
import { WarningList } from '../warnings/WarningList';
import { DecisionLog } from '../log/DecisionLog';

type Tab = 'incidents' | 'warnings' | 'log';
const actorLabels: Record<string, string> = {
  teacher: 'õppejõud',
  student: 'korrapidaja',
  system: 'süsteem',
};

interface Props {
  incidents: Incident[];
  officers: Officer[];
  buildings: Building[];
  warnings: Warning[];
  decisionLog: DecisionLogEntry[];
  isFacilitator: boolean;
  onCreateIncident: () => void;
  onEscalate: (incidentId: string) => void;
  onCloseIncident: (incidentId: string) => void;
  onOfficerDropToIncident?: (officerId: string, incidentId: string) => void;
}

export const RightSidebar: React.FC<Props> = ({
  incidents,
  officers,
  buildings,
  warnings,
  decisionLog,
  isFacilitator,
  onCreateIncident,
  onEscalate,
  onCloseIncident,
  onOfficerDropToIncident,
}) => {
  const [tab, setTab] = useState<Tab>('incidents');
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const closedIncidents = incidents.filter((incident) => incident.status === 'closed');
  const latestAction = decisionLog.find((entry) => entry.actor !== 'system') ?? decisionLog[0];
  const closeIncident = (incident: Incident) => {
    const confirmed = window.confirm(
      `Sündmuse lõpetamisel vabastatakse sellele määratud ametnikud.\n\nVaikimisi: saada ametnikud tagasi määratud üksusesse.\n\nLõpeta sündmus "${incident.title}"?`
    );
    if (confirmed) onCloseIncident(incident.id);
  };

  return (
    <div style={sidebarStyle}>
      <div style={statusPanelStyle}>
        <div style={panelLabelStyle}>{isFacilitator ? 'Korrapidaja tegevus' : 'Olukorra staatus'}</div>
        {latestAction ? (
          <div style={latestActionStyle}>
            <strong>{actorLabels[latestAction.actor] ?? latestAction.actor}</strong> {latestAction.text}
          </div>
        ) : (
          <div style={mutedTextStyle}>Tegevusi pole veel logitud</div>
        )}
        {warnings.length > 0 && (
          <div style={warningSummaryStyle}>
            {warnings.length} aktiivne hoiatus{warnings.length === 1 ? '' : 't'} - ava detailideks Hoiatused
          </div>
        )}
      </div>

      <div style={tabsStyle}>
        {(['incidents', 'warnings', 'log'] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={tabStyle(tab === item)}>
            {item === 'incidents' ? `Sündmused${activeIncidents.length ? ` ${activeIncidents.length}` : ''}` : item === 'warnings' ? `Hoiatused${warnings.length ? ` ${warnings.length}` : ''}` : 'Otsuste logi'}
          </button>
        ))}
      </div>

      <div style={contentStyle}>
        {tab === 'incidents' && (
          <>
            {isFacilitator && (
              <button onClick={onCreateIncident} style={createIncidentButtonStyle}>
                Lisa sündmus
              </button>
            )}
            {incidents.length === 0 && <div style={emptyStyle}>Sündmusi pole veel</div>}
            {activeIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                officers={officers}
                buildingName={buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}
                isFacilitator={isFacilitator}
                onEscalate={() => onEscalate(incident.id)}
                onClose={() => closeIncident(incident)}
                onOfficerDrop={(officerId) => onOfficerDropToIncident?.(officerId, incident.id)}
              />
            ))}
            {closedIncidents.length > 0 && (
              <>
                <div style={closedLabelStyle}>Lõpetatud ({closedIncidents.length})</div>
                {closedIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    officers={officers}
                    buildingName={buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}
                    isFacilitator={isFacilitator}
                  />
                ))}
              </>
            )}
          </>
        )}
        {tab === 'warnings' && <WarningList warnings={warnings} />}
        {tab === 'log' && <DecisionLog entries={decisionLog} />}
      </div>
    </div>
  );
};

const sidebarStyle: React.CSSProperties = {
  width: 280,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-panel)',
  borderLeft: '1px solid var(--border)',
  overflow: 'hidden',
  flexShrink: 0,
};

const statusPanelStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const panelLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

const latestActionStyle: React.CSSProperties = {
  padding: '7px 8px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 11,
  lineHeight: 1.35,
};

const mutedTextStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
};

const warningSummaryStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: 'rgba(255,51,85,0.08)',
  border: '1px solid rgba(255,51,85,0.35)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  lineHeight: 1.3,
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '9px 4px',
  background: 'none',
  border: 'none',
  borderBottom: `2px solid ${active ? 'var(--cyan)' : 'transparent'}`,
  color: active ? 'var(--cyan)' : 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  padding: '8px 0',
};

const closedLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1,
  marginTop: 8,
  marginBottom: 2,
  textTransform: 'uppercase',
};

const createIncidentButtonStyle: React.CSSProperties = {
  minHeight: 34,
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};
