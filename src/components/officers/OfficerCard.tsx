import React from 'react';
import { Officer } from '../../models';
import { OfficerMarker, officerGenderLabels } from './OfficerMarker';

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

export const OfficerCard: React.FC<Props> = ({
  officer,
  selected,
  onClick,
  buildingName,
  incidentTitle,
  busName,
}) => {
  const color = statusColors[officer.status] ?? 'var(--text-muted)';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <OfficerMarker officer={officer} selected={selected} onClick={onClick} />
      </div>

      <div style={locationStyle}>{assignmentPrefix}: {location}</div>
      <div style={metaRowStyle}>
        <span>Roll: {officer.role === 'vanemvalvur' ? 'Vanemvalvur' : 'Valvur'}</span>
        <span>Sugu: {officerGenderLabels[officer.gender]}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
        <span style={{ ...actionStyle, borderColor: selected ? color : 'var(--border-bright)', color: selected ? color : 'var(--text-secondary)' }}>
          Suuna / määra
        </span>
      </div>
    </div>
  );
};

const cardStyle = (selected: boolean, color: string): React.CSSProperties => ({
  background: selected ? '#f2f7fb' : '#ffffff',
  border: `1px solid ${selected ? 'var(--border-bright)' : 'var(--border)'}`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '10px 11px',
  cursor: 'pointer',
  boxShadow: selected ? 'var(--shadow-glow)' : 'var(--shadow-card)',
});

const locationStyle: React.CSSProperties = {
  marginTop: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const metaRowStyle: React.CSSProperties = {
  marginTop: 5,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
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
  fontWeight: 700,
};
