import React from 'react';
import { Building, Incident, Officer } from '../../models';
import { getBuildingOfficerCount, getIncidentOfficers } from '../../lib/calculations';
import { OfficerMarker } from '../officers/OfficerMarker';

interface Props {
  building: Building;
  officers: Officer[];
  incidents: Incident[];
  selected: boolean;
  onClick: () => void;
  isFacilitator: boolean;
  onCreateIncident?: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onOfficerDropToIncident?: (officerId: string, incidentId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
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
  onOfficerDropToIncident,
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
  const visibleIncidents = activeIncidents;
  const visibleLocalOfficers = localOfficers.slice(0, building.isResourcePool ? 10 : 6);
  const visibleUnavailableOfficers = unavailableOfficers.slice(0, 4);
  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };
  const dropOfficerToIncident = (event: React.DragEvent, incidentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDropToIncident?.(officerId, incidentId);
  };

  return (
    <div
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOfficer}
      style={cardStyle(building, borderColor, selected, critical, activeIncidents.length > 0, belowMin)}
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
            const hasTaserOfficer = assigned.some((officer) => officer.hasTaserPermission);
            const missingTaser = incident.requiresTaserPermission && !hasTaserOfficer;
            const belowIncidentMinimum = assigned.length < incident.requiredOfficers;
            return (
              <div
                key={incident.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => dropOfficerToIncident(event, incident.id)}
                style={incidentGroupStyle(missingTaser || belowIncidentMinimum, incident.status === 'escalated')}
              >
                <div style={incidentDropHeaderStyle}>
                  <span style={incidentDropLabelStyle}>Sündmus</span>
                  <span style={incidentDropActionStyle}>Lohista ametnik siia sündmusele</span>
                </div>
                <div style={incidentTitleStyle}>{incident.title}</div>
                <div style={incidentRequirementStyle}>
                  Määratud {assigned.length} / Vajalik {incident.requiredOfficers}
                  {incident.requiresTaserPermission && <span> · EŠR: vajalik vähemalt 1</span>}
                </div>
                {(belowIncidentMinimum || missingTaser) && (
                  <div style={incidentWarningStyle}>
                    {belowIncidentMinimum && <span>Puudu ametnikke</span>}
                    {missingTaser && <span>Sündmus nõuab vähemalt ühte EŠR õigusega ametnikku</span>}
                  </div>
                )}
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
  borderColor: string,
  selected: boolean,
  critical: boolean,
  hasIncident: boolean,
  belowMin: boolean
): React.CSSProperties => ({
  position: 'relative',
  width: '100%',
  minWidth: 0,
  minHeight: building.isResourcePool ? 118 : 126,
  maxHeight: building.isResourcePool ? 190 : 220,
  overflowY: 'auto',
  background: critical
    ? 'linear-gradient(180deg, rgba(185,67,77,0.14), rgba(255,255,255,0.96))'
    : hasIncident
    ? 'linear-gradient(180deg, rgba(34,121,157,0.13), rgba(255,255,255,0.96))'
    : belowMin
    ? 'linear-gradient(180deg, rgba(166,111,31,0.13), rgba(255,255,255,0.96))'
    : building.isResourcePool
    ? 'linear-gradient(180deg, rgba(39,122,87,0.13), rgba(255,255,255,0.97))'
    : 'linear-gradient(180deg, #fbfcfa, #f0f4ed)',
  border: `1px solid ${borderColor}`,
  borderRadius: 5,
  padding: hasIncident ? '22px 9px 9px' : '12px 9px 9px',
  cursor: 'pointer',
  boxShadow: selected
    ? '0 0 0 3px rgba(34,121,157,0.16), 0 6px 12px rgba(31,45,61,0.12)'
    : '0 3px 8px rgba(31,45,61,0.10), inset 0 -8px 0 rgba(80,101,122,0.04)',
  userSelect: 'none',
  zIndex: selected ? 6 : hasIncident ? 5 : 4,
});

const roofStyle = (building: Building, critical: boolean, hasIncident: boolean, belowMin: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: -1,
  right: -1,
  top: -1,
  height: 7,
  borderRadius: '5px 5px 0 0',
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
  inset: '7px 0 auto',
  height: 18,
  backgroundImage: `
    linear-gradient(90deg, rgba(80,101,122,0.10) 1px, transparent 1px),
    linear-gradient(rgba(80,101,122,0.08) 1px, transparent 1px)
  `,
  backgroundSize: '16px 100%, 100% 9px',
  pointerEvents: 'none',
  opacity: 0.55,
};

const incidentBadgeStyle = (escalated: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 5,
  right: 7,
  background: escalated ? 'var(--red)' : 'var(--cyan)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: 8,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

const headerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  marginBottom: 6,
};

const buildingGlyphStyle = (resourcePool?: boolean): React.CSSProperties => ({
  width: 22,
  height: 20,
  flexShrink: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 2,
  padding: 3,
  borderRadius: 3,
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
  fontSize: 12.5,
  fontWeight: 700,
  letterSpacing: 0,
  lineHeight: 1.15,
  minWidth: 0,
};

const countRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
  padding: '4px 6px',
  border: '1px solid rgba(80,101,122,0.14)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.58)',
};

const countStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
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
  fontSize: 8,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  marginBottom: 5,
};

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
};

const statusTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const incidentSectionStyle: React.CSSProperties = {
  marginTop: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const incidentGroupStyle = (warning: boolean, escalated: boolean): React.CSSProperties => ({
  position: 'relative',
  zIndex: 3,
  padding: '6px 7px',
  background: warning ? 'rgba(185,67,77,0.08)' : 'rgba(166,111,31,0.08)',
  border: `1px solid ${warning ? 'rgba(185,67,77,0.30)' : 'rgba(166,111,31,0.28)'}`,
  borderLeft: `3px solid ${escalated || warning ? 'var(--red)' : 'var(--amber-dim)'}`,
  borderRadius: 'var(--radius-sm)',
  cursor: 'copy',
});

const incidentDropHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 6,
  alignItems: 'center',
  marginBottom: 3,
};

const incidentDropLabelStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 800,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
};

const incidentDropActionStyle: React.CSSProperties = {
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 7.5,
  fontWeight: 800,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const incidentTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 10.5,
  fontWeight: 800,
  lineHeight: 1.2,
};

const incidentRequirementStyle: React.CSSProperties = {
  marginTop: 3,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
};

const incidentWarningStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginTop: 4,
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
};

const freeOfficerSectionStyle: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 5,
  borderTop: '1px solid var(--border)',
};

const unavailableOfficerSectionStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '5px 6px',
  background: 'rgba(185,67,77,0.07)',
  border: '1px solid rgba(185,67,77,0.28)',
  borderRadius: 'var(--radius-sm)',
};

const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 3,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const chipWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
};

const emptyGroupStyle: React.CSSProperties = {
  color: 'var(--red)',
  fontSize: 9.5,
};

const moreTextStyle: React.CSSProperties = {
  alignSelf: 'center',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
};

const createButtonStyle: React.CSSProperties = {
  marginTop: 6,
  width: '100%',
  padding: '4px 0',
  background: 'transparent',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  fontSize: 9.5,
  fontFamily: 'var(--font-mono)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};
