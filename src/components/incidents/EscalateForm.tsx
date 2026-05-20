import React, { useState } from 'react';
import { ESCALATION_TEMPLATES, EscalationTemplate } from '../../data/incidentTemplates';
import { Incident, IncidentSeverity } from '../../models';

interface Props {
  incident: Incident;
  onSubmit: (
    text: string,
    severity: IncidentSeverity,
    requiredOfficers: number,
    requiresEscort: boolean,
    requiresTaser: boolean,
    externalEscortRequired: boolean
  ) => void;
  onCancel: () => void;
}

export const EscalateForm: React.FC<Props> = ({ incident, onSubmit, onCancel }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>(incident.severity);
  const [requiredOfficers, setRequiredOfficers] = useState(incident.requiredOfficers);
  const [requiresEscort, setRequiresEscort] = useState(incident.requiresEscortPermission);
  const [requiresTaser, setRequiresTaser] = useState(incident.requiresTaserPermission);
  const [externalEscortRequired, setExternalEscortRequired] = useState(incident.externalEscortRequired);

  const applyTemplate = (template: EscalationTemplate) => {
    setSelectedTemplateId(template.id);
    setText(template.text);
    setSeverity(template.severity ?? severity);
    setRequiredOfficers(template.requiredOfficers ?? requiredOfficers);
    setRequiresEscort(template.requiresEscortPermission ?? requiresEscort);
    setRequiresTaser(template.requiresTaserPermission ?? requiresTaser);
    setExternalEscortRequired(template.externalEscortRequired ?? externalEscortRequired);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={titleStyle}>Lisa eskalatsioon / olukorra muutus</div>
        <div style={metaStyle}>{incident.title}</div>

        <div style={templateGridStyle}>
          {ESCALATION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              style={templateButtonStyle(selectedTemplateId === template.id)}
            >
              {template.text}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Olukorra muutus / kommentaar</label>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} autoFocus style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />

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
          <button
            onClick={() => text.trim() && onSubmit(text.trim(), severity, requiredOfficers, requiresEscort, requiresTaser, externalEscortRequired)}
            disabled={!text.trim()}
            style={{ ...primaryStyle, opacity: text.trim() ? 1 : 0.45 }}
          >
            Salvesta eskalatsioon
          </button>
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
  border: '1px solid var(--red)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  width: 620,
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(255,51,85,0.2)',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--red)',
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  marginBottom: 18,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const templateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 7,
  marginBottom: 14,
};

const templateButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 44,
  padding: '8px 10px',
  background: active ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  color: active ? 'var(--red)' : 'var(--text-secondary)',
  textAlign: 'left',
  fontSize: 11,
  lineHeight: 1.25,
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
  background: 'var(--red)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  fontWeight: 700,
};

const secondaryStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
};
