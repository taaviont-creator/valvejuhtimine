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
  on_escort: '#ff99cc',
  busy: 'var(--amber)',
  unavailable: 'var(--text-muted)',
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
  const location = busName ?? incidentTitle ?? buildingName ?? 'Asukoht puudub';

  return (
    <div onClick={onClick} style={cardStyle(selected, color)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <span style={{ ...nameStyle, color: officer.gender === 'male' ? 'var(--cyan)' : '#ff99cc' }}>{officer.name}</span>
          <span style={genderStyle}>{officer.gender === 'male' ? 'M' : 'F'}</span>
        </div>
        <span style={{ ...statusStyle, color }}>{statusLabels[officer.status]}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <Badge active={officer.hasEscortPermission} label="Saateõigus" color="var(--green)" />
        <Badge active={officer.hasTaserPermission} label="EŠR õigus" color="var(--amber)" />
      </div>

      <div style={locationStyle}>{location}</div>
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
    fontSize: 8,
    padding: '1px 5px',
    borderRadius: 2,
    background: active ? `${color}22` : 'transparent',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    color: active ? color : 'var(--text-muted)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }}>
    {label}
  </span>
);

const cardStyle = (selected: boolean, color: string): React.CSSProperties => ({
  background: selected ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${selected ? color : 'var(--border)'}`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  cursor: 'pointer',
  boxShadow: selected ? `0 0 10px ${color}22` : 'none',
});

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
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
};

const locationStyle: React.CSSProperties = {
  marginTop: 5,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
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
