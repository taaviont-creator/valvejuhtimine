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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>BUSS</span>
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

const cardStyle = (index: number, selected: boolean, hasWarning: boolean, ready: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: index === 0 ? 60 : 320,
  top: 680,
  width: 190,
  minHeight: 94,
  background: selected ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${hasWarning ? 'var(--amber)' : ready ? 'var(--green)' : selected ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-md)',
  padding: '12px 13px',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
  userSelect: 'none',
});

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 15,
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
  fontSize: 18,
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
};

const statusStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

