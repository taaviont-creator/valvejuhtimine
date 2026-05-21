import React from 'react';
import { Building, Incident, Officer } from '../../models';
import { getBuildingOfficerCount, getIncidentOfficers } from '../../lib/calculations';
import { OfficerMarker } from '../officers/OfficerMarker';

type MapPosition = {
  x: number;
  y: number;
  width?: number;
};

interface Props {
  building: Building;
  mapPosition?: MapPosition;
  officers: Officer[];
  incidents: Incident[];
  selected: boolean;
  onClick: () => void;
  isFacilitator: boolean;
  onCreateIncident?: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}

export const BuildingCard: React.FC<Props> = ({
  building,
  mapPosition,
  officers,
  incidents,
  selected,
  onClick,
  isFacilitator,
  onCreateIncident,
  onOfficerDrop,
  onSelectOfficer,
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
  const visibleIncidents = activeIncidents.slice(0, 2);
  const visibleLocalOfficers = localOfficers.slice(0, building.isResourcePool ? 10 : 6);
  const visibleUnavailableOfficers = unavailableOfficers.slice(0, 4);
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
      style={cardStyle(building, mapPosition, borderColor, selected, critical, activeIncidents.length > 0, belowMin)}
    >
      <div style={roofStyle(building, critical, activeIncidents.length > 0, belowMin)} />
      <div style={facadePatternStyle} />
      {activeIncidents.length > 0 && (
        <div style={incidentBadgeStyle(activeIncidents.some((incident) => incident.status === 'escalated'))}>
          {activeIncidents.length === 1 ? 'Sündmus' : `${activeIncidents.length} sündmust`}
        </div>
      )}

      <div style={headerStyle}>
        <span style={buildingGlyphStyle(building.isResourcePool)} aria-hidden="true">
          <span style={glyphWindowStyle} />
          <span style={glyphWindowStyle} />
          <span style={glyphWindowStyle} />
          <span style={glyphWindowStyle} />
        </span>
        <div style={{ ...buildingNameStyle, color: selected ? 'var(--cyan)' : 'var(--text-primary)' }}>{building.name}</div>
      </div>

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
          {visibleIncidents.map((incident) => {
            const assigned = getIncidentOfficers(incident, officers);
            const visibleAssigned = assigned.slice(0, 5);
            return (
              <div key={incident.id} style={incidentGroupStyle}>
                <div style={sectionLabelStyle}>Sündmusel: {incident.title}</div>
                {assigned.length === 0 ? (
                  <div style={emptyGroupStyle}>Ametnikke pole määratud</div>
                ) : (
                  <div style={chipWrapStyle}>
                    {visibleAssigned.map((officer) => (
                      <OfficerMarker
                        key={officer.id}
                        officer={officer}
                        compact
                        title={`${officer.name} | Sündmusel: ${incident.title}`}
                        onClick={() => onSelectOfficer?.(officer.id)}
                      />
                    ))}
                    {assigned.length > visibleAssigned.length && <span style={moreTextStyle}>+{assigned.length - visibleAssigned.length}</span>}
                  </div>
                )}
              </div>
            );
          })}
          {activeIncidents.length > visibleIncidents.length && (
            <div style={moreTextStyle}>Veel sündmusi: {activeIncidents.length - visibleIncidents.length}</div>
          )}
        </div>
      )}

      {localOfficers.length > 0 && (
        <div style={freeOfficerSectionStyle}>
          <div style={sectionLabelStyle}>{freeSectionTitle}</div>
          <div style={chipWrapStyle}>
            {visibleLocalOfficers.map((officer) => (
              <OfficerMarker key={officer.id} officer={officer} compact onClick={() => onSelectOfficer?.(officer.id)} />
            ))}
            {localOfficers.length > visibleLocalOfficers.length && <span style={moreTextStyle}>+{localOfficers.length - visibleLocalOfficers.length}</span>}
          </div>
        </div>
      )}

      {unavailableOfficers.length > 0 && (
        <div style={unavailableOfficerSectionStyle}>
          <div style={sectionLabelStyle}>Mängust väljas</div>
          <div style={chipWrapStyle}>
            {visibleUnavailableOfficers.map((officer) => (
              <OfficerMarker key={officer.id} officer={officer} compact onClick={() => onSelectOfficer?.(officer.id)} />
            ))}
            {unavailableOfficers.length > visibleUnavailableOfficers.length && <span style={moreTextStyle}>+{unavailableOfficers.length - visibleUnavailableOfficers.length}</span>}
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

const cardStyle = (
  building: Building,
  mapPosition: MapPosition | undefined,
  borderColor: string,
  selected: boolean,
  critical: boolean,
  hasIncident: boolean,
  belowMin: boolean
): React.CSSProperties => ({
  position: mapPosition ? 'absolute' : 'relative',
  left: mapPosition?.x,
  top: mapPosition?.y,
  width: mapPosition?.width ?? '100%',
  minWidth: 0,
  minHeight: 112,
  maxHeight: building.isResourcePool ? 260 : 270,
  overflowY: 'auto',
  background: critical
    ? 'linear-gradient(180deg, rgba(185,67,77,0.13), rgba(255,255,255,0.94))'
    : hasIncident
    ? 'linear-gradient(180deg, rgba(34,121,157,0.13), rgba(255,255,255,0.95))'
    : belowMin
    ? 'linear-gradient(180deg, rgba(166,111,31,0.13), rgba(255,255,255,0.95))'
    : building.isResourcePool
    ? 'linear-gradient(180deg, rgba(39,122,87,0.13), rgba(255,255,255,0.96))'
    : 'linear-gradient(180deg, #ffffff, #f6f8f5)',
  border: `1px solid ${borderColor}`,
  borderRadius: 7,
  padding: hasIncident ? '26px 13px 12px' : '16px 13px 12px',
  cursor: 'pointer',
  boxShadow: selected ? '0 0 0 3px rgba(34,121,157,0.16), 0 8px 18px rgba(31,45,61,0.13)' : '0 6px 14px rgba(31,45,61,0.10)',
  userSelect: 'none',
  zIndex: selected ? 6 : hasIncident ? 5 : 4,
});

const roofStyle = (building: Building, critical: boolean, hasIncident: boolean, belowMin: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: -1,
  right: -1,
  top: -1,
  height: 8,
  borderRadius: '7px 7px 0 0',
  background: critical
    ? 'var(--red)'
    : hasIncident
    ? 'var(--cyan)'
    : belowMin
    ? 'var(--amber)'
    : building.isResourcePool
    ? 'var(--green)'
    : '#687b8f',
});

const facadePatternStyle: React.CSSProperties = {
  position: 'absolute',
  inset: '8px 0 auto',
  height: 24,
  backgroundImage: 'linear-gradient(90deg, rgba(80,101,122,0.10) 1px, transparent 1px)',
  backgroundSize: '18px 100%',
  pointerEvents: 'none',
  opacity: 0.5,
};

const incidentBadgeStyle = (escalated: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 5,
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

const headerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 8,
};

const buildingGlyphStyle = (resourcePool?: boolean): React.CSSProperties => ({
  width: 28,
  height: 26,
  flexShrink: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 3,
  padding: 4,
  borderRadius: 4,
  border: `1px solid ${resourcePool ? 'var(--green-dim)' : 'var(--border-bright)'}`,
  background: resourcePool ? 'rgba(39,122,87,0.10)' : 'rgba(80,101,122,0.08)',
  boxShadow: 'inset 0 -4px 0 rgba(80,101,122,0.08)',
});

const glyphWindowStyle: React.CSSProperties = {
  borderRadius: 1,
  background: 'rgba(34,121,157,0.22)',
};

const buildingNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.2,
  lineHeight: 1.25,
  minWidth: 0,
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
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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

const moreTextStyle: React.CSSProperties = {
  alignSelf: 'center',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
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
