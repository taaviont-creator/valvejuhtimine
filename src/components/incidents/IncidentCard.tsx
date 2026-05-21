import React from 'react';
import { Incident, IncidentAssessmentStatus, IncidentUpdate, Officer } from '../../models';
import { getIncidentOfficers } from '../../lib/calculations';
import { OfficerMarker } from '../officers/OfficerMarker';

const severityColors: Record<string, string> = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: '#9a6430',
  critical: 'var(--red)',
};

const statusLabels: Record<string, string> = {
  active: 'Aktiivne',
  escalated: 'Eskaleerunud',
  under_control: 'Kontrolli all',
  closed: 'Lõpetatud',
};

const severityLabels: Record<string, string> = {
  low: 'Madal',
  medium: 'Keskmine',
  high: 'Kõrge',
  critical: 'Kriitiline',
};

const assessmentStatusLabels: Record<IncidentAssessmentStatus, string> = {
  simpler: 'Lihtsam kui esmateade',
  matches_initial: 'Vastab esmateatele',
  more_complex: 'Keerulisem kui esmateade',
  under_control: 'Kontrolli all',
  needs_resources: 'Vajab lisaressurssi',
};

interface Props {
  incident: Incident;
  officers: Officer[];
  buildingName: string;
  isFacilitator: boolean;
  onAddSceneAssessment?: () => void;
  onEscalate?: () => void;
  onClose?: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}

export const IncidentCard: React.FC<Props> = ({
  incident,
  officers,
  buildingName,
  isFacilitator,
  onAddSceneAssessment,
  onEscalate,
  onClose,
  onOfficerDrop,
  onSelectOfficer,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const assigned = getIncidentOfficers(incident, officers);
  const color = severityColors[incident.severity];
  const escortCount = assigned.filter((officer) => officer.hasEscortPermission).length;
  const taserCount = assigned.filter((officer) => officer.hasTaserPermission).length;
  const seniorCount = assigned.filter((officer) => officer.role === 'vanemvalvur').length;
  const sceneAssessments = incident.updates.filter((update) => update.type === 'scene_assessment');
  const latestAssessment = sceneAssessments[sceneAssessments.length - 1];
  const latestUpdate = incident.updates[incident.updates.length - 1];
  const unmetRequirement = assigned.length < incident.requiredOfficers;
  const missingTaserOfficer = incident.requiresTaserPermission && taserCount === 0;
  const isNewIncident = incident.status !== 'closed' && Date.now() - new Date(incident.createdAt).getTime() < 5 * 60 * 1000;
  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };

  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={dropOfficer} style={cardStyle(incident, color)}>
      <div style={{ cursor: 'pointer' }} onClick={() => setExpanded((value) => !value)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={titleTextStyle(incident.status === 'closed')}>Sündmus: {incident.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
            {isNewIncident && <span style={newBadgeStyle}>Uus sündmus</span>}
            <span style={{ ...statusStyle, color: incident.status === 'escalated' ? 'var(--red)' : incident.status === 'closed' ? 'var(--text-muted)' : color }}>
              {statusLabels[incident.status]}
            </span>
            <span style={{ ...severityStyle, color }}>{severityLabels[incident.severity]}</span>
          </div>
        </div>

        <div style={locationStyle}>Asukoht: {buildingName}</div>

        <div style={initialReportStyle}>
          <span style={miniLabelStyle}>Esmateade</span>
          <div>{incident.description || 'Esmateate kirjeldus puudub.'}</div>
        </div>

        <div style={requirementPanelStyle}>
          <span style={miniLabelStyle}>Praegune nõue</span>
          <div style={{ display: 'flex', gap: 5, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...resourceStyle, color: assigned.length >= incident.requiredOfficers ? 'var(--green)' : 'var(--red)' }}>
              Määratud {assigned.length} / Vajalik {incident.requiredOfficers}
            </span>
            <Tag color={incident.requiresEscortPermission ? 'var(--green)' : 'var(--text-muted)'} text={incident.requiresEscortPermission ? `Saateõigus ${escortCount}` : 'Saateõigust ei nõua'} />
            <Tag color={incident.requiresTaserPermission ? 'var(--amber)' : 'var(--text-muted)'} text={incident.requiresTaserPermission ? `EŠR õigus ${taserCount}` : 'EŠR ei nõua'} />
            <Tag color={incident.requiresSeniorOfficer ? 'var(--cyan)' : 'var(--text-muted)'} text={incident.requiresSeniorOfficer ? `Vanemvalvur ${seniorCount}` : 'Vanemvalvurit ei nõua'} />
            {incident.externalEscortRequired && <Tag color="#ff99cc" text="Väljaviimine" />}
          </div>
        </div>

        {incident.requiresTaserPermission && (
          <div style={requirementNoteStyle}>Nõue: vähemalt 1 EŠR õigusega ametnik</div>
        )}

        <div style={assessmentStyle(Boolean(latestAssessment))}>
          <span style={miniLabelStyle}>Kohapealne hinnang</span>
          {latestAssessment ? (
            <>
              <div style={assessmentTextStyle}>Viimane hinnang: {latestAssessment.text}</div>
              <div style={assessmentMetaStyle}>{assessmentStatusLabels[latestAssessment.assessmentStatus ?? 'matches_initial']}</div>
              {latestAssessment.medicalNote && <div style={assessmentMetaStyle}>Abi märkus: {latestAssessment.medicalNote}</div>}
            </>
          ) : (
            <div style={emptyAssessmentStyle}>Kohapealset hinnangut pole veel lisatud.</div>
          )}
        </div>

        <div style={assignedSummaryStyle}>
          <span style={miniLabelStyle}>Määratud ametnikud</span>
          {assigned.length === 0 ? (
            <div style={emptyStyle}>Ametnikke pole määratud</div>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {assigned.map((officer) => (
                <OfficerMarker
                  key={officer.id}
                  officer={officer}
                  compact
                  title={`${officer.name} | Sündmusel: ${incident.title}`}
                  onClick={() => onSelectOfficer?.(officer.id)}
                />
              ))}
            </div>
          )}
          {unmetRequirement && (
            <div style={requirementWarningStyle}>Vajalik nõue täitmata: {assigned.length}/{incident.requiredOfficers} ametnikku</div>
          )}
        </div>

        {missingTaserOfficer && (
          <div style={requirementWarningStyle}>Sündmus nõuab vähemalt ühte elektrišokirelva õigusega ametnikku.</div>
        )}

        {latestUpdate && latestUpdate.id !== latestAssessment?.id && (
          <div style={latestUpdateStyle}>
            Viimane muutus: {latestUpdate.text}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {incident.updates.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {incident.updates.map((update) => (
                <div key={update.id} style={updateStyleFor(update)}>
                  <strong>{updateLabel(update)}:</strong> {update.text}
                  {update.medicalNote && <div>Abi märkus: {update.medicalNote}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isFacilitator && incident.status !== 'closed' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={onAddSceneAssessment} style={{ ...actionButtonStyle, color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>Lisa kohapealne hinnang</button>
          <button onClick={onEscalate} style={{ ...actionButtonStyle, color: 'var(--amber)', borderColor: 'var(--amber)' }}>Lisa eskalatsioon</button>
          <button onClick={onClose} style={actionButtonStyle}>Lõpeta sündmus</button>
        </div>
      )}
    </div>
  );
};

const Tag: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span style={{
    fontFamily: 'var(--font-mono)',
    fontSize: 8.5,
    padding: '2px 5px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color,
    borderRadius: 'var(--radius-sm)',
    textTransform: 'uppercase',
  }}>
    {text}
  </span>
);

const updateLabel = (update: IncidentUpdate) => {
  if (update.type === 'scene_assessment') return 'Kohapealne hinnang';
  if (update.type === 'resolution') return 'Lahendamise info';
  if (update.type === 'initial_report') return 'Esmateade';
  return 'Eskalatsioon / olukorra muutus';
};

const cardStyle = (incident: Incident, color: string): React.CSSProperties => ({
  background: '#ffffff',
  border: `1px solid ${incident.status === 'escalated' ? 'var(--red-dim)' : incident.status === 'closed' ? 'var(--border)' : 'var(--border-bright)'}`,
  borderLeft: `4px solid ${incident.status === 'closed' ? 'var(--text-muted)' : color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '10px 11px',
  opacity: incident.status === 'closed' ? 0.55 : 1,
  boxShadow: '0 3px 12px rgba(31,45,61,0.10)',
});

const titleTextStyle = (closed: boolean): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 700,
  color: closed ? 'var(--text-muted)' : 'var(--text-primary)',
  lineHeight: 1.25,
});

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
};

const newBadgeStyle: React.CSSProperties = {
  padding: '2px 6px',
  background: 'rgba(39,122,87,0.10)',
  border: '1px solid var(--green-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const severityStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  opacity: 0.9,
};

const locationStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--text-secondary)',
  marginTop: 4,
};

const initialReportStyle: React.CSSProperties = {
  marginTop: 7,
  padding: '7px 8px',
  background: '#f6f8fb',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 11.5,
  lineHeight: 1.4,
};

const requirementPanelStyle: React.CSSProperties = {
  marginTop: 7,
  padding: '7px 8px',
  background: '#f5f9fc',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
};

const resourceStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
};

const requirementNoteStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const assessmentStyle = (hasAssessment: boolean): React.CSSProperties => ({
  marginTop: 7,
  padding: '7px 8px',
  background: hasAssessment ? 'rgba(34,121,157,0.10)' : '#f6f8fb',
  border: `1px solid ${hasAssessment ? 'rgba(34,121,157,0.24)' : 'rgba(80,101,122,0.15)'}`,
  borderLeft: `3px solid ${hasAssessment ? 'var(--cyan)' : 'var(--border-bright)'}`,
  borderRadius: 'var(--radius-sm)',
});

const assessmentTextStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 11.5,
  lineHeight: 1.4,
};

const assessmentMetaStyle: React.CSSProperties = {
  marginTop: 3,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
};

const emptyAssessmentStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const updateStyleFor = (update: IncidentUpdate): React.CSSProperties => ({
  fontSize: 11.5,
  color: update.type === 'scene_assessment' ? 'var(--cyan)' : 'var(--amber)',
  background: update.type === 'scene_assessment' ? 'rgba(34,121,157,0.07)' : 'rgba(166,111,31,0.07)',
  border: `1px solid ${update.type === 'scene_assessment' ? 'rgba(34,121,157,0.20)' : 'rgba(166,111,31,0.20)'}`,
  borderRadius: 'var(--radius-sm)',
  padding: '6px 8px',
  marginBottom: 4,
});

const assignedSummaryStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '7px 8px',
  background: '#f5f9fc',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
};

const requirementWarningStyle: React.CSSProperties = {
  marginTop: 5,
  color: 'var(--red)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};

const latestUpdateStyle: React.CSSProperties = {
  marginTop: 7,
  padding: '7px 8px',
  background: 'rgba(166,111,31,0.08)',
  border: '1px solid rgba(166,111,31,0.22)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--amber)',
  fontSize: 11.5,
  lineHeight: 1.4,
};

const miniLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-secondary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 800,
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--red)',
  fontSize: 11,
};

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: 5,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  fontWeight: 700,
};
