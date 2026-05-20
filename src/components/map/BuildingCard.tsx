import React from 'react';
import { Building, Incident, Officer } from '../../models';
import { getBuildingOfficerCount } from '../../lib/calculations';

interface Props {
  building: Building;
  officers: Officer[];
  incidents: Incident[];
  selected: boolean;
  onClick: () => void;
  isFacilitator: boolean;
  onCreateIncident?: () => void;
}

export const BuildingCard: React.FC<Props> = ({
  building,
  officers,
  incidents,
  selected,
  onClick,
  isFacilitator,
  onCreateIncident,
}) => {
  const activeIncidents = building.isResourcePool
    ? []
    : incidents.filter((incident) => incident.buildingId === building.id && incident.status !== 'closed');
  const localOfficers = officers.filter(
    (officer) =>
      officer.currentBuildingId === building.id &&
      officer.currentIncidentId === null &&
      officer.currentBusId === null &&
      officer.status !== 'unavailable'
  );
  const officerCount = getBuildingOfficerCount(building, officers);
  const belowMin = !building.isResourcePool && officerCount < building.minimumStaff;
  const critical = belowMin && activeIncidents.length > 0;

  const borderColor = critical
    ? 'var(--red)'
    : activeIncidents.length > 0
    ? 'var(--cyan)'
    : belowMin
    ? 'var(--amber)'
    : selected
    ? 'var(--cyan-dim)'
    : building.isResourcePool
    ? 'var(--green-dim)'
    : 'var(--border)';

  const status = critical
    ? 'Critical'
    : activeIncidents.length > 0
    ? 'Incident active'
    : belowMin
    ? 'Below minimum'
    : 'OK';

  return (
    <div onClick={onClick} style={cardStyle(building, borderColor, selected, critical, activeIncidents.length > 0, belowMin)}>
      {activeIncidents.length > 0 && (
        <div style={incidentBadgeStyle(activeIncidents.some((incident) => incident.status === 'escalated'))}>
          {activeIncidents.length === 1 ? 'Incident' : `${activeIncidents.length} incidents`}
        </div>
      )}

      <div style={{ ...buildingNameStyle, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>{building.name}</div>

      <div style={countRowStyle}>
        <span style={{ ...countStyle, color: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : 'var(--green)' }}>
          {officerCount}<span style={slashStyle}> / {building.minimumStaff}</span>
        </span>
        <span style={minimumStyle}>staffed / min</span>
      </div>

      <div style={statusRowStyle}>
        <span style={{ ...dotStyle, background: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : activeIncidents.length > 0 ? 'var(--cyan)' : 'var(--green)' }} />
        <span style={{ ...statusTextStyle, color: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : activeIncidents.length > 0 ? 'var(--cyan)' : 'var(--green)' }}>{status}</span>
      </div>

      {activeIncidents.length > 0 && (
        <div style={activeIncidentTextStyle}>
          Active: {activeIncidents.map((incident) => incident.title).join(', ')}
        </div>
      )}

      {localOfficers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 7 }}>
          {localOfficers.map((officer) => (
            <span key={officer.id} title={`${officer.name} | ${officer.gender} | ${officer.hasEscortPermission ? 'escort' : 'no escort'} | ${officer.hasTaserPermission ? 'taser' : 'no taser'}`} style={officerChipStyle(officer)}>
              {officer.name}
            </span>
          ))}
        </div>
      )}

      {isFacilitator && !building.isResourcePool && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCreateIncident?.();
          }}
          style={createButtonStyle}
        >
          Create incident
        </button>
      )}
    </div>
  );
};

const cardStyle = (building: Building, borderColor: string, selected: boolean, critical: boolean, hasIncident: boolean, belowMin: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: building.x,
  top: building.y,
  width: building.isResourcePool ? 240 : 180,
  minHeight: 96,
  background: critical
    ? 'rgba(255,51,85,0.06)'
    : hasIncident
    ? 'rgba(0,212,255,0.05)'
    : belowMin
    ? 'rgba(255,170,0,0.05)'
    : building.isResourcePool
    ? 'rgba(0,255,136,0.04)'
    : 'var(--bg-card)',
  border: `1px solid ${borderColor}`,
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  cursor: 'pointer',
  boxShadow: selected ? `0 0 16px ${borderColor}44` : 'var(--shadow-card)',
  userSelect: 'none',
});

const incidentBadgeStyle = (escalated: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: -8,
  right: 8,
  background: escalated ? 'var(--red)' : 'var(--cyan)',
  color: '#000',
  fontSize: 10,
  fontWeight: 700,
  padding: '1px 6px',
  borderRadius: 10,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

const buildingNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
  marginBottom: 7,
  lineHeight: 1.2,
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 5,
};

const countStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1,
};

const slashStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  fontWeight: 400,
};

const minimumStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
};

const statusTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const officerChipStyle = (officer: Officer): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: officer.gender === 'male' ? 'var(--cyan)' : '#ff99cc',
  padding: '1px 4px',
  borderRadius: 3,
});

const activeIncidentTextStyle: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 5,
  borderTop: '1px solid var(--border)',
  color: 'var(--cyan)',
  fontSize: 10,
  lineHeight: 1.25,
};

const createButtonStyle: React.CSSProperties = {
  marginTop: 8,
  width: '100%',
  padding: '5px 0',
  background: 'transparent',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};
