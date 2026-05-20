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
  active: 'Active',
  escalated: 'Escalated',
  under_control: 'Under control',
  closed: 'Closed',
};

interface Props {
  incident: Incident;
  officers: Officer[];
  buildingName: string;
  isFacilitator: boolean;
  onEscalate?: () => void;
  onClose?: () => void;
}

export const IncidentCard: React.FC<Props> = ({
  incident,
  officers,
  buildingName,
  isFacilitator,
  onEscalate,
  onClose,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const assigned = getIncidentOfficers(incident, officers);
  const color = severityColors[incident.severity];
  const escortCount = assigned.filter((officer) => officer.hasEscortPermission).length;
  const taserCount = assigned.filter((officer) => officer.hasTaserPermission).length;

  return (
    <div style={cardStyle(incident, color)}>
      <div style={{ cursor: 'pointer' }} onClick={() => setExpanded((value) => !value)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={titleTextStyle(incident.status === 'closed')}>{incident.title}</div>
          <span style={{ ...statusStyle, color: incident.status === 'escalated' ? 'var(--red)' : incident.status === 'closed' ? 'var(--text-muted)' : color }}>
            {statusLabels[incident.status]}
          </span>
        </div>

        <div style={locationStyle}>{buildingName}</div>

        <div style={{ display: 'flex', gap: 5, marginTop: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...resourceStyle, color: assigned.length >= incident.requiredOfficers ? 'var(--green)' : 'var(--red)' }}>
            {assigned.length}/{incident.requiredOfficers} officers
          </span>
          {incident.requiresEscortPermission && <Tag color="var(--green)" text={`Escort ${escortCount}`} />}
          {incident.requiresTaserPermission && <Tag color="var(--amber)" text={`Taser ${taserCount}`} />}
          {incident.externalEscortRequired && <Tag color="#ff99cc" text="External escort" />}
        </div>
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

          <div style={{ marginBottom: 8 }}>
            <div style={miniLabelStyle}>Assigned officers</div>
            {assigned.length === 0 ? (
              <div style={emptyStyle}>No officers assigned</div>
            ) : (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {assigned.map((officer) => (
                  <span key={officer.id} style={officerChipStyle}>{officer.name}</span>
                ))}
              </div>
            )}
          </div>

          {isFacilitator && incident.status !== 'closed' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onEscalate} style={{ ...actionButtonStyle, color: 'var(--amber)', borderColor: 'var(--amber)' }}>Escalate</button>
              <button onClick={onClose} style={actionButtonStyle}>Close</button>
            </div>
          )}
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

const officerChipStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  padding: '1px 5px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--cyan)',
  borderRadius: 3,
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
