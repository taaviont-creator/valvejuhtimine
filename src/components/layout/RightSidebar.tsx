import React, { useState } from 'react';
import { Building, DecisionLogEntry, Incident, Officer, Warning } from '../../models';
import { PreparedScenarioInject } from '../../data/incidentTemplates';
import { IncidentCard } from '../incidents/IncidentCard';
import { PreparedInjectPanel } from '../incidents/PreparedInjectPanel';
import { OverviewEscalationAction, ScenarioOverviewPanel } from '../incidents/ScenarioOverviewPanel';
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
  activatedPreparedInjectIds: string[];
  onActivatePreparedInject?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivatePreparedInjectForAllGroups?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivateOverviewInject?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivateOverviewInjectForAllGroups?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onApplyPreparedEscalation?: (inject: PreparedScenarioInject, incidentId: string) => void;
  canActivateAllGroups?: boolean;
  onQuickOverviewEscalation?: (incidentId: string, action: OverviewEscalationAction) => void;
  onOverviewOfficerInjured?: (incidentId: string, officerId: string) => void;
  onOverviewCloseIncident?: (incidentId: string) => void;
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
  activatedPreparedInjectIds,
  onActivatePreparedInject,
  onActivatePreparedInjectForAllGroups,
  onActivateOverviewInject,
  onActivateOverviewInjectForAllGroups,
  onApplyPreparedEscalation,
  canActivateAllGroups = false,
  onQuickOverviewEscalation,
  onOverviewOfficerInjured,
  onOverviewCloseIncident,
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

  if (!isFacilitator) {
    return (
      <div style={sidebarStyle}>
        <div style={studentHeaderStyle}>
          <div style={panelLabelStyle}>Korrapidaja töölaud</div>
          <div style={studentSummaryStyle}>
            <span>Aktiivsed sündmused: <strong>{activeIncidents.length}</strong></span>
            <span>Hoiatused: <strong>{warnings.length}</strong></span>
          </div>
        </div>

        <div style={studentContentStyle}>
          <StudentSection title="Aktiivsed sündmused" count={activeIncidents.length}>
            {activeIncidents.length === 0 ? (
              <div style={emptyStyle}>Aktiivseid sündmusi pole</div>
            ) : (
              activeIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  officers={officers}
                  buildingName={buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}
                  isFacilitator={false}
                  onOfficerDrop={(officerId) => onOfficerDropToIncident?.(officerId, incident.id)}
                />
              ))
            )}
          </StudentSection>

          <StudentSection title="Hoiatused" count={warnings.length} prominent={warnings.length > 0}>
            <WarningList warnings={warnings} />
          </StudentSection>

          <StudentSection title="Otsuste logi" count={Math.min(decisionLog.length, 8)}>
            <DecisionLog entries={decisionLog.slice(0, 8)} />
          </StudentSection>
        </div>
      </div>
    );
  }

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
              <>
                <ScenarioOverviewPanel
                  buildings={buildings}
                  incidents={incidents}
                  officers={officers}
                  warnings={warnings}
                  decisionLog={decisionLog}
                  activatedInjectIds={activatedPreparedInjectIds}
                  onActivateInject={(inject, buildingId) => onActivateOverviewInject?.(inject, buildingId)}
                  onActivateInjectForAllGroups={(inject, buildingId) => onActivateOverviewInjectForAllGroups?.(inject, buildingId)}
                  canActivateAllGroups={canActivateAllGroups}
                  onOpenEscalation={onEscalate}
                  onQuickEscalation={(incidentId, action) => onQuickOverviewEscalation?.(incidentId, action)}
                  onMarkOfficerInjured={(incidentId, officerId) => onOverviewOfficerInjured?.(incidentId, officerId)}
                  onCloseIncident={(incidentId) => onOverviewCloseIncident?.(incidentId)}
                />
                <PreparedInjectPanel
                  buildings={buildings}
                  incidents={incidents}
                  activatedInjectIds={activatedPreparedInjectIds}
                  onActivateInject={(inject, buildingId) => onActivatePreparedInject?.(inject, buildingId)}
                  onActivateInjectForAllGroups={(inject, buildingId) => onActivatePreparedInjectForAllGroups?.(inject, buildingId)}
                  canActivateAllGroups={canActivateAllGroups}
                  onApplyEscalation={(inject, incidentId) => onApplyPreparedEscalation?.(inject, incidentId)}
                />
                <button onClick={onCreateIncident} style={createIncidentButtonStyle}>
                  Lisa sündmus
                </button>
              </>
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

const StudentSection: React.FC<{ title: string; count: number; prominent?: boolean; children: React.ReactNode }> = ({
  title,
  count,
  prominent = false,
  children,
}) => (
  <section style={studentSectionStyle(prominent)}>
    <div style={studentSectionTitleStyle}>
      <span>{title}</span>
      <strong>{count}</strong>
    </div>
    {children}
  </section>
);

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
  padding: 10,
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const studentHeaderStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const studentSummaryStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const panelLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

const latestActionStyle: React.CSSProperties = {
  padding: '9px 10px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  lineHeight: 1.45,
};

const mutedTextStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
};

const warningSummaryStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'rgba(185,67,77,0.08)',
  border: '1px solid rgba(185,67,77,0.28)',
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
  padding: '10px 4px',
  background: active ? 'var(--bg-card)' : 'transparent',
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
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const studentContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const studentSectionStyle = (prominent: boolean): React.CSSProperties => ({
  border: `1px solid ${prominent ? 'rgba(185,67,77,0.28)' : 'var(--border)'}`,
  borderLeft: `3px solid ${prominent ? 'var(--red)' : 'var(--cyan-dim)'}`,
  borderRadius: 'var(--radius-sm)',
  background: prominent ? 'rgba(185,67,77,0.055)' : 'var(--bg-card)',
  padding: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

const studentSectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: 1,
  textTransform: 'uppercase',
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
  background: 'rgba(34,121,157,0.09)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};
