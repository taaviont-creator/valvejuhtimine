import React, { useState } from 'react';
import { Building, DecisionLogEntry, Incident, Officer, Warning } from '../../models';
import { IncidentCard } from '../incidents/IncidentCard';
import { WarningList } from '../warnings/WarningList';
import { DecisionLog } from '../log/DecisionLog';

type Tab = 'incidents' | 'warnings' | 'log';

interface Props {
  incidents: Incident[];
  officers: Officer[];
  buildings: Building[];
  warnings: Warning[];
  decisionLog: DecisionLogEntry[];
  isFacilitator: boolean;
  onEscalate: (incidentId: string) => void;
  onCloseIncident: (incidentId: string) => void;
}

export const RightSidebar: React.FC<Props> = ({
  incidents,
  officers,
  buildings,
  warnings,
  decisionLog,
  isFacilitator,
  onEscalate,
  onCloseIncident,
}) => {
  const [tab, setTab] = useState<Tab>('incidents');
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const closedIncidents = incidents.filter((incident) => incident.status === 'closed');

  return (
    <div style={sidebarStyle}>
      <div style={tabsStyle}>
        {(['incidents', 'warnings', 'log'] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={tabStyle(tab === item)}>
            {item === 'incidents' ? `Incidents${activeIncidents.length ? ` ${activeIncidents.length}` : ''}` : item === 'warnings' ? `Warnings${warnings.length ? ` ${warnings.length}` : ''}` : 'Log'}
          </button>
        ))}
      </div>

      <div style={contentStyle}>
        {tab === 'incidents' && (
          <>
            {incidents.length === 0 && <div style={emptyStyle}>No incidents yet</div>}
            {activeIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                officers={officers}
                buildingName={buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}
                isFacilitator={isFacilitator}
                onEscalate={() => onEscalate(incident.id)}
                onClose={() => onCloseIncident(incident.id)}
              />
            ))}
            {closedIncidents.length > 0 && (
              <>
                <div style={closedLabelStyle}>Closed ({closedIncidents.length})</div>
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
