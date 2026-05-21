import React from 'react';
import { Officer } from '../../models';

interface Props {
  officer: Officer;
  selected?: boolean;
  compact?: boolean;
  mapPreview?: boolean;
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

export const officerGenderLabels: Record<Officer['gender'], string> = {
  male: 'Mees',
  female: 'Naine',
};

const genderShortLabels: Record<Officer['gender'], string> = {
  male: 'M',
  female: 'N',
};

const genderColors: Record<Officer['gender'], string> = {
  male: '#22799d',
  female: '#9b4f84',
};

const genderBackgrounds: Record<Officer['gender'], string> = {
  male: 'rgba(34,121,157,0.12)',
  female: 'rgba(155,79,132,0.13)',
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
  mapPreview = false,
  draggable = true,
  onClick,
  title,
}) => {
  const isLead = officer.role === 'vanemvalvur';
  const color = statusColors[officer.status];
  const disabled = officer.status === 'unavailable';
  const tooltip = officerTooltip(officer, title);

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
      title={tooltip}
      aria-label={tooltip.replace(/\n/g, ', ')}
      style={markerStyle(color, statusBackgrounds[officer.status], genderColors[officer.gender], genderBackgrounds[officer.gender], selected, isLead, compact, mapPreview, disabled)}
    >
      {!mapPreview && (
        <span style={personStyle(genderColors[officer.gender], compact)}>
          <span style={headStyle(compact)} />
          <span style={bodyStyle(compact)} />
        </span>
      )}
      <span style={textStackStyle}>
        <span style={nameStyle(compact, mapPreview)}>{officer.name}</span>
        {!compact && <span style={statusStyle(color)}>{officerStatusLabels[officer.status]}</span>}
      </span>
      <span style={roleStyle(isLead, mapPreview)}>{isLead ? 'VV' : 'V'}</span>
      <span style={genderStyle(genderColors[officer.gender], genderBackgrounds[officer.gender], mapPreview)}>
        {genderShortLabels[officer.gender]}
      </span>
      {compact && <span style={statusDotStyle(color, mapPreview)} aria-hidden="true" />}
      {!compact && (
        <span style={permissionStackStyle}>
          {officer.hasEscortPermission && <span style={permissionStyle('var(--green)')}>S</span>}
          {officer.hasTaserPermission && <span style={permissionStyle('var(--amber)')}>EŠR</span>}
        </span>
      )}
    </button>
  );
};

const officerTooltip = (officer: Officer, context?: string): string => {
  const contextText = context?.startsWith(`${officer.name} | `)
    ? context.slice(officer.name.length + 3)
    : context;

  return [
    `Ametnik: ${officer.name}`,
    `Roll: ${officer.role === 'vanemvalvur' ? 'Vanemvalvur' : 'Valvur'}`,
    `Sugu: ${officerGenderLabels[officer.gender]}`,
    `Saateõigus: ${officer.hasEscortPermission ? 'Jah' : 'Ei'}`,
    `Elektrišokirelva õigus: ${officer.hasTaserPermission ? 'Jah' : 'Ei'}`,
    `Staatus: ${officerStatusLabels[officer.status]}`,
    contextText ? `Asukoht / ülesanne: ${contextText}` : null,
  ].filter(Boolean).join('\n');
};

const markerStyle = (
  color: string,
  background: string,
  genderColor: string,
  genderBackground: string,
  selected: boolean,
  isLead: boolean,
  compact: boolean,
  mapPreview: boolean,
  disabled: boolean
): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: mapPreview ? 2 : compact ? 3 : 5,
  minHeight: mapPreview ? 20 : compact ? 25 : 32,
  maxWidth: mapPreview ? 58 : compact ? '100%' : 185,
  padding: mapPreview ? '1px 4px' : compact ? '2px 5px' : '4px 7px',
  border: `${selected ? 2 : isLead ? 2 : 1}px solid ${selected ? 'var(--cyan)' : isLead ? 'var(--text-primary)' : color}`,
  borderRadius: 999,
  background: compact ? `linear-gradient(90deg, ${genderBackground} 0 ${mapPreview ? 18 : 30}px, ${background} ${mapPreview ? 18 : 30}px)` : background,
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  opacity: disabled ? 0.55 : 1,
  cursor: disabled ? 'not-allowed' : 'grab',
  boxShadow: [selected ? 'var(--shadow-glow)' : null, compact ? `inset ${mapPreview ? 2 : 3}px 0 0 ${genderColor}` : null].filter(Boolean).join(', ') || 'none',
  fontFamily: 'var(--font-mono)',
  userSelect: 'none',
  overflow: 'hidden',
});

const personStyle = (color: string, compact: boolean): React.CSSProperties => ({
  width: compact ? 17 : 22,
  height: compact ? 17 : 22,
  borderRadius: '50%',
  border: `2px solid ${color}`,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  background: '#fff',
  color,
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
  overflow: 'hidden',
};

const nameStyle = (compact: boolean, mapPreview: boolean): React.CSSProperties => ({
  fontSize: mapPreview ? 9 : compact ? 10 : 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const statusStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: 8,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

const roleStyle = (isLead: boolean, mapPreview: boolean): React.CSSProperties => ({
  minWidth: mapPreview ? (isLead ? 17 : 13) : isLead ? 20 : 16,
  height: mapPreview ? 13 : 15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
  background: isLead ? 'var(--text-primary)' : 'transparent',
  border: `1px solid ${isLead ? 'var(--text-primary)' : 'var(--text-muted)'}`,
  color: isLead ? '#fff' : 'var(--text-secondary)',
  fontSize: mapPreview ? 7 : 8,
  fontWeight: 800,
  flexShrink: 0,
});

const genderStyle = (color: string, background: string, mapPreview: boolean): React.CSSProperties => ({
  minWidth: mapPreview ? 13 : 16,
  height: mapPreview ? 13 : 15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
  background,
  border: `1px solid ${color}`,
  color,
  fontSize: mapPreview ? 7 : 8,
  fontWeight: 900,
  flexShrink: 0,
});

const statusDotStyle = (color: string, mapPreview: boolean): React.CSSProperties => ({
  width: mapPreview ? 5 : 7,
  height: mapPreview ? 5 : 7,
  borderRadius: '50%',
  background: color,
  boxShadow: '0 0 0 2px rgba(255,255,255,0.78)',
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
