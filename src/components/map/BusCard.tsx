import React from 'react';
import { EscortBus, Officer } from '../../models';
import { getBusOfficers } from '../../lib/calculations';
import { OfficerMarker } from '../officers/OfficerMarker';

interface Props {
  bus: EscortBus;
  index: number;
  officers: Officer[];
  selected: boolean;
  onClick: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}

export const BusCard: React.FC<Props> = ({ bus, index, officers, selected, onClick, onOfficerDrop, onSelectOfficer }) => {
  const assigned = getBusOfficers(bus, officers);
  const escortQualified = assigned.filter((officer) => officer.hasEscortPermission).length;
  const hasWarning = assigned.length > 0 && escortQualified < bus.minimumEscortQualified;
  const ready = assigned.length >= bus.minimumEscortQualified && escortQualified >= bus.minimumEscortQualified;

  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };

  return (
    <div onClick={onClick} onDragOver={(event) => event.preventDefault()} onDrop={dropOfficer} style={cardStyle(index, selected, hasWarning, ready)}>
      <div style={busLaneStyle} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={busIconStyle} aria-hidden="true">
          <span style={busWindowStyle} />
          <span style={busWindowStyle} />
        </span>
        <span style={{ ...nameStyle, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>{bus.name}</span>
      </div>

      <div style={countRowStyle}>
        <span style={{ ...countStyle, color: hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : 'var(--text-secondary)' }}>{assigned.length}</span>
        <span style={metaStyle}>saateõigus {escortQualified}/{bus.minimumEscortQualified}</span>
      </div>

      <div style={{ ...statusStyle, color: hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : 'var(--text-muted)' }}>
        {assigned.length === 0 ? 'Tühi' : hasWarning ? 'Vajab saateõigusega ametnikke' : ready ? 'Valmis' : 'Ootel'}
      </div>

      {assigned.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 7 }}>
          {assigned.map((officer) => (
            <OfficerMarker
              key={officer.id}
              officer={officer}
              compact
              title={`${officer.name} | Saatmisel: ${bus.name}`}
              onClick={() => onSelectOfficer?.(officer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const cardStyle = (
  index: number,
  selected: boolean,
  hasWarning: boolean,
  ready: boolean
): React.CSSProperties => ({
  position: 'relative',
  width: '100%',
  minWidth: 0,
  minHeight: 88,
  background: selected ? 'linear-gradient(180deg, #edf3f9, #ffffff)' : 'linear-gradient(180deg, #fbfcfa, #f1f4ef)',
  border: `1px solid ${hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : selected ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderRadius: 5,
  padding: '13px 10px 9px',
  cursor: 'pointer',
  boxShadow: selected ? '0 0 0 3px rgba(34,121,157,0.16), 0 6px 12px rgba(31,45,61,0.12)' : '0 3px 8px rgba(31,45,61,0.10)',
  userSelect: 'none',
  zIndex: selected ? 6 : 4,
});

const busLaneStyle: React.CSSProperties = {
  position: 'absolute',
  left: -1,
  right: -1,
  top: -1,
  height: 7,
  borderRadius: '5px 5px 0 0',
  background: 'repeating-linear-gradient(90deg, #687b8f 0 16px, #8b9a9f 16px 24px)',
};

const busIconStyle: React.CSSProperties = {
  width: 28,
  height: 17,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  padding: '3px 5px',
  borderRadius: 4,
  border: '1px solid var(--border-bright)',
  background: 'rgba(80,101,122,0.10)',
  boxShadow: 'inset 0 -3px 0 rgba(80,101,122,0.10)',
};

const busWindowStyle: React.CSSProperties = {
  width: 7,
  height: 6,
  borderRadius: 1,
  background: 'rgba(34,121,157,0.24)',
};

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 12.5,
  fontWeight: 700,
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
};

const countStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  color: 'var(--text-muted)',
};

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

