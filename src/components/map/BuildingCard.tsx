import React from 'react';
import { Building, Incident, Officer } from '../../models';
import { getBuildingOfficerCount, getIncidentOfficers } from '../../lib/calculations';

interface Props {
  building: Building;
  officers: Officer[];
  incidents: Incident[];
  selected: boolean;
  onClick: () => void;
  isFacilitator: boolean;
  onCreateIncident?: () => void;
  onOfficerDrop?: (officerId: string) => void;
}

export const BuildingCard: React.FC<Props> = ({
  building,
  officers,
  incidents,
  selected,
  onClick,
  isFacilitator,
  onCreateIncident,
  onOfficerDrop,
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
  const unavailableOfficers = officers.filter(
    (officer) =>
      officer.status === 'unavailable' &&
      !building.isResourcePool &&
      (officer.homeBuildingId === building.id || officer.currentBuildingId === building.id)
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
    ? 'Kriitiline'
    : activeIncidents.length > 0
    ? 'Sündmus aktiivne'
    : belowMin
    ? 'Alla miinimumi'
    : 'Korras';
  const freeSectionTitle = building.isResourcePool ? 'Vaba' : 'Üksuses vabad';
  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };

  return (
    <div
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOfficer}
      style={cardStyle(building, borderColor, selected, critical, activeIncidents.length > 0, belowMin)}
    >
      {activeIncidents.length > 0 && (
        <div style={incidentBadgeStyle(activeIncidents.some((incident) => incident.status === 'escalated'))}>
          {activeIncidents.length === 1 ? 'Sündmus' : `${activeIncidents.length} sündmust`}
        </div>
      )}

      <div style={{ ...buildingNameStyle, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>{building.name}</div>

      <div style={countRowStyle}>
        <span style={{ ...countStyle, color: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : 'var(--green)' }}>
          {officerCount}<span style={slashStyle}> / {building.minimumStaff}</span>
        </span>
        <span style={minimumStyle}>valves / min</span>
      </div>

      <div style={statusRowStyle}>
        <span style={{ ...dotStyle, background: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : activeIncidents.length > 0 ? 'var(--cyan)' : 'var(--green)' }} />
        <span style={{ ...statusTextStyle, color: critical ? 'var(--red)' : belowMin ? 'var(--amber)' : activeIncidents.length > 0 ? 'var(--cyan)' : 'var(--green)' }}>{status}</span>
      </div>

      {activeIncidents.length > 0 && (
        <div style={incidentSectionStyle}>
          {activeIncidents.map((incident) => {
            const assigned = getIncidentOfficers(incident, officers);
            return (
              <div key={incident.id} style={incidentGroupStyle}>
                <div style={sectionLabelStyle}>Sündmusel: {incident.title}</div>
                {assigned.length === 0 ? (
                  <div style={emptyGroupStyle}>Ametnikke pole määratud</div>
                ) : (
                  <div style={chipWrapStyle}>
                    {assigned.map((officer) => (
                      <OfficerMapChip key={officer.id} officer={officer} tone="incident" incidentTitle={incident.title} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {localOfficers.length > 0 && (
        <div style={freeOfficerSectionStyle}>
          <div style={sectionLabelStyle}>{freeSectionTitle}</div>
          <div style={chipWrapStyle}>
            {localOfficers.map((officer) => (
              <OfficerMapChip key={officer.id} officer={officer} tone="free" />
            ))}
          </div>
        </div>
      )}

      {unavailableOfficers.length > 0 && (
        <div style={unavailableOfficerSectionStyle}>
          <div style={sectionLabelStyle}>Mängust väljas</div>
          <div style={chipWrapStyle}>
            {unavailableOfficers.map((officer) => (
              <OfficerMapChip key={officer.id} officer={officer} tone="unavailable" />
            ))}
          </div>
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
          Lisa sündmus
        </button>
      )}
    </div>
  );
};

const OfficerMapChip: React.FC<{ officer: Officer; tone: 'free' | 'incident' | 'unavailable'; incidentTitle?: string }> = ({ officer, tone, incidentTitle }) => {
  const isLead = officer.role === 'vanemvalvur';
  return (
    <span
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', officer.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      title={`${officer.name} | ${isLead ? 'Vanemvalvur' : 'Valvur'}${incidentTitle ? ` | ${incidentTitle}` : ''}`}
      className={`officer-chip officer-chip--${tone}`}
    >
      {officer.name}
      <span className={`role-badge ${isLead ? 'role-badge--lead' : 'role-badge--guard'}`}>{isLead ? 'VV' : 'V'}</span>
    </span>
  );
};

const cardStyle = (building: Building, borderColor: string, selected: boolean, critical: boolean, hasIncident: boolean, belowMin: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: building.x,
  top: building.y,
  width: building.isResourcePool ? 240 : 200,
  minHeight: 112,
  background: critical
    ? 'rgba(185,67,77,0.08)'
    : hasIncident
    ? 'rgba(34,121,157,0.07)'
    : belowMin
    ? 'rgba(166,111,31,0.08)'
    : building.isResourcePool
    ? 'rgba(39,122,87,0.06)'
    : 'var(--bg-card)',
  border: `1px solid ${borderColor}`,
  borderRadius: 'var(--radius-md)',
  padding: '12px 13px',
  cursor: 'pointer',
  boxShadow: selected ? 'var(--shadow-glow)' : 'var(--shadow-card)',
  userSelect: 'none',
});

const incidentBadgeStyle = (escalated: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: -8,
  right: 8,
  background: escalated ? 'var(--red)' : 'var(--cyan)',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 7px',
  borderRadius: 10,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

const buildingNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.2,
  marginBottom: 8,
  lineHeight: 1.25,
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 5,
};

const countStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 22,
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
  fontSize: 10.5,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const incidentSectionStyle: React.CSSProperties = {
  marginTop: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const incidentGroupStyle: React.CSSProperties = {
  padding: '7px 8px',
  background: 'rgba(166,111,31,0.08)',
  border: '1px solid rgba(166,111,31,0.28)',
  borderLeft: '3px solid var(--amber-dim)',
  borderRadius: 'var(--radius-sm)',
};

const freeOfficerSectionStyle: React.CSSProperties = {
  marginTop: 7,
  paddingTop: 6,
  borderTop: '1px solid var(--border)',
};

const unavailableOfficerSectionStyle: React.CSSProperties = {
  marginTop: 7,
  padding: '6px 7px',
  background: 'rgba(185,67,77,0.07)',
  border: '1px solid rgba(185,67,77,0.28)',
  borderRadius: 'var(--radius-sm)',
};

const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 4,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const chipWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const emptyGroupStyle: React.CSSProperties = {
  color: 'var(--red)',
  fontSize: 10,
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
