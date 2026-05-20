import React from 'react';
import { Incident, Officer } from '../../models';
import { getIncidentOfficers } from '../../lib/calculations';

const severityColors: Record<string, string> = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: '#ff7722',
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

interface Props {
  incident: Incident;
  officers: Officer[];
  buildingName: string;
  isFacilitator: boolean;
  onEscalate?: () => void;
  onClose?: () => void;
  onOfficerDrop?: (officerId: string) => void;
}

export const IncidentCard: React.FC<Props> = ({
  incident,
  officers,
  buildingName,
  isFacilitator,
  onEscalate,
  onClose,
  onOfficerDrop,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const assigned = getIncidentOfficers(incident, officers);
  const color = severityColors[incident.severity];
  const escortCount = assigned.filter((officer) => officer.hasEscortPermission).length;
  const taserCount = assigned.filter((officer) => officer.hasTaserPermission).length;
  const latestUpdate = incident.updates[incident.updates.length - 1];
  const unmetRequirement = assigned.length < incident.requiredOfficers;
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

        <div style={{ display: 'flex', gap: 5, marginTop: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...resourceStyle, color: assigned.length >= incident.requiredOfficers ? 'var(--green)' : 'var(--red)' }}>
            Määratud {assigned.length} / Vajalik {incident.requiredOfficers}
          </span>
          <Tag color={incident.requiresEscortPermission ? 'var(--green)' : 'var(--text-muted)'} text={incident.requiresEscortPermission ? `Saateõigus ${escortCount}` : 'Saateõigust ei nõua'} />
          <Tag color={incident.requiresTaserPermission ? 'var(--amber)' : 'var(--text-muted)'} text={incident.requiresTaserPermission ? `EŠR õigus ${taserCount}` : 'EŠR ei nõua'} />
          {incident.externalEscortRequired && <Tag color="#ff99cc" text="Väljaviimine" />}
        </div>

        <div style={assignedSummaryStyle}>
          <span style={miniLabelStyle}>Määratud ametnikud</span>
          {assigned.length === 0 ? (
            <div style={emptyStyle}>Ametnikke pole määratud</div>
          ) : (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {assigned.map((officer) => (
                <span
                  key={officer.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', officer.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  title={officer.role === 'vanemvalvur' ? 'Vanemvalvur' : 'Valvur'}
                  className="officer-chip officer-chip--incident"
                >
                  {officer.name}
                  <span className={`role-badge ${officer.role === 'vanemvalvur' ? 'role-badge--lead' : 'role-badge--guard'}`}>
                    {officer.role === 'vanemvalvur' ? 'VV' : 'V'}
                  </span>
                </span>
              ))}
            </div>
          )}
          {unmetRequirement && (
            <div style={requirementWarningStyle}>Vajalik nõue täitmata: {assigned.length}/{incident.requiredOfficers} ametnikku</div>
          )}
        </div>

        {latestUpdate && (
          <div style={latestUpdateStyle}>
            Viimane muutus: {latestUpdate.text}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {incident.description && <p style={descriptionStyle}>{incident.description}</p>}

          {incident.updates.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {incident.updates.map((update) => (
                <div key={update.id} style={updateStyle}>{update.text}</div>
              ))}
            </div>
          )}

        </div>
      )}

      {isFacilitator && incident.status !== 'closed' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
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
    fontSize: 8,
    padding: '1px 4px',
    background: `${color}16`,
    border: `1px solid ${color}`,
    color,
    borderRadius: 2,
    textTransform: 'uppercase',
  }}>
    {text}
  </span>
);

const cardStyle = (incident: Incident, color: string): React.CSSProperties => ({
  background: 'var(--bg-card)',
  border: `1px solid ${incident.status === 'escalated' ? 'var(--red)' : incident.status === 'closed' ? 'var(--border)' : color}`,
  borderLeft: `3px solid ${incident.status === 'closed' ? 'var(--text-muted)' : color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  opacity: incident.status === 'closed' ? 0.55 : 1,
});

const titleTextStyle = (closed: boolean): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 600,
  color: closed ? 'var(--text-muted)' : 'var(--text-primary)',
  lineHeight: 1.2,
});

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.5,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
};

const newBadgeStyle: React.CSSProperties = {
  padding: '1px 5px',
  background: 'rgba(0,255,136,0.12)',
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
  fontSize: 10,
  color: 'var(--text-muted)',
  marginTop: 2,
};

const resourceStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  marginBottom: 8,
  lineHeight: 1.5,
};

const updateStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--amber)',
  background: 'rgba(255,170,0,0.05)',
  border: '1px solid rgba(255,170,0,0.2)',
  borderRadius: 3,
  padding: '4px 8px',
  marginBottom: 3,
};

const assignedSummaryStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '6px 7px',
  background: 'rgba(0,212,255,0.04)',
  border: '1px solid rgba(0,212,255,0.16)',
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
  padding: '5px 7px',
  background: 'rgba(255,170,0,0.06)',
  border: '1px solid rgba(255,170,0,0.24)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--amber)',
  fontSize: 11,
  lineHeight: 1.35,
};

const miniLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 1,
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
};
