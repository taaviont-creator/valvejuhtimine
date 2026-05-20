import React, { useState } from 'react';
import { IncidentSeverity } from '../../models';

interface Props {
  buildingName: string;
  onSubmit: (
    title: string,
    description: string,
    severity: IncidentSeverity,
    requiredOfficers: number,
    requiresEscort: boolean,
    requiresTaser: boolean,
    externalEscortRequired: boolean
  ) => void;
  onCancel: () => void;
}

export const IncidentForm: React.FC<Props> = ({ buildingName, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [requiredOfficers, setRequiredOfficers] = useState(2);
  const [requiresEscort, setRequiresEscort] = useState(false);
  const [requiresTaser, setRequiresTaser] = useState(false);
  const [externalEscortRequired, setExternalEscortRequired] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), severity, requiredOfficers, requiresEscort, requiresTaser, externalEscortRequired);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={titleStyle}>Create incident</div>
        <div style={metaStyle}>{buildingName}</div>

        <FormField label="Title">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Fight, refusal, medical escort..." autoFocus style={inputStyle} />
        </FormField>

        <FormField label="Description">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
          <FormField label="Severity">
            <select value={severity} onChange={(event) => setSeverity(event.target.value as IncidentSeverity)} style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FormField>

          <FormField label="Officers">
            <input type="number" min={1} max={20} value={requiredOfficers} onChange={(event) => setRequiredOfficers(Number(event.target.value))} style={inputStyle} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <CheckBox checked={requiresEscort} onChange={setRequiresEscort} label="Escort permission required" />
          <CheckBox checked={requiresTaser} onChange={setRequiresTaser} label="Taser permission required" />
          <CheckBox checked={externalEscortRequired} onChange={setExternalEscortRequired} label="External escort required" />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} disabled={!title.trim()} style={{ ...primaryStyle, opacity: title.trim() ? 1 : 0.45 }}>Add incident</button>
          <button onClick={onCancel} style={secondaryStyle}>Cancel</button>
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
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  width: 460,
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

const secondaryStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
};
