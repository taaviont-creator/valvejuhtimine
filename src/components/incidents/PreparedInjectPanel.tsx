import React, { useMemo, useState } from 'react';
import { PREPARED_SCENARIO_INJECTS, PreparedScenarioInject, PreparedInjectStatus } from '../../data/incidentTemplates';
import { Building, Incident, IncidentSeverity } from '../../models';

interface Props {
  buildings: Building[];
  incidents: Incident[];
  activatedInjectIds?: string[];
  onActivateInject: (inject: PreparedScenarioInject, buildingId: string) => void;
  onActivateInjectForAllGroups?: (inject: PreparedScenarioInject, buildingId: string) => void;
  onApplyEscalation: (inject: PreparedScenarioInject, incidentId: string) => void;
  onApplyEscalationForAllGroups?: (inject: PreparedScenarioInject, incidentId: string) => void;
  canActivateAllGroups?: boolean;
}

const severityLabels: Record<IncidentSeverity, string> = {
  low: 'Madal',
  medium: 'Keskmine',
  high: 'Kõrge',
  critical: 'Kriitiline',
};

const statusLabels: Record<PreparedInjectStatus, string> = {
  draft: 'Mustand',
  ready: 'Valmis',
  activated: 'Käivitatud',
};

export const PreparedInjectPanel: React.FC<Props> = ({
  buildings,
  incidents,
  activatedInjectIds = [],
  onActivateInject,
  onActivateInjectForAllGroups,
  onApplyEscalation,
  onApplyEscalationForAllGroups,
  canActivateAllGroups = false,
}) => {
  const selectableBuildings = buildings.filter((building) => !building.isResourcePool);
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const initialDrafts = useMemo(
    () => Object.fromEntries(PREPARED_SCENARIO_INJECTS.map((inject) => [inject.id, inject])),
    []
  );
  const [drafts, setDrafts] = useState<Record<string, PreparedScenarioInject>>(initialDrafts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(activeIncidents[0]?.id ?? '');

  const selectedIncident = activeIncidents.find((incident) => incident.id === selectedIncidentId) ?? activeIncidents[0];

  const updateDraft = <K extends keyof PreparedScenarioInject>(id: string, key: K, value: PreparedScenarioInject[K]) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
        status: current[id].status === 'activated' ? 'activated' : 'draft',
      },
    }));
  };

  const activateInject = (inject: PreparedScenarioInject) => {
    const building = selectableBuildings.find((item) => item.name === inject.targetBuildingName) ?? selectableBuildings[0];
    if (!building) return;
    onActivateInject(inject, building.id);
    setDrafts((current) => ({ ...current, [inject.id]: { ...inject, status: 'activated' } }));
    setEditingId(null);
  };

  const activateInjectForAllGroups = (inject: PreparedScenarioInject) => {
    const building = selectableBuildings.find((item) => item.name === inject.targetBuildingName) ?? selectableBuildings[0];
    if (!building) return;
    onActivateInjectForAllGroups?.(inject, building.id);
    setDrafts((current) => ({ ...current, [inject.id]: { ...inject, status: 'activated' } }));
    setEditingId(null);
  };

  const applyEscalation = (inject: PreparedScenarioInject) => {
    if (!selectedIncident) return;
    onApplyEscalation(inject, selectedIncident.id);
    setDrafts((current) => ({ ...current, [inject.id]: { ...inject, status: 'activated' } }));
    setEditingId(null);
  };

  const applyEscalationForAllGroups = (inject: PreparedScenarioInject) => {
    if (!selectedIncident) return;
    onApplyEscalationForAllGroups?.(inject, selectedIncident.id);
    setDrafts((current) => ({ ...current, [inject.id]: { ...inject, status: 'activated' } }));
    setEditingId(null);
  };

  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <div style={panelTitleStyle}>Valmis sündmused</div>
          <div style={panelMetaStyle}>{canActivateAllGroups ? 'Ühine stsenaarium gruppidele' : 'Õppejõu ettevalmistatud olukorrad'}</div>
        </div>
        {activeIncidents.length > 0 && (
          <select
            value={selectedIncident?.id ?? ''}
            onChange={(event) => setSelectedIncidentId(event.target.value)}
            style={incidentSelectStyle}
            title="Eskalatsiooni siht"
          >
            {activeIncidents.map((incident) => (
              <option key={incident.id} value={incident.id}>{incident.title}</option>
            ))}
          </select>
        )}
      </div>

      <div style={cardListStyle}>
        {Object.values(drafts).map((draft) => {
          const inject = activatedInjectIds.includes(draft.id) ? { ...draft, status: 'activated' as const } : draft;
          const editing = editingId === inject.id;
          return (
            <article key={inject.id} style={cardStyle(inject.status)}>
              <div style={cardTopStyle}>
                <strong style={titleStyle}>{inject.title}</strong>
                <span style={statusStyle(inject.status)}>{statusLabels[inject.status]}</span>
              </div>

              {editing ? (
                <InjectEditor
                  inject={inject}
                  buildings={selectableBuildings}
                  onChange={updateDraft}
                />
              ) : (
                <>
                  <div style={targetStyle}>{inject.targetBuildingName}</div>
                  <p style={descriptionStyle}>{inject.description}</p>
                  <div style={tagRowStyle}>
                    <Tag text={`${inject.requiredOfficers} ametnikku`} color="var(--cyan)" />
                    <Tag text={severityLabels[inject.severity]} color={inject.severity === 'critical' ? 'var(--red)' : inject.severity === 'high' ? '#ff7722' : 'var(--amber)'} />
                    <Tag text={inject.requiresEscortPermission ? 'Saateõigus' : 'Saateõigust ei nõua'} color={inject.requiresEscortPermission ? 'var(--green)' : 'var(--text-muted)'} />
                    <Tag text={inject.requiresTaserPermission ? 'EŠR õigus' : 'EŠR ei nõua'} color={inject.requiresTaserPermission ? 'var(--amber)' : 'var(--text-muted)'} />
                  </div>
                  {inject.escalationText && <div style={escalationTextStyle}>Eskalatsioon: {inject.escalationText}</div>}
                </>
              )}

              <div style={buttonRowStyle}>
                <button onClick={() => setEditingId(editing ? null : inject.id)} style={secondaryButtonStyle}>
                  {editing ? 'Sulge' : 'Muuda'}
                </button>
                {canActivateAllGroups && (
                  <button onClick={() => activateInjectForAllGroups(inject)} style={primaryButtonStyle}>
                    Käivita kõigile gruppidele
                  </button>
                )}
                <button onClick={() => activateInject(inject)} style={canActivateAllGroups ? secondaryButtonStyle : primaryButtonStyle}>
                  {canActivateAllGroups ? 'Käivita ainult valitud grupis' : 'Käivita sündmus'}
                </button>
                {inject.canEscalate && (
                  <>
                    {canActivateAllGroups && (
                      <button
                        onClick={() => applyEscalationForAllGroups(inject)}
                        disabled={!selectedIncident}
                        style={{ ...secondaryButtonStyle, color: selectedIncident ? 'var(--amber)' : 'var(--text-muted)', borderColor: selectedIncident ? 'var(--amber)' : 'var(--border)', opacity: selectedIncident ? 1 : 0.45 }}
                      >
                        Saada eskalatsioon kõigile gruppidele
                      </button>
                    )}
                    <button
                      onClick={() => applyEscalation(inject)}
                      disabled={!selectedIncident}
                      style={{ ...secondaryButtonStyle, color: selectedIncident ? 'var(--amber)' : 'var(--text-muted)', borderColor: selectedIncident ? 'var(--amber)' : 'var(--border)', opacity: selectedIncident ? 1 : 0.45 }}
                    >
                      {canActivateAllGroups ? 'Lisa eskalatsioon sellele grupile' : 'Lisa eskalatsioon'}
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const InjectEditor: React.FC<{
  inject: PreparedScenarioInject;
  buildings: Building[];
  onChange: <K extends keyof PreparedScenarioInject>(id: string, key: K, value: PreparedScenarioInject[K]) => void;
}> = ({ inject, buildings, onChange }) => (
  <div style={editorStyle}>
    <input value={inject.title} onChange={(event) => onChange(inject.id, 'title', event.target.value)} style={inputStyle} />
    <select value={inject.targetBuildingName} onChange={(event) => onChange(inject.id, 'targetBuildingName', event.target.value)} style={inputStyle}>
      {buildings.map((building) => (
        <option key={building.id} value={building.name}>{building.name}</option>
      ))}
    </select>
    <textarea value={inject.description} onChange={(event) => onChange(inject.id, 'description', event.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <input type="number" min={1} max={20} value={inject.requiredOfficers} onChange={(event) => onChange(inject.id, 'requiredOfficers', Number(event.target.value))} style={inputStyle} />
      <select value={inject.severity} onChange={(event) => onChange(inject.id, 'severity', event.target.value as IncidentSeverity)} style={inputStyle}>
        <option value="low">Madal</option>
        <option value="medium">Keskmine</option>
        <option value="high">Kõrge</option>
        <option value="critical">Kriitiline</option>
      </select>
    </div>
    <label style={checkStyle}><input type="checkbox" checked={inject.requiresEscortPermission} onChange={(event) => onChange(inject.id, 'requiresEscortPermission', event.target.checked)} /> Nõuab saateõigust</label>
    <label style={checkStyle}><input type="checkbox" checked={inject.requiresTaserPermission} onChange={(event) => onChange(inject.id, 'requiresTaserPermission', event.target.checked)} /> Nõuab EŠR õigust</label>
  </div>
);

const Tag: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span style={{ ...tagStyle, color, borderColor: color, background: `${color}14` }}>{text}</span>
);

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
  marginBottom: 8,
  boxShadow: 'var(--shadow-card)',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: 9,
  borderBottom: '1px solid var(--border)',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 6,
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-primary)',
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const panelMetaStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-secondary)',
};

const incidentSelectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '5px 7px',
  fontSize: 11,
};

const cardListStyle: React.CSSProperties = {
  maxHeight: 360,
  overflowY: 'auto',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const cardStyle = (status: PreparedInjectStatus): React.CSSProperties => ({
  padding: 9,
  background: '#ffffff',
  border: `1px solid ${status === 'activated' ? 'var(--green-dim)' : 'var(--border)'}`,
  borderLeft: `3px solid ${status === 'activated' ? 'var(--green)' : 'var(--cyan)'}`,
  borderRadius: 'var(--radius-sm)',
});

const cardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.3,
  color: 'var(--text-primary)',
};

const statusStyle = (status: PreparedInjectStatus): React.CSSProperties => ({
  flexShrink: 0,
  color: status === 'activated' ? 'var(--green)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
  fontWeight: 800,
});

const targetStyle: React.CSSProperties = {
  marginTop: 3,
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-secondary)',
};

const descriptionStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--text-primary)',
  fontSize: 11.5,
  lineHeight: 1.4,
};

const tagRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 6,
};

const tagStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '2px 5px',
  textTransform: 'uppercase',
};

const escalationTextStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '6px 7px',
  background: 'rgba(166,111,31,0.07)',
  border: '1px solid rgba(166,111,31,0.20)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--amber)',
  fontSize: 10,
  lineHeight: 1.3,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
  marginTop: 7,
};

const primaryButtonStyle: React.CSSProperties = {
  flex: '1 1 94px',
  minHeight: 28,
  background: 'rgba(34,121,157,0.09)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: '1 1 72px',
  minHeight: 28,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  fontWeight: 700,
};

const editorStyle: React.CSSProperties = {
  marginTop: 7,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '6px 7px',
  fontSize: 11,
};

const checkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--text-secondary)',
  fontSize: 11,
};
