import React from 'react';
import { Building, EscortBus, Incident, Officer } from '../../models';

interface Props {
  officer: Officer;
  buildings: Building[];
  incidents: Incident[];
  buses: EscortBus[];
  onMoveToBuilding: (buildingId: string) => void;
  onAssignToIncident: (incidentId: string) => void;
  onAssignToBus: (busId: string) => void;
  onRelease: () => void;
  onClose: () => void;
}

export const OfficerDetailPanel: React.FC<Props> = ({
  officer,
  buildings,
  incidents,
  buses,
  onMoveToBuilding,
  onAssignToIncident,
  onAssignToBus,
  onRelease,
  onClose,
}) => {
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...nameStyle, color: officer.gender === 'male' ? 'var(--cyan)' : '#ff99cc' }}>{officer.name}</div>
          <div style={metaStyle}>{officer.gender === 'male' ? 'Male' : 'Female'}</div>
        </div>
        <button onClick={onClose} style={closeStyle}>x</button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <RightBadge label="Escort" active={officer.hasEscortPermission} />
        <RightBadge label="Taser" active={officer.hasTaserPermission} />
      </div>

      <Section title="Move to building or pool">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
          {buildings.map((building) => (
            <ActionBtn
              key={building.id}
              label={building.name}
              disabled={officer.currentBuildingId === building.id && !officer.currentIncidentId && !officer.currentBusId}
              onClick={() => onMoveToBuilding(building.id)}
              accent={building.isResourcePool ? 'var(--green)' : 'var(--cyan)'}
            />
          ))}
        </div>
      </Section>

      {activeIncidents.length > 0 && (
        <Section title="Assign to incident">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activeIncidents.map((incident) => (
              <ActionBtn
                key={incident.id}
                label={incident.title}
                disabled={officer.currentIncidentId === incident.id}
                onClick={() => onAssignToIncident(incident.id)}
                accent={incident.status === 'escalated' ? 'var(--red)' : 'var(--amber)'}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Assign to escort bus">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {buses.map((bus) => (
            <ActionBtn
              key={bus.id}
              label={bus.name}
              disabled={officer.currentBusId === bus.id}
              onClick={() => onAssignToBus(bus.id)}
              accent="var(--amber)"
            />
          ))}
        </div>
      </Section>

      <button onClick={onRelease} style={releaseStyle}>Return to resource pool</button>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={sectionTitleStyle}>{title}</div>
    {children}
  </div>
);

const RightBadge: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div style={{ ...badgeStyle, color: active ? 'var(--green)' : 'var(--text-muted)', borderColor: active ? 'var(--green-dim)' : 'var(--border)' }}>
    {active ? 'yes' : 'no'} {label}
  </div>
);

const ActionBtn: React.FC<{ label: string; disabled: boolean; onClick: () => void; accent?: string }> = ({
  label,
  disabled,
  onClick,
  accent = 'var(--cyan)',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '5px 8px',
      background: disabled ? 'var(--bg-card)' : 'transparent',
      border: `1px solid ${disabled ? 'var(--border)' : accent}`,
      borderRadius: 'var(--radius-sm)',
      color: disabled ? 'var(--text-muted)' : accent,
      fontSize: 11,
      textAlign: 'left',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {label}
  </button>
);

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 16,
  padding: '0 4px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.5,
  marginBottom: 5,
  textTransform: 'uppercase',
};

const badgeStyle: React.CSSProperties = {
  padding: '3px 7px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const releaseStyle: React.CSSProperties = {
  width: '100%',
  padding: 7,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
};
