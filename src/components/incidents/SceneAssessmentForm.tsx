import React, { useState } from 'react';
import { Incident, IncidentAssessmentStatus } from '../../models';

export interface SceneAssessmentPayload {
  text: string;
  assessmentStatus: IncidentAssessmentStatus;
  requiredOfficers?: number;
  requiresEscortPermission: boolean;
  requiresTaserPermission: boolean;
  requiresSeniorOfficer: boolean;
  externalEscortRequired: boolean;
  medicalNote?: string;
}

interface Props {
  incident: Incident;
  onSubmit: (assessment: SceneAssessmentPayload) => void;
  onSubmitAllGroups?: (assessment: SceneAssessmentPayload) => void;
  onCancel: () => void;
}

interface AssessmentTemplate {
  id: string;
  text: string;
  assessmentStatus: IncidentAssessmentStatus;
  requiredOfficerDelta?: number;
  requiresEscortPermission?: boolean;
  requiresTaserPermission?: boolean;
  requiresSeniorOfficer?: boolean;
  externalEscortRequired?: boolean;
  medicalNote?: string;
}

const assessmentStatusLabels: Record<IncidentAssessmentStatus, string> = {
  simpler: 'Lihtsam kui esmateade',
  matches_initial: 'Vastab esmateatele',
  more_complex: 'Keerulisem kui esmateade',
  under_control: 'Kontrolli all',
  needs_resources: 'Vajab lisaressurssi',
};

const templates: AssessmentTemplate[] = [
  {
    id: 'under-control',
    text: 'Olukord on kontrolli all — osa ressurssi võib vabastada.',
    assessmentStatus: 'under_control',
    requiredOfficerDelta: -1,
  },
  {
    id: 'more-resources',
    text: 'Olukord on keerulisem — vaja lisaressurssi.',
    assessmentStatus: 'needs_resources',
    requiredOfficerDelta: 1,
  },
  {
    id: 'senior',
    text: 'Vajalik vanemvalvur sündmusele.',
    assessmentStatus: 'more_complex',
    requiresSeniorOfficer: true,
  },
  {
    id: 'taser',
    text: 'Vajalik EŠR õigusega ametnik.',
    assessmentStatus: 'more_complex',
    requiresTaserPermission: true,
  },
  {
    id: 'escort',
    text: 'Vajalik erakorraline väljaviimine — vaja 2 saateõigusega ametnikku.',
    assessmentStatus: 'needs_resources',
    requiresEscortPermission: true,
    externalEscortRequired: true,
    requiredOfficerDelta: 0,
  },
  {
    id: 'smaller',
    text: 'Esmane info ei vastanud tegelikkusele — sündmus on väiksema mahuga.',
    assessmentStatus: 'simpler',
    requiredOfficerDelta: -1,
  },
  {
    id: 'medical',
    text: 'Kinnipeetav vajab meditsiinilist hindamist.',
    assessmentStatus: 'matches_initial',
    medicalNote: 'Kinnipeetav vajab meditsiinilist hindamist.',
  },
];

export const SceneAssessmentForm: React.FC<Props> = ({ incident, onSubmit, onSubmitAllGroups, onCancel }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [text, setText] = useState('');
  const [assessmentStatus, setAssessmentStatus] = useState<IncidentAssessmentStatus>('matches_initial');
  const [changeRequiredOfficers, setChangeRequiredOfficers] = useState(false);
  const [requiredOfficers, setRequiredOfficers] = useState(incident.requiredOfficers);
  const [requiresEscortPermission, setRequiresEscortPermission] = useState(incident.requiresEscortPermission);
  const [requiresTaserPermission, setRequiresTaserPermission] = useState(incident.requiresTaserPermission);
  const [requiresSeniorOfficer, setRequiresSeniorOfficer] = useState(Boolean(incident.requiresSeniorOfficer));
  const [externalEscortRequired, setExternalEscortRequired] = useState(incident.externalEscortRequired);
  const [medicalNote, setMedicalNote] = useState('');

  const applyTemplate = (template: AssessmentTemplate) => {
    setSelectedTemplateId(template.id);
    setText(template.text);
    setAssessmentStatus(template.assessmentStatus);
    if (template.requiredOfficerDelta !== undefined) {
      setChangeRequiredOfficers(true);
      const nextRequired = template.id === 'escort'
        ? Math.max(2, incident.requiredOfficers)
        : Math.max(1, incident.requiredOfficers + template.requiredOfficerDelta);
      setRequiredOfficers(nextRequired);
    }
    setRequiresEscortPermission(template.requiresEscortPermission ?? requiresEscortPermission);
    setRequiresTaserPermission(template.requiresTaserPermission ?? requiresTaserPermission);
    setRequiresSeniorOfficer(template.requiresSeniorOfficer ?? requiresSeniorOfficer);
    setExternalEscortRequired(template.externalEscortRequired ?? externalEscortRequired);
    setMedicalNote(template.medicalNote ?? medicalNote);
  };

  const payload = (): SceneAssessmentPayload => ({
    text: text.trim(),
    assessmentStatus,
    requiredOfficers: changeRequiredOfficers ? requiredOfficers : undefined,
    requiresEscortPermission,
    requiresTaserPermission,
    requiresSeniorOfficer,
    externalEscortRequired,
    medicalNote: medicalNote.trim() || undefined,
  });

  const canSubmit = Boolean(text.trim());

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={titleStyle}>Lisa kohapealne hinnang</div>
        <div style={metaStyle}>{incident.title}</div>

        <div style={templateGridStyle}>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              style={templateButtonStyle(selectedTemplateId === template.id)}
            >
              {template.text}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Hinnangu liik</label>
        <select value={assessmentStatus} onChange={(event) => setAssessmentStatus(event.target.value as IncidentAssessmentStatus)} style={{ ...inputStyle, marginBottom: 12 }}>
          {(Object.keys(assessmentStatusLabels) as IncidentAssessmentStatus[]).map((status) => (
            <option key={status} value={status}>{assessmentStatusLabels[status]}</option>
          ))}
        </select>

        <label style={labelStyle}>Kohapealne hinnang</label>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} autoFocus style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />

        <label style={checkStyle}>
          <input type="checkbox" checked={changeRequiredOfficers} onChange={(event) => setChangeRequiredOfficers(event.target.checked)} />
          Muuda vajalikku ametnike arvu
        </label>
        {changeRequiredOfficers && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Uus vajalik ametnike arv</label>
            <input type="number" min={1} max={20} value={requiredOfficers} onChange={(event) => setRequiredOfficers(Number(event.target.value))} style={inputStyle} />
          </div>
        )}

        <div style={checksGridStyle}>
          <CheckBox checked={requiresEscortPermission} onChange={setRequiresEscortPermission} label="Nõuab saateõigust" />
          <CheckBox checked={requiresTaserPermission} onChange={setRequiresTaserPermission} label="Nõuab EŠR õigust" />
          <CheckBox checked={requiresSeniorOfficer} onChange={setRequiresSeniorOfficer} label="Nõuab vanemvalvurit" />
          <CheckBox checked={externalEscortRequired} onChange={setExternalEscortRequired} label="Vanglaväline väljaviimine" />
        </div>

        <label style={labelStyle}>Meditsiiniline / abi märkus</label>
        <textarea value={medicalNote} onChange={(event) => setMedicalNote(event.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} />

        <div style={{ display: 'flex', gap: 8 }}>
          {onSubmitAllGroups && (
            <button
              onClick={() => canSubmit && onSubmitAllGroups(payload())}
              disabled={!canSubmit}
              style={{ ...primaryStyle, opacity: canSubmit ? 1 : 0.45 }}
            >
              Saada kohapealne hinnang kõigile gruppidele
            </button>
          )}
          <button
            onClick={() => canSubmit && onSubmit(payload())}
            disabled={!canSubmit}
            style={{ ...(onSubmitAllGroups ? secondaryActionStyle : primaryStyle), opacity: canSubmit ? 1 : 0.45 }}
          >
            {onSubmitAllGroups ? 'Lisa hinnang sellele grupile' : 'Salvesta hinnang'}
          </button>
          <button onClick={onCancel} style={secondaryStyle}>Tühista</button>
        </div>
      </div>
    </div>
  );
};

const CheckBox: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <label style={{ ...checkStyle, color: checked ? 'var(--green)' : 'var(--text-secondary)' }}>
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
  border: '1px solid var(--cyan)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  width: 660,
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 18px 45px rgba(31,45,61,0.18)',
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
  border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
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

const checksGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  marginBottom: 14,
};

const checkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  color: 'var(--text-secondary)',
  fontSize: 12,
  marginBottom: 10,
};

const primaryStyle: React.CSSProperties = {
  flex: 1,
  padding: 9,
  background: 'var(--cyan)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
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
