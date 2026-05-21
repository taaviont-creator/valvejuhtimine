import React, { useState } from 'react';
import { Building, DecisionLogEntry, Incident, Officer, Warning } from '../../models';
import { PreparedScenarioInject } from '../../data/incidentTemplates';
import { IncidentCard } from '../incidents/IncidentCard';
import { PreparedInjectPanel } from '../incidents/PreparedInjectPanel';
import { OverviewEscalationAction, ScenarioOverviewPanel } from '../incidents/ScenarioOverviewPanel';
import { WarningList } from '../warnings/WarningList';
import { DecisionLog } from '../log/DecisionLog';
import { getIncidentOfficers } from '../../lib/calculations';

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
  onAddSceneAssessment: (incidentId: string) => void;
  onEscalate: (incidentId: string) => void;
  onCloseIncident: (incidentId: string) => void;
  onOfficerDropToIncident?: (officerId: string, incidentId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
  activatedPreparedInjectIds: string[];
  onActivatePreparedInject?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivatePreparedInjectForAllGroups?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivateOverviewInject?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivateOverviewInjectForAllGroups?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onApplyPreparedEscalation?: (inject: PreparedScenarioInject, incidentId: string) => void;
  onApplyPreparedEscalationForAllGroups?: (inject: PreparedScenarioInject, incidentId: string) => void;
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
  onAddSceneAssessment,
  onEscalate,
  onCloseIncident,
  onOfficerDropToIncident,
  onSelectOfficer,
  activatedPreparedInjectIds,
  onActivatePreparedInject,
  onActivatePreparedInjectForAllGroups,
  onActivateOverviewInject,
  onActivateOverviewInjectForAllGroups,
  onApplyPreparedEscalation,
  onApplyPreparedEscalationForAllGroups,
  canActivateAllGroups = false,
  onQuickOverviewEscalation,
  onOverviewOfficerInjured,
  onOverviewCloseIncident,
}) => {
  const [tab, setTab] = useState<Tab>('incidents');
  const [studentGuideOpen, setStudentGuideOpen] = useState(true);
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const closedIncidents = incidents.filter((incident) => incident.status === 'closed');
  const latestAction = decisionLog.find((entry) => entry.actor !== 'system') ?? decisionLog[0];

  const closeIncident = (incident: Incident) => {
    const confirmed = window.confirm(
      `Sündmuse lõpetamisel vabastatakse sellele määratud ametnikud.\n\nVaikimisi: saada ametnikud tagasi määratud üksusesse.\n\nLõpeta sündmus "${incident.title}"?`
    );
    if (confirmed) onCloseIncident(incident.id);
  };

  const renderIncidentCard = (incident: Incident, facilitator = isFacilitator) => (
    <IncidentCard
      key={incident.id}
      incident={incident}
      officers={officers}
      buildingName={buildings.find((building) => building.id === incident.buildingId)?.name ?? ''}
      isFacilitator={facilitator}
      onAddSceneAssessment={facilitator ? () => onAddSceneAssessment(incident.id) : undefined}
      onEscalate={facilitator ? () => onEscalate(incident.id) : undefined}
      onClose={facilitator ? () => closeIncident(incident) : undefined}
      onOfficerDrop={incident.status !== 'closed' ? (officerId) => onOfficerDropToIncident?.(officerId, incident.id) : undefined}
      onSelectOfficer={onSelectOfficer}
    />
  );

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
          <StudentSection title="Aktiivsed sündmused" count={activeIncidents.length} prominent={activeIncidents.length > 0}>
            {activeIncidents.length === 0 ? (
              <div style={emptyStyle}>Aktiivseid sündmusi pole</div>
            ) : (
              activeIncidents.map((incident) => renderIncidentCard(incident, false))
            )}
          </StudentSection>

          <StudentGuidancePanel
            open={studentGuideOpen}
            onToggle={() => setStudentGuideOpen((value) => !value)}
            activeIncidents={activeIncidents}
            officers={officers}
            warningCount={warnings.length}
          />

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
        <div style={panelLabelStyle}>Õppejõu töölaud</div>
        {latestAction ? (
          <div style={latestActionStyle}>
            <strong>{actorLabels[latestAction.actor] ?? latestAction.actor}</strong> {latestAction.text}
          </div>
        ) : (
          <div style={mutedTextStyle}>Tegevusi pole veel logitud</div>
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
            <SidebarSection title="Aktiivsed sündmused" count={activeIncidents.length} priority>
              {activeIncidents.length === 0 ? (
                <div style={emptyStyle}>Aktiivseid sündmusi pole</div>
              ) : (
                activeIncidents.map((incident) => renderIncidentCard(incident))
              )}
            </SidebarSection>

            <SidebarSection title="Hoiatused" count={warnings.length} warning={warnings.length > 0}>
              <WarningList warnings={warnings} />
            </SidebarSection>

            <SidebarSection title="Stsenaariumi tööriistad">
              <button onClick={onCreateIncident} style={createIncidentButtonStyle}>
                {canActivateAllGroups ? 'Lisa / saada situatsioon' : 'Lisa sündmus'}
              </button>
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
                onApplyEscalationForAllGroups={(inject, incidentId) => onApplyPreparedEscalationForAllGroups?.(inject, incidentId)}
              />
            </SidebarSection>

            {closedIncidents.length > 0 && (
              <SidebarSection title="Lõpetatud sündmused" count={closedIncidents.length}>
                {closedIncidents.map((incident) => renderIncidentCard(incident))}
              </SidebarSection>
            )}
          </>
        )}
        {tab === 'warnings' && <WarningList warnings={warnings} />}
        {tab === 'log' && <DecisionLog entries={decisionLog} />}
      </div>
    </div>
  );
};

const StudentGuidancePanel: React.FC<{
  open: boolean;
  onToggle: () => void;
  activeIncidents: Incident[];
  officers: Officer[];
  warningCount: number;
}> = ({ open, onToggle, activeIncidents, officers, warningCount }) => {
  const hasMissingIncidentResources = activeIncidents.some(
    (incident) => getIncidentOfficers(incident, officers).length < incident.requiredOfficers
  );
  const nextHint =
    activeIncidents.length === 0
      ? 'Oota õppejõu järgmist sündmust.'
      : hasMissingIncidentResources
      ? 'Vali ametnik ja määra ta sündmusele.'
      : warningCount > 0
      ? 'Kontrolli hoiatusi enne järgmise ametniku suunamist.'
      : 'Jälgi olukorda ja hoia üksuste miinimumkoosseisu.';

  return (
    <section style={guidanceStyle}>
      <button onClick={onToggle} style={guidanceHeaderStyle}>
        <span>Korrapidaja tegevus</span>
        <span>{open ? 'Peida juhend' : 'Näita juhendit'}</span>
      </button>
      {open && (
        <div style={guidanceBodyStyle}>
          <ol style={guidanceListStyle}>
            <li>Vaata aktiivset sündmust.</li>
            <li>Vali sobiv ametnik kaardilt või nimekirjast.</li>
            <li>Kontrolli õiguseid: saateõigus ja elektrišokirelva õigus.</li>
            <li>Suuna ametnik sündmusele, üksusesse või saatebussile.</li>
            <li>Jälgi hoiatusi ja üksuste miinimumkoosseisu.</li>
            <li>Lohista ametnik hoone sees olevale sündmuse kastile või vali ametniku infopaneelist sündmus.</li>
          </ol>
          <div style={guidanceHintStyle}>{nextHint}</div>
        </div>
      )}
    </section>
  );
};

const StudentSection: React.FC<{ title: string; count: number; prominent?: boolean; children: React.ReactNode }> = ({
  title,
  count,
  prominent = false,
  children,
}) => (
  <section style={studentSectionStyle(prominent)}>
    <div style={sectionTitleRowStyle(prominent)}>
      <span>{title}</span>
      <strong>{count}</strong>
    </div>
    {children}
  </section>
);

const SidebarSection: React.FC<{ title: string; count?: number; priority?: boolean; warning?: boolean; children: React.ReactNode }> = ({
  title,
  count,
  priority = false,
  warning = false,
  children,
}) => (
  <section style={teacherSectionStyle(priority, warning)}>
    <div style={sectionTitleRowStyle(priority || warning)}>
      <span>{title}</span>
      {count !== undefined && <strong>{count}</strong>}
    </div>
    <div style={sectionBodyStyle}>{children}</div>
  </section>
);

const sidebarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#eef3f8',
  borderLeft: '1px solid var(--border-bright)',
  overflow: 'hidden',
  flexShrink: 0,
};

const statusPanelStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid var(--border-bright)',
  background: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const studentHeaderStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid var(--border-bright)',
  background: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const studentSummaryStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const panelLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-secondary)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  fontWeight: 700,
};

const latestActionStyle: React.CSSProperties = {
  padding: '9px 10px',
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
  lineHeight: 1.45,
};

const mutedTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border-bright)',
  background: '#f8fafc',
  flexShrink: 0,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 4px',
  background: active ? '#ffffff' : 'transparent',
  border: 'none',
  borderBottom: `2px solid ${active ? 'var(--cyan)' : 'transparent'}`,
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

const contentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const studentContentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const teacherSectionStyle = (priority: boolean, warning: boolean): React.CSSProperties => ({
  border: `1px solid ${warning ? 'rgba(185,67,77,0.34)' : priority ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderLeft: `3px solid ${warning ? 'var(--red)' : priority ? 'var(--cyan)' : 'var(--border-bright)'}`,
  borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
  padding: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  boxShadow: priority ? '0 4px 14px rgba(31,45,61,0.10)' : 'var(--shadow-card)',
});

const studentSectionStyle = (prominent: boolean): React.CSSProperties => ({
  border: `1px solid ${prominent ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderLeft: `3px solid ${prominent ? 'var(--cyan)' : 'var(--border-bright)'}`,
  borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
  padding: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  boxShadow: prominent ? '0 4px 14px rgba(31,45,61,0.10)' : 'var(--shadow-card)',
});

const sectionTitleRowStyle = (prominent: boolean): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: prominent ? 'var(--text-primary)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
});

const sectionBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const guidanceStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
  overflow: 'hidden',
};

const guidanceHeaderStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 32,
  padding: '8px 9px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  background: '#f2f6fa',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const guidanceBodyStyle: React.CSSProperties = {
  padding: '10px',
  color: 'var(--text-primary)',
  fontSize: 12,
  lineHeight: 1.4,
};

const guidanceListStyle: React.CSSProperties = {
  marginLeft: 16,
  marginBottom: 8,
};

const guidanceHintStyle: React.CSSProperties = {
  padding: '7px 8px',
  background: '#f8fafc',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  lineHeight: 1.35,
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--text-secondary)',
  padding: '7px 0',
};

const createIncidentButtonStyle: React.CSSProperties = {
  minHeight: 34,
  background: 'rgba(34,121,157,0.09)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};
