import React from 'react';
import { Building, EscortBus, Incident, Officer } from '../../models';
import { getBuildingOfficerCount, getBusOfficers, getIncidentOfficers } from '../../lib/calculations';
import { OfficerMarker } from '../officers/OfficerMarker';

interface Props {
  buildings: Building[];
  officers: Officer[];
  incidents: Incident[];
  buses: EscortBus[];
  selectedBuildingId: string | null;
  selectedBusId: string | null;
  onSelectBuilding: (id: string | null) => void;
  onSelectBus: (id: string | null) => void;
  isFacilitator: boolean;
  onCreateIncident?: (buildingId: string) => void;
  onOfficerDropToBuilding?: (officerId: string, buildingId: string) => void;
  onOfficerDropToIncident?: (officerId: string, incidentId: string) => void;
  onOfficerDropToBus?: (officerId: string, busId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}

type MapRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const buildingPositions: Record<string, MapRect> = {
  industry: { left: 7, top: 29, width: 16, height: 37 },
  'unit-1': { left: 28, top: 20, width: 14, height: 20 },
  'unit-2': { left: 46, top: 20, width: 14, height: 20 },
  'unit-3': { left: 28, top: 48, width: 14, height: 20 },
  'unit-4': { left: 46, top: 48, width: 14, height: 20 },
  canteen: { left: 66, top: 43, width: 14, height: 19 },
  school: { left: 83, top: 42, width: 13, height: 22 },
  reception: { left: 63, top: 10.5, width: 18, height: 20 },
  gate: { left: 82, top: 10.5, width: 14, height: 20 },
  'open-prison': { left: 7, top: 80, width: 16, height: 13 },
  'resource-pool': { left: 30, top: 79, width: 25, height: 14 },
};

const mapBuildingLabels: Record<string, string> = {
  gate: 'Pääsla / välisvalve',
};

const busPositions: MapRect[] = [
  { left: 69, top: 79, width: 11.5, height: 11.5 },
  { left: 83, top: 79, width: 11.5, height: 11.5 },
];

const statusLabels = {
  ok: 'Korras',
  low: 'Alla miinimumi',
  critical: 'Kriitiline',
  incident: 'Sündmus',
};

export const FacilityMap: React.FC<Props> = ({
  buildings,
  officers,
  incidents,
  buses,
  selectedBuildingId,
  selectedBusId,
  onSelectBuilding,
  onSelectBus,
  isFacilitator,
  onCreateIncident,
  onOfficerDropToBuilding,
  onOfficerDropToIncident,
  onOfficerDropToBus,
  onSelectOfficer,
}) => {
  const positionedBuildings = buildings
    .filter((building) => buildingPositions[building.id])
    .sort((left, right) => buildingPositions[left.id].top - buildingPositions[right.id].top);
  const selectedBuilding = selectedBuildingId ? buildings.find((building) => building.id === selectedBuildingId) : null;
  const selectedBus = selectedBusId ? buses.find((bus) => bus.id === selectedBusId) : null;

  return (
    <div
      style={mapShellStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onSelectBuilding(null);
          onSelectBus(null);
        }
      }}
    >
      <div className="facility-map-canvas" style={mapCanvasStyle}>
        <div style={compoundBoundaryStyle} />
        <div style={compoundLabelStyle}>Vangla territoorium</div>
        <div style={unitZoneLabelStyle}>Eluüksused</div>
        <div style={entryZoneLabelStyle}>Sissepääs</div>
        <div style={activityZoneLabelStyle}>Tegevusalad</div>
        <div style={transportZoneLabelStyle}>Transport / saatebussid</div>

        <div style={roadStyle(mainRoadStyle)} />
        <div style={roadStyle(unitRoadStyle)} />
        <div style={roadStyle(entryRoadStyle)} />
        <div style={roadStyle(outerRoadStyle)} />
        <div style={roadStyle(openPrisonRoadStyle)} />

        {positionedBuildings.map((building) => (
          <MapBuilding
            key={building.id}
            building={building}
            rect={buildingPositions[building.id]}
            officers={officers}
            incidents={incidents}
            selected={selectedBuildingId === building.id}
            isFacilitator={isFacilitator}
            onClick={() => {
              onSelectBuilding(selectedBuildingId === building.id ? null : building.id);
              onSelectBus(null);
            }}
            onOpenRoster={() => {
              onSelectBuilding(building.id);
              onSelectBus(null);
            }}
            onCreateIncident={() => onCreateIncident?.(building.id)}
            onOfficerDrop={(officerId) => onOfficerDropToBuilding?.(officerId, building.id)}
            onOfficerDropToIncident={onOfficerDropToIncident}
            onSelectOfficer={onSelectOfficer}
          />
        ))}

        {buses.map((bus, index) => (
          <MapBus
            key={bus.id}
            bus={bus}
            rect={busPositions[index] ?? busPositions[busPositions.length - 1]}
            officers={officers}
            selected={selectedBusId === bus.id}
            onClick={() => {
              onSelectBus(selectedBusId === bus.id ? null : bus.id);
              onSelectBuilding(null);
            }}
            onOpenRoster={() => {
              onSelectBus(bus.id);
              onSelectBuilding(null);
            }}
            onOfficerDrop={(officerId) => onOfficerDropToBus?.(officerId, bus.id)}
            onSelectOfficer={onSelectOfficer}
          />
        ))}
      </div>

      {selectedBuilding && (
        <SelectedBuildingPanel
          building={selectedBuilding}
          officers={officers}
          incidents={incidents}
          isFacilitator={isFacilitator}
          onCreateIncident={() => onCreateIncident?.(selectedBuilding.id)}
          onSelectOfficer={onSelectOfficer}
        />
      )}

      {selectedBus && (
        <SelectedBusPanel
          bus={selectedBus}
          officers={officers}
          onSelectOfficer={onSelectOfficer}
        />
      )}
    </div>
  );
};

const MapBuilding: React.FC<{
  building: Building;
  rect: MapRect;
  officers: Officer[];
  incidents: Incident[];
  selected: boolean;
  isFacilitator: boolean;
  onClick: () => void;
  onOpenRoster: () => void;
  onCreateIncident?: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onOfficerDropToIncident?: (officerId: string, incidentId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}> = ({
  building,
  rect,
  officers,
  incidents,
  selected,
  isFacilitator,
  onClick,
  onOpenRoster,
  onCreateIncident,
  onOfficerDrop,
  onOfficerDropToIncident,
  onSelectOfficer,
}) => {
  const activeIncidents = building.isResourcePool
    ? []
    : incidents.filter((incident) => incident.buildingId === building.id && incident.status !== 'closed');
  const freeOfficers = officers.filter(
    (officer) =>
      officer.currentBuildingId === building.id &&
      !officer.currentIncidentId &&
      !officer.currentBusId &&
      officer.status !== 'unavailable'
  );
  const unavailableOfficers = officers.filter(
    (officer) =>
      officer.status === 'unavailable' &&
      !building.isResourcePool &&
      (officer.homeBuildingId === building.id || officer.currentBuildingId === building.id)
  );
  const staffingCount = getBuildingOfficerCount(building, officers);
  const belowMinimum = !building.isResourcePool && staffingCount < building.minimumStaff;
  const critical = belowMinimum && activeIncidents.length > 0;
  const status = critical ? 'critical' : belowMinimum ? 'low' : activeIncidents.length > 0 ? 'incident' : 'ok';
  const incidentOfficers = activeIncidents.flatMap((incident) => getIncidentOfficers(incident, officers));
  const locationOfficers = uniqueOfficers([...freeOfficers, ...incidentOfficers, ...unavailableOfficers]);
  const mapOfficerLimit = rect.height > 20 && rect.width >= 16 ? 6 : rect.width >= 14 ? 4 : 3;
  const visibleMapOfficers = locationOfficers.slice(0, mapOfficerLimit);
  const hiddenMapOfficerCount = Math.max(locationOfficers.length - visibleMapOfficers.length, 0);
  const visibleIncidents = activeIncidents.slice(0, 1);
  const hiddenIncidentCount = Math.max(activeIncidents.length - visibleIncidents.length, 0);
  const mapLabel = mapBuildingLabels[building.id] ?? building.name;

  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };

  return (
    <div
      className="map-building"
      style={mapBuildingStyle(rect, status, selected, building.isResourcePool)}
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOfficer}
    >
      <div style={buildingRoofStyle(status)} />
      <div style={buildingLabelRowStyle}>
        <div style={buildingNameStyle} title={building.name}>{mapLabel}</div>
        {isFacilitator && !building.isResourcePool && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreateIncident?.();
            }}
            style={incidentCreateButtonStyle}
            title="Lisa sündmus"
          >
            + sündmus
          </button>
        )}
      </div>

      <div style={buildingMetaRowStyle}>
        <span style={staffingPillStyle(status)}>{staffingCount} / {building.minimumStaff}</span>
        <span style={statusPillStyle(status)}>{statusLabels[status]}</span>
        <button
          type="button"
          style={officerCountButtonStyle}
          title="Näita kõiki ametnikke"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRoster();
          }}
        >
          {locationOfficers.length} ametnikku
        </button>
      </div>

      <div style={markerLayerStyle}>
        {visibleMapOfficers.map((officer) => (
          <OfficerMarker
            key={officer.id}
            officer={officer}
            compact
            mapPreview
            title={officer.status === 'unavailable' ? 'Mängust väljas' : building.name}
            onClick={() => onSelectOfficer?.(officer.id)}
          />
        ))}
        {hiddenMapOfficerCount > 0 && (
          <button
            type="button"
            style={moreMarkerButtonStyle}
            title="Näita kõiki ametnikke"
            onClick={(event) => {
              event.stopPropagation();
              onOpenRoster();
            }}
          >
            +{hiddenMapOfficerCount}
          </button>
        )}
      </div>

      {activeIncidents.length > 0 && (
        <div style={incidentOverlayStackStyle}>
          {visibleIncidents.map((incident) => (
            <MapIncidentDropZone
              key={incident.id}
              incident={incident}
              officers={officers}
              onDrop={(officerId) => onOfficerDropToIncident?.(officerId, incident.id)}
              onSelectOfficer={onSelectOfficer}
              onOpenRoster={onOpenRoster}
            />
          ))}
          {hiddenIncidentCount > 0 && <div style={moreIncidentStyle}>Veel sündmusi: {hiddenIncidentCount}</div>}
        </div>
      )}
    </div>
  );
};

const uniqueOfficers = (officers: Officer[]) => {
  const seen = new Set<string>();
  return officers.filter((officer) => {
    if (seen.has(officer.id)) return false;
    seen.add(officer.id);
    return true;
  });
};

const MapIncidentDropZone: React.FC<{
  incident: Incident;
  officers: Officer[];
  onDrop?: (officerId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
  onOpenRoster?: () => void;
}> = ({ incident, officers, onDrop, onSelectOfficer, onOpenRoster }) => {
  const assigned = getIncidentOfficers(incident, officers);
  const hasTaserOfficer = assigned.some((officer) => officer.hasTaserPermission);
  const warning = assigned.length < incident.requiredOfficers || (incident.requiresTaserPermission && !hasTaserOfficer);
  const assignedOfficerLimit = 3;

  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onDrop?.(officerId);
  };

  return (
    <div
      style={incidentDropStyle(warning, incident.status === 'escalated')}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={dropOfficer}
    >
      <div style={incidentTitleRowStyle}>
        <span>Sündmus</span>
        <strong>{assigned.length}/{incident.requiredOfficers}</strong>
      </div>
      <div style={incidentTitleStyle}>{incident.title}</div>
      <div style={incidentDropHintStyle}>Lohista siia sündmusele</div>
      {assigned.length > 0 && (
        <div style={incidentMarkerRowStyle}>
          {assigned.slice(0, assignedOfficerLimit).map((officer) => (
            <OfficerMarker
              key={officer.id}
              officer={officer}
              compact
              title={`Sündmusel: ${incident.title}`}
              onClick={() => onSelectOfficer?.(officer.id)}
            />
          ))}
          {assigned.length > assignedOfficerLimit && (
            <button
              type="button"
              style={moreMarkerButtonStyle}
              title="Näita kõiki ametnikke"
              onClick={(event) => {
                event.stopPropagation();
                onOpenRoster?.();
              }}
            >
              +{assigned.length - assignedOfficerLimit}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MapBus: React.FC<{
  bus: EscortBus;
  rect: MapRect;
  officers: Officer[];
  selected: boolean;
  onClick: () => void;
  onOpenRoster: () => void;
  onOfficerDrop?: (officerId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}> = ({ bus, rect, officers, selected, onClick, onOpenRoster, onOfficerDrop, onSelectOfficer }) => {
  const assigned = getBusOfficers(bus, officers);
  const escortQualified = assigned.filter((officer) => officer.hasEscortPermission).length;
  const ready = assigned.length >= bus.minimumEscortQualified && escortQualified >= bus.minimumEscortQualified;
  const warning = assigned.length > 0 && !ready;
  const busOfficerLimit = 3;

  const dropOfficer = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const officerId = event.dataTransfer.getData('text/plain');
    if (officerId) onOfficerDrop?.(officerId);
  };

  return (
    <div
      className="map-bus"
      style={mapBusStyle(rect, selected, warning, ready)}
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOfficer}
    >
      <div style={busLaneStyle} />
      <div style={buildingNameStyle}>{bus.name}</div>
      <div style={buildingMetaRowStyle}>
        <button
          type="button"
          style={officerCountButtonStyle}
          title="Näita kõiki ametnikke"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRoster();
          }}
        >
          {assigned.length} ametnikku
        </button>
        <span style={statusPillStyle(warning ? 'low' : ready ? 'ok' : 'incident')}>Saade {escortQualified}/{bus.minimumEscortQualified}</span>
      </div>
      {assigned.length > 0 && (
        <div style={markerLayerStyle}>
          {assigned.slice(0, busOfficerLimit).map((officer) => (
            <OfficerMarker
              key={officer.id}
              officer={officer}
              compact
              title={`Saatmisel: ${bus.name}`}
              onClick={() => onSelectOfficer?.(officer.id)}
            />
          ))}
          {assigned.length > busOfficerLimit && (
            <button
              type="button"
              style={moreMarkerButtonStyle}
              title="Näita kõiki ametnikke"
              onClick={(event) => {
                event.stopPropagation();
                onOpenRoster();
              }}
            >
              +{assigned.length - busOfficerLimit}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SelectedBuildingPanel: React.FC<{
  building: Building;
  officers: Officer[];
  incidents: Incident[];
  isFacilitator: boolean;
  onCreateIncident?: () => void;
  onSelectOfficer?: (officerId: string) => void;
}> = ({ building, officers, incidents, isFacilitator, onCreateIncident, onSelectOfficer }) => {
  const activeIncidents = building.isResourcePool
    ? []
    : incidents.filter((incident) => incident.buildingId === building.id && incident.status !== 'closed');
  const freeOfficers = officers.filter(
    (officer) =>
      officer.currentBuildingId === building.id &&
      !officer.currentIncidentId &&
      !officer.currentBusId &&
      officer.status !== 'unavailable'
  );
  const incidentOfficers = activeIncidents.flatMap((incident) => getIncidentOfficers(incident, officers));
  const escortOfficers = officers.filter(
    (officer) => officer.currentBuildingId === building.id && officer.currentBusId && officer.status !== 'unavailable'
  );
  const unavailableOfficers = officers.filter(
    (officer) =>
      officer.status === 'unavailable' &&
      !building.isResourcePool &&
      (officer.homeBuildingId === building.id || officer.currentBuildingId === building.id)
  );
  const staffingCount = getBuildingOfficerCount(building, officers);

  return (
    <section style={selectedPanelStyle}>
      <div style={selectedPanelHeaderStyle}>
        <div>
          <div style={selectedPanelKickerStyle}>Valitud hoone</div>
          <div style={selectedPanelTitleStyle}>{building.name}</div>
          <div style={selectedPanelHintStyle}>Vali ametnik kaardilt või hoone nimekirjast.</div>
        </div>
        <div style={selectedPanelMetaStyle}>
          <span style={staffingPillStyle(staffingCount < building.minimumStaff && !building.isResourcePool ? 'low' : 'ok')}>
            {staffingCount} / {building.minimumStaff}
          </span>
          {isFacilitator && !building.isResourcePool && (
            <button type="button" onClick={onCreateIncident} style={selectedPanelButtonStyle}>
              Lisa sündmus
            </button>
          )}
        </div>
      </div>

      <div style={selectedPanelGridStyle}>
        <SelectedOfficerGroup
          title={building.isResourcePool ? 'Valves olevad ametnikud' : 'Üksuses vabad'}
          officers={freeOfficers}
          emptyText="Ametnikke pole"
          context={building.name}
          onSelectOfficer={onSelectOfficer}
        />
        <SelectedOfficerGroup
          title="Sündmusel"
          officers={incidentOfficers}
          emptyText="Sündmusele määratud ametnikke pole"
          context="Sündmusel"
          onSelectOfficer={onSelectOfficer}
        />
        {escortOfficers.length > 0 && (
          <SelectedOfficerGroup
            title="Saatmisel"
            officers={escortOfficers}
            emptyText="Saatmisel ametnikke pole"
            context="Saatmisel"
            onSelectOfficer={onSelectOfficer}
          />
        )}
        <div style={selectedGroupStyle}>
          <div style={selectedGroupTitleStyle}>Aktiivsed sündmused</div>
          {activeIncidents.length === 0 ? (
            <div style={selectedEmptyStyle}>Aktiivseid sündmusi pole</div>
          ) : (
            <div style={selectedIncidentListStyle}>
              {activeIncidents.map((incident) => (
                <span key={incident.id} style={selectedIncidentChipStyle}>
                  {incident.title} {getIncidentOfficers(incident, officers).length}/{incident.requiredOfficers}
                </span>
              ))}
            </div>
          )}
        </div>
        <SelectedOfficerGroup
          title="Mängust väljas"
          officers={unavailableOfficers}
          emptyText="Puudub"
          context="Mängust väljas"
          onSelectOfficer={onSelectOfficer}
        />
      </div>
    </section>
  );
};

const SelectedBusPanel: React.FC<{
  bus: EscortBus;
  officers: Officer[];
  onSelectOfficer?: (officerId: string) => void;
}> = ({ bus, officers, onSelectOfficer }) => {
  const assigned = getBusOfficers(bus, officers);
  const escortQualified = assigned.filter((officer) => officer.hasEscortPermission).length;

  return (
    <section style={selectedPanelStyle}>
      <div style={selectedPanelHeaderStyle}>
        <div>
          <div style={selectedPanelKickerStyle}>Valitud saatebuss</div>
          <div style={selectedPanelTitleStyle}>{bus.name}</div>
          <div style={selectedPanelHintStyle}>Vali ametnik kaardilt või saatebussi nimekirjast.</div>
        </div>
        <div style={selectedPanelMetaStyle}>
          <span style={staffingPillStyle(escortQualified >= bus.minimumEscortQualified ? 'ok' : 'low')}>
            Saade {escortQualified} / {bus.minimumEscortQualified}
          </span>
        </div>
      </div>

      <div style={selectedPanelGridStyle}>
        <SelectedOfficerGroup
          title="Saatmisel"
          officers={assigned}
          emptyText="Saatebussile määratud ametnikke pole"
          context={`Saatmisel: ${bus.name}`}
          onSelectOfficer={onSelectOfficer}
        />
      </div>
    </section>
  );
};

const SelectedOfficerGroup: React.FC<{
  title: string;
  officers: Officer[];
  emptyText: string;
  context: string;
  onSelectOfficer?: (officerId: string) => void;
}> = ({ title, officers, emptyText, context, onSelectOfficer }) => (
  <div style={selectedGroupStyle}>
    <div style={selectedGroupTitleStyle}>{title}</div>
    {officers.length === 0 ? (
      <div style={selectedEmptyStyle}>{emptyText}</div>
    ) : (
      <div style={selectedOfficerListStyle}>
        {officers.map((officer) => (
          <OfficerMarker
            key={officer.id}
            officer={officer}
            compact
            title={context}
            onClick={() => onSelectOfficer?.(officer.id)}
          />
        ))}
      </div>
    )}
  </div>
);

const rectStyle = (rect: MapRect): React.CSSProperties => ({
  left: `${rect.left}%`,
  top: `${rect.top}%`,
  width: `${rect.width}%`,
  height: `${rect.height}%`,
});

const mapShellStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#dfe7df',
  overflow: 'auto',
};

const selectedPanelStyle: React.CSSProperties = {
  width: 'calc(100% - 24px)',
  minWidth: 920,
  maxWidth: 1280,
  maxHeight: 280,
  margin: '0 12px 12px',
  padding: '10px 12px',
  boxSizing: 'border-box',
  border: '1px solid rgba(80,101,122,0.24)',
  borderRadius: 10,
  background: 'rgba(247,249,252,0.94)',
  boxShadow: '0 4px 12px rgba(31,45,61,0.08)',
  overflowY: 'auto',
};

const selectedPanelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 9,
};

const selectedPanelKickerStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const selectedPanelTitleStyle: React.CSSProperties = {
  marginTop: 2,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.1,
};

const selectedPanelHintStyle: React.CSSProperties = {
  marginTop: 3,
  color: 'var(--text-secondary)',
  fontSize: 11,
  lineHeight: 1.2,
};

const selectedPanelMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const selectedPanelButtonStyle: React.CSSProperties = {
  padding: '6px 9px',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  background: '#fff',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const selectedPanelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 8,
};

const selectedGroupStyle: React.CSSProperties = {
  minWidth: 0,
  padding: 8,
  border: '1px solid rgba(80,101,122,0.16)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.72)',
};

const selectedGroupTitleStyle: React.CSSProperties = {
  marginBottom: 6,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};

const selectedOfficerListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const selectedEmptyStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
  lineHeight: 1.25,
};

const selectedIncidentListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
};

const selectedIncidentChipStyle: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid rgba(166,111,31,0.28)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.82)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 800,
};

const mapCanvasStyle: React.CSSProperties = {
  position: 'relative',
  width: 'calc(100% - 24px)',
  minWidth: 920,
  maxWidth: 1280,
  minHeight: 650,
  aspectRatio: '16 / 9',
  margin: 12,
  border: '1px solid rgba(80,101,122,0.24)',
  borderRadius: 12,
  background: `
    linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.30)),
    radial-gradient(circle at 32% 40%, rgba(255,255,255,0.18), transparent 31%),
    linear-gradient(rgba(80,101,122,0.038) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,101,122,0.038) 1px, transparent 1px),
    #dfe7df
  `,
  backgroundSize: '100% 100%, 100% 100%, 36px 36px, 36px 36px, 100% 100%',
  boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.16)',
};

const compoundBoundaryStyle: React.CSSProperties = {
  position: 'absolute',
  left: '4%',
  top: '4%',
  width: '92%',
  height: '70%',
  border: '2px solid rgba(80,101,122,0.42)',
  borderRadius: 10,
  boxShadow: 'inset 0 0 0 5px rgba(255,255,255,0.16)',
  pointerEvents: 'none',
  zIndex: 1,
};

const compoundLabelStyle: React.CSSProperties = {
  position: 'absolute',
  left: '5.4%',
  top: '5.4%',
  zIndex: 2,
  padding: '2px 8px',
  border: '1px solid rgba(80,101,122,0.24)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(247,249,252,0.90)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
  pointerEvents: 'none',
};

const mapZoneLabelStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 1,
  color: 'rgba(80,101,122,0.62)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: 'uppercase',
  pointerEvents: 'none',
};

const unitZoneLabelStyle: React.CSSProperties = {
  ...mapZoneLabelStyle,
  left: '39%',
  top: '16%',
};

const entryZoneLabelStyle: React.CSSProperties = {
  ...mapZoneLabelStyle,
  left: '67%',
  top: '6.5%',
};

const activityZoneLabelStyle: React.CSSProperties = {
  ...mapZoneLabelStyle,
  left: '69%',
  top: '37.5%',
};

const transportZoneLabelStyle: React.CSSProperties = {
  ...mapZoneLabelStyle,
  left: '71%',
  top: '74.5%',
};

const roadStyle = (style: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute',
  zIndex: 0,
  borderRadius: 999,
  background: 'rgba(104,123,143,0.095)',
  pointerEvents: 'none',
  ...style,
});

const mainRoadStyle: React.CSSProperties = {
  left: '23%',
  top: '69.2%',
  width: '68%',
  height: '2.2%',
};

const unitRoadStyle: React.CSSProperties = {
  left: '26%',
  top: '43.8%',
  width: '36%',
  height: '2%',
};

const entryRoadStyle: React.CSSProperties = {
  left: '81%',
  top: '31%',
  width: '2%',
  height: '38%',
};

const outerRoadStyle: React.CSSProperties = {
  left: '19%',
  top: '85%',
  width: '71%',
  height: '1.8%',
};

const openPrisonRoadStyle: React.CSSProperties = {
  left: '16.5%',
  top: '71%',
  width: '1.8%',
  height: '12%',
};

const mapBuildingStyle = (
  rect: MapRect,
  status: keyof typeof statusLabels,
  selected: boolean,
  resourcePool?: boolean
): React.CSSProperties => ({
  ...rectStyle(rect),
  position: 'absolute',
  zIndex: selected ? 8 : 4,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
  padding: '12px 10px 9px',
  border: `1px solid ${selected ? 'var(--cyan)' : status === 'critical' ? 'var(--red)' : status === 'low' ? 'var(--amber)' : resourcePool ? 'var(--green-dim)' : 'rgba(80,101,122,0.42)'}`,
  borderRadius: 6,
  background:
    status === 'critical'
      ? 'linear-gradient(180deg, rgba(185,67,77,0.16), rgba(255,255,255,0.95))'
      : status === 'low'
      ? 'linear-gradient(180deg, rgba(166,111,31,0.16), rgba(255,255,255,0.95))'
      : resourcePool
      ? 'linear-gradient(180deg, rgba(39,122,87,0.14), rgba(255,255,255,0.96))'
      : 'linear-gradient(180deg, #f8faf7, #e9efe6)',
  boxShadow: selected
    ? '0 0 0 3px rgba(34,121,157,0.18), 0 7px 14px rgba(31,45,61,0.15)'
    : '0 3px 8px rgba(31,45,61,0.11), inset 0 -9px 0 rgba(80,101,122,0.045)',
  cursor: 'pointer',
  overflow: 'hidden',
});

const buildingRoofStyle = (status: keyof typeof statusLabels): React.CSSProperties => ({
  position: 'absolute',
  left: -1,
  right: -1,
  top: -1,
  height: 6,
  borderRadius: '6px 6px 0 0',
  background:
    status === 'critical'
      ? 'var(--red)'
      : status === 'low'
      ? 'var(--amber)'
      : status === 'incident'
      ? 'var(--cyan)'
      : '#687b8f',
});

const buildingLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 5,
  marginBottom: 6,
};

const buildingNameStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.14,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const incidentCreateButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '3px 7px',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.86)',
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 800,
  textTransform: 'uppercase',
  lineHeight: 1,
};

const buildingMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 5,
  flexWrap: 'wrap',
  marginBottom: 6,
};

const officerCountButtonStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(80,101,122,0.18)',
  background: 'rgba(255,255,255,0.70)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 900,
  cursor: 'pointer',
  textTransform: 'uppercase',
};

const staffingPillStyle = (status: keyof typeof statusLabels | 'ok' | 'low' | 'incident'): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(80,101,122,0.18)',
  background: 'rgba(255,255,255,0.70)',
  color: status === 'low' ? 'var(--amber)' : status === 'critical' ? 'var(--red)' : 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  fontWeight: 900,
});

const statusPillStyle = (status: keyof typeof statusLabels | 'ok' | 'low' | 'incident'): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${status === 'low' ? 'var(--amber-dim)' : status === 'critical' ? 'var(--red-dim)' : status === 'incident' ? 'var(--cyan-dim)' : 'var(--green-dim)'}`,
  background: 'rgba(255,255,255,0.70)',
  color: status === 'low' ? 'var(--amber)' : status === 'critical' ? 'var(--red)' : status === 'incident' ? 'var(--cyan)' : 'var(--green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 800,
  textTransform: 'uppercase',
});

const markerLayerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  alignItems: 'center',
};

const moreMarkerStyle: React.CSSProperties = {
  alignSelf: 'center',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 800,
  cursor: 'pointer',
};

const moreMarkerButtonStyle: React.CSSProperties = {
  ...moreMarkerStyle,
  padding: '2px 5px',
  border: '1px solid rgba(80,101,122,0.22)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.78)',
};

const incidentOverlayStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 6,
};

const incidentDropStyle = (warning: boolean, escalated: boolean): React.CSSProperties => ({
  position: 'relative',
  zIndex: 6,
  padding: '4px 6px',
  border: `1px solid ${warning ? 'rgba(185,67,77,0.34)' : 'rgba(166,111,31,0.32)'}`,
  borderLeft: `3px solid ${warning || escalated ? 'var(--red)' : 'var(--amber)'}`,
  borderRadius: 4,
  background: warning ? 'rgba(185,67,77,0.10)' : 'rgba(255,255,255,0.74)',
  cursor: 'copy',
});

const incidentTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 4,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 7.5,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const incidentTitleStyle: React.CSSProperties = {
  marginTop: 2,
  color: 'var(--text-primary)',
  fontSize: 9,
  fontWeight: 800,
  lineHeight: 1.15,
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const incidentDropHintStyle: React.CSSProperties = {
  marginTop: 2,
  color: 'var(--cyan)',
  fontFamily: 'var(--font-mono)',
  fontSize: 7.2,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const moreIncidentStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const incidentMarkerRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  marginTop: 4,
};

const mapBusStyle = (rect: MapRect, selected: boolean, warning: boolean, ready: boolean): React.CSSProperties => ({
  ...rectStyle(rect),
  position: 'absolute',
  zIndex: selected ? 8 : 4,
  boxSizing: 'border-box',
  padding: '10px 8px 8px',
  border: `1px solid ${warning ? 'var(--amber)' : ready ? 'var(--green)' : selected ? 'var(--cyan)' : 'rgba(80,101,122,0.42)'}`,
  borderRadius: 6,
  background: selected ? 'linear-gradient(180deg, #edf3f9, #ffffff)' : 'linear-gradient(180deg, #fbfcfa, #eef2ec)',
  boxShadow: selected ? '0 0 0 3px rgba(34,121,157,0.16), 0 6px 12px rgba(31,45,61,0.12)' : '0 3px 8px rgba(31,45,61,0.11)',
  cursor: 'pointer',
  overflow: 'hidden',
});

const busLaneStyle: React.CSSProperties = {
  position: 'absolute',
  left: -1,
  right: -1,
  top: -1,
  height: 6,
  borderRadius: '6px 6px 0 0',
  background: 'repeating-linear-gradient(90deg, #687b8f 0 14px, #8b9a9f 14px 20px)',
};
