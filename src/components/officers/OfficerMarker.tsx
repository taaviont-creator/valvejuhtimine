import React from 'react';
import { Officer } from '../../models';

interface Props {
  officer: Officer;
  selected?: boolean;
  compact?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  title?: string;
}

export const officerStatusLabels: Record<Officer['status'], string> = {
  available: 'Vaba',
  in_building: 'Vaba',
  on_incident: 'Sündmusel',
  on_escort: 'Saatmisel',
  busy: 'Hõivatud',
  unavailable: 'Mängust väljas',
};

const statusColors: Record<Officer['status'], string> = {
  available: 'var(--green)',
  in_building: 'var(--cyan)',
  on_incident: 'var(--amber)',
  on_escort: '#73558a',
  busy: 'var(--amber)',
  unavailable: 'var(--red)',
};

const statusBackgrounds: Record<Officer['status'], string> = {
  available: 'rgba(39,122,87,0.10)',
  in_building: 'rgba(34,121,157,0.10)',
  on_incident: 'rgba(166,111,31,0.12)',
  on_escort: 'rgba(115,85,138,0.12)',
  busy: 'rgba(166,111,31,0.12)',
  unavailable: 'rgba(185,67,77,0.12)',
};

export const OfficerMarker: React.FC<Props> = ({
  officer,
  selected = false,
  compact = false,
  draggable = true,
  onClick,
  title,
}) => {
  const isLead = officer.role === 'vanemvalvur';
  const color = statusColors[officer.status];
  const disabled = officer.status === 'unavailable';

  return (
    <button
      type="button"
      draggable={draggable && !disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', officer.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      title={title ?? `${officer.name} | ${isLead ? 'Vanemvalvur' : 'Valvur'} | ${officerStatusLabels[officer.status]}`}
      style={markerStyle(color, statusBackgrounds[officer.status], selected, isLead, compact, disabled)}
    >
      <span style={personStyle(color, isLead, compact)}>
        <span style={headStyle(compact)} />
        <span style={bodyStyle(compact)} />
      </span>
      <span style={textStackStyle}>
        <span style={nameStyle(compact)}>{officer.name}</span>
        {!compact && <span style={statusStyle(color)}>{officerStatusLabels[officer.status]}</span>}
      </span>
      <span style={roleStyle(isLead)}>{isLead ? 'VV' : 'V'}</span>
      <span style={permissionStackStyle}>
        {officer.hasEscortPermission && <span style={permissionStyle('var(--green)')}>S</span>}
        {officer.hasTaserPermission && <span style={permissionStyle('var(--amber)')}>EŠR</span>}
      </span>
    </button>
  );
};

const markerStyle = (
  color: string,
  background: string,
  selected: boolean,
  isLead: boolean,
  compact: boolean,
  disabled: boolean
): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: compact ? 3 : 5,
  minHeight: compact ? 25 : 32,
  maxWidth: compact ? 118 : 170,
  padding: compact ? '2px 5px' : '4px 7px',
  border: `${selected ? 2 : isLead ? 2 : 1}px solid ${selected ? 'var(--cyan)' : isLead ? 'var(--text-primary)' : color}`,
  borderRadius: 999,
  background,
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  opacity: disabled ? 0.55 : 1,
  cursor: disabled ? 'not-allowed' : 'grab',
  boxShadow: selected ? 'var(--shadow-glow)' : 'none',
  fontFamily: 'var(--font-mono)',
  userSelect: 'none',
  overflow: 'hidden',
});

const personStyle = (color: string, isLead: boolean, compact: boolean): React.CSSProperties => ({
  width: compact ? 17 : 22,
  height: compact ? 17 : 22,
  borderRadius: '50%',
  border: `2px solid ${isLead ? 'var(--text-primary)' : color}`,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  background: '#fff',
});

const headStyle = (compact: boolean): React.CSSProperties => ({
  width: compact ? 5 : 6,
  height: compact ? 5 : 6,
  borderRadius: '50%',
  background: 'currentColor',
  marginBottom: 1,
});

const bodyStyle = (compact: boolean): React.CSSProperties => ({
  width: compact ? 9 : 11,
  height: compact ? 5 : 6,
  borderRadius: '7px 7px 3px 3px',
  background: 'currentColor',
});

const textStackStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.05,
};

const nameStyle = (compact: boolean): React.CSSProperties => ({
  fontSize: compact ? 10 : 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
});

const statusStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: 8,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

const roleStyle = (isLead: boolean): React.CSSProperties => ({
  minWidth: isLead ? 20 : 16,
  height: 15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
  background: isLead ? 'var(--text-primary)' : 'transparent',
  border: `1px solid ${isLead ? 'var(--text-primary)' : 'var(--text-muted)'}`,
  color: isLead ? '#fff' : 'var(--text-secondary)',
  fontSize: 8,
  fontWeight: 800,
  flexShrink: 0,
});

const permissionStackStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 2,
  flexShrink: 0,
};

const permissionStyle = (color: string): React.CSSProperties => ({
  minWidth: 13,
  height: 14,
  padding: '0 2px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
  border: `1px solid ${color}`,
  color,
  background: '#fff',
  fontSize: 7,
  fontWeight: 800,
});
