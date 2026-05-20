import React from 'react';
import { Officer } from '../../models';

interface Props {
  officer: Officer;
  selected: boolean;
  onClick: () => void;
  buildingName?: string;
  incidentTitle?: string;
  busName?: string;
}

const statusColors: Record<string, string> = {
  available: 'var(--green)',
  in_building: 'var(--cyan)',
  on_incident: 'var(--amber)',
  on_escort: '#73558a',
  busy: 'var(--amber)',
  unavailable: 'var(--red)',
};

const statusBackgrounds: Record<string, string> = {
  available: 'rgba(39,122,87,0.10)',
  in_building: 'rgba(34,121,157,0.10)',
  on_incident: 'rgba(166,111,31,0.12)',
  on_escort: 'rgba(115,85,138,0.12)',
  busy: 'rgba(166,111,31,0.12)',
  unavailable: 'rgba(185,67,77,0.12)',
};

const statusLabels: Record<string, string> = {
  available: 'VABA',
  in_building: 'ÜKSUSES',
  on_incident: 'SÜNDMUSEL',
  on_escort: 'SAATMISEL',
  busy: 'HÕIVATUD',
  unavailable: 'MÄNGUST VÄLJAS',
};

export const OfficerCard: React.FC<Props> = ({
  officer,
  selected,
  onClick,
  buildingName,
  incidentTitle,
  busName,
}) => {
  const color = statusColors[officer.status] ?? 'var(--text-muted)';
  const statusBackground = statusBackgrounds[officer.status] ?? 'transparent';
  const isLead = officer.role === 'vanemvalvur';
  const assignmentPrefix =
    officer.currentIncidentId
      ? 'Sündmusel'
      : officer.currentBusId
      ? 'Saatmisel'
      : officer.status === 'busy'
      ? 'Hõivatud'
      : officer.status === 'unavailable'
      ? 'Mängust väljas'
      : 'Asukoht';
  const location = busName ?? incidentTitle ?? buildingName ?? 'Asukoht puudub';

  return (
    <div onClick={onClick} style={cardStyle(selected, color)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <span style={{ ...nameStyle, color: 'var(--text-primary)' }}>{officer.name}</span>
          <span style={genderStyle}>{officer.gender === 'male' ? 'M' : 'F'}</span>
          <span className={`role-badge ${isLead ? 'role-badge--lead' : 'role-badge--guard'}`}>{isLead ? 'VV' : 'V'}</span>
        </div>
        <span style={{ ...statusStyle, color, background: statusBackground, borderColor: color }}>{statusLabels[officer.status]}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
        <Badge active={officer.hasEscortPermission} label="Saateõigus" color="var(--green)" />
        <Badge active={officer.hasTaserPermission} label="EŠR õigus" color="var(--amber)" />
      </div>

      <div style={locationStyle}>{assignmentPrefix}: {location}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
        <span style={{ ...actionStyle, borderColor: selected ? color : 'var(--border-bright)', color: selected ? color : 'var(--text-secondary)' }}>
          Suuna / määra
        </span>
      </div>
    </div>
  );
};

const Badge: React.FC<{ active: boolean; label: string; color: string }> = ({ active, label, color }) => (
  <span style={{
    fontFamily: 'var(--font-mono)',
    fontSize: 8.5,
    padding: '2px 5px',
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--bg-elevated)' : 'transparent',
    border: `1px solid ${active ? 'var(--border-bright)' : 'var(--border)'}`,
    color: active ? color : 'var(--text-muted)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }}>
    {label}
  </span>
);

const cardStyle = (selected: boolean, color: string): React.CSSProperties => ({
  background: selected ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${selected ? 'var(--border-bright)' : 'var(--border)'}`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '10px 11px',
  cursor: 'pointer',
  boxShadow: selected ? 'var(--shadow-glow)' : 'var(--shadow-card)',
});

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
  fontWeight: 700,
};

const genderStyle: React.CSSProperties = {
  marginLeft: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
};

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 0.5,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '1px 5px',
};

const locationStyle: React.CSSProperties = {
  marginTop: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const actionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 22,
  padding: '3px 7px',
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};
