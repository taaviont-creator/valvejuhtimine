import React, { useState } from 'react';
import { INCIDENT_TEMPLATES, IncidentTemplate } from '../../data/incidentTemplates';
import { Building, IncidentSeverity } from '../../models';

interface Props {
  buildings: Building[];
  initialBuildingId: string;
  onSubmit: (
    buildingId: string,
    title: string,
    description: string,
    severity: IncidentSeverity,
    requiredOfficers: number,
    requiresEscort: boolean,
    requiresTaser: boolean,
    externalEscortRequired: boolean
  ) => void;
  onSubmitAllGroups?: (
    buildingId: string,
    title: string,
    description: string,
    severity: IncidentSeverity,
    requiredOfficers: number,
    requiresEscort: boolean,
    requiresTaser: boolean,
    externalEscortRequired: boolean
  ) => void;
  selectedGroupName?: string;
  onCancel: () => void;
}

export const IncidentForm: React.FC<Props> = ({ buildings, initialBuildingId, onSubmit, onSubmitAllGroups, selectedGroupName, onCancel }) => {
  const selectableBuildings = buildings.filter((building) => !building.isResourcePool);
  const [buildingId, setBuildingId] = useState(initialBuildingId || selectableBuildings[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [requiredOfficers, setRequiredOfficers] = useState(2);
  const [requiresEscort, setRequiresEscort] = useState(false);
  const [requiresTaser, setRequiresTaser] = useState(false);
  const [externalEscortRequired, setExternalEscortRequired] = useState(false);

  const applyTemplate = (template: IncidentTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description);
    setRequiredOfficers(template.requiredOfficers);
    setRequiresEscort(template.requiresEscortPermission);
    setRequiresTaser(template.requiresTaserPermission);
    setExternalEscortRequired(template.externalEscortRequired);
    setSeverity(template.severity);
  };

  const submit = () => {
    if (!buildingId || !title.trim()) return;
    onSubmit(buildingId, title.trim(), description.trim(), severity, requiredOfficers, requiresEscort, requiresTaser, externalEscortRequired);
  };
  const submitAllGroups = () => {
    if (!buildingId || !title.trim() || !onSubmitAllGroups) return;
    onSubmitAllGroups(buildingId, title.trim(), description.trim(), severity, requiredOfficers, requiresEscort, requiresTaser, externalEscortRequired);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={titleStyle}>Õppejõu sündmuse mall</div>
        <div style={metaStyle}>Vali üksus, vali mall, muuda detaile ja käivita sündmus</div>
        {onSubmitAllGroups && (
          <div style={classroomNoteStyle}>
            <strong>Valitud grupp:</strong> {selectedGroupName ?? 'praegune grupp'}. Vali, kas sündmus lisatakse ainult sellele grupile või saadetakse kõigile gruppidele.
          </div>
        )}

        <FormField label="Üksus / hoone">
          <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} style={inputStyle}>
            {selectableBuildings.map((building) => (
              <option key={building.id} value={building.id}>{building.name}</option>
            ))}
          </select>
        </FormField>

        <div style={templateGridStyle}>
          {INCIDENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              style={templateButtonStyle(selectedTemplateId === template.id)}
            >
              <strong>{template.title}</strong>
              <span>{template.requiredOfficers} ametnikku | {severityLabels[template.severity]}</span>
            </button>
          ))}
        </div>

        <FormField label="Pealkiri">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Sündmuse pealkiri..." autoFocus style={inputStyle} />
        </FormField>

        <FormField label="Kirjeldus">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
          <FormField label="Raskusaste">
            <select value={severity} onChange={(event) => setSeverity(event.target.value as IncidentSeverity)} style={inputStyle}>
              <option value="low">Madal</option>
              <option value="medium">Keskmine</option>
              <option value="high">Kõrge</option>
              <option value="critical">Kriitiline</option>
            </select>
          </FormField>

          <FormField label="Vajalik ametnike arv">
            <input type="number" min={1} max={20} value={requiredOfficers} onChange={(event) => setRequiredOfficers(Number(event.target.value))} style={inputStyle} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <CheckBox checked={requiresEscort} onChange={setRequiresEscort} label="Nõuab saateõigust" />
          <CheckBox checked={requiresTaser} onChange={setRequiresTaser} label="Nõuab elektrišokirelva õigust" />
          <CheckBox checked={externalEscortRequired} onChange={setExternalEscortRequired} label="Vanglaväline väljaviimine" />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} disabled={!title.trim() || !buildingId} style={{ ...(onSubmitAllGroups ? secondaryActionStyle : primaryStyle), opacity: title.trim() && buildingId ? 1 : 0.45 }}>
            {onSubmitAllGroups ? 'Lisa ainult sellele grupile' : 'Käivita sündmus'}
          </button>
          {onSubmitAllGroups && (
            <button onClick={submitAllGroups} disabled={!title.trim() || !buildingId} style={{ ...primaryStyle, opacity: title.trim() && buildingId ? 1 : 0.45 }}>
              Saada kõigile gruppidele
            </button>
          )}
          <button onClick={onCancel} style={secondaryStyle}>Tühista</button>
        </div>
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);

const CheckBox: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: checked ? 'var(--green)' : 'var(--text-secondary)', fontSize: 12 }}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    {label}
  </label>
);

const severityLabels: Record<IncidentSeverity, string> = {
  low: 'madal',
  medium: 'keskmine',
  high: 'kõrge',
  critical: 'kriitiline',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  width: 620,
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--cyan)',
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  marginBottom: 18,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const classroomNoteStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: '8px 10px',
  background: 'rgba(34,121,157,0.08)',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const templateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 7,
  marginBottom: 14,
};

const templateButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 58,
  padding: '8px 10px',
  background: active ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 11,
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const primaryStyle: React.CSSProperties = {
  flex: 1,
  padding: 9,
  background: 'var(--cyan)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#001017',
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  fontWeight: 700,
};

const secondaryActionStyle: React.CSSProperties = {
  ...primaryStyle,
  background: 'transparent',
  border: '1px solid var(--cyan)',
  color: 'var(--cyan)',
};

const secondaryStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
};
