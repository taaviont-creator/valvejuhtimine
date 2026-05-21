import React from 'react';
import { Building, EscortBus, Incident, Officer } from '../../models';
import { BuildingCard } from './BuildingCard';
import { BusCard } from './BusCard';

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
  onOfficerDropToBus?: (officerId: string, busId: string) => void;
  onSelectOfficer?: (officerId: string) => void;
}

const entryBuildingIds = ['gate', 'reception'];
const unitBuildingIds = ['unit-1', 'unit-2', 'unit-3', 'unit-4'];
const activityBuildingIds = ['industry', 'canteen', 'school', 'open-prison'];
const resourcePoolId = 'resource-pool';

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
  onOfficerDropToBus,
  onSelectOfficer,
}) => {
  const buildingById = new Map(buildings.map((building) => [building.id, building]));
  const resourcePool = buildingById.get(resourcePoolId);
  const entryBuildings = orderedBuildings(entryBuildingIds, buildingById);
  const unitBuildings = orderedBuildings(unitBuildingIds, buildingById);
  const activityBuildings = orderedBuildings(activityBuildingIds, buildingById);

  const renderBuilding = (building: Building) => (
    <BuildingCard
      key={building.id}
      building={building}
      officers={officers}
      incidents={incidents}
      selected={selectedBuildingId === building.id}
      onClick={() => {
        onSelectBuilding(selectedBuildingId === building.id ? null : building.id);
        onSelectBus(null);
      }}
      isFacilitator={isFacilitator}
      onCreateIncident={() => onCreateIncident?.(building.id)}
      onOfficerDrop={(officerId) => onOfficerDropToBuilding?.(officerId, building.id)}
      onSelectOfficer={onSelectOfficer}
    />
  );

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
      <div style={mapBoardStyle}>
        <div style={pathwayLayerStyle} />

        <MapSection title="Sissepääs ja vastuvõtt" style={entrySectionStyle} gridStyle={twoColumnGridStyle}>
          {entryBuildings.map(renderBuilding)}
        </MapSection>

        <MapSection title="Valves olevad ametnikud" style={resourceSectionStyle} gridStyle={singleColumnGridStyle}>
          {resourcePool && renderBuilding(resourcePool)}
        </MapSection>

        <MapSection title="Eluüksused" style={wideSectionStyle} gridStyle={fourColumnGridStyle}>
          {unitBuildings.map(renderBuilding)}
        </MapSection>

        <MapSection title="Tegevusalad" style={wideSectionStyle} gridStyle={fourColumnGridStyle}>
          {activityBuildings.map(renderBuilding)}
        </MapSection>

        <MapSection title="Transport" style={transportSectionStyle} gridStyle={transportGridStyle}>
          {buses.map((bus, index) => (
            <BusCard
              key={bus.id}
              bus={bus}
              index={index}
              officers={officers}
              selected={selectedBusId === bus.id}
              onClick={() => {
                onSelectBus(selectedBusId === bus.id ? null : bus.id);
                onSelectBuilding(null);
              }}
              onOfficerDrop={(officerId) => onOfficerDropToBus?.(officerId, bus.id)}
              onSelectOfficer={onSelectOfficer}
            />
          ))}
        </MapSection>
      </div>
    </div>
  );
};

const orderedBuildings = (ids: string[], buildingById: Map<string, Building>) =>
  ids.flatMap((id) => {
    const building = buildingById.get(id);
    return building ? [building] : [];
  });

const MapSection: React.FC<{
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  gridStyle?: React.CSSProperties;
}> = ({ title, children, style, gridStyle }) => (
  <section style={{ ...sectionStyle, ...style }}>
    <div style={sectionTitleStyle}>{title}</div>
    <div style={{ ...sectionGridStyle, ...gridStyle }}>{children}</div>
  </section>
);

const mapShellStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: '#dfe7df',
  overflow: 'auto',
};

const mapBoardStyle: React.CSSProperties = {
  position: 'relative',
  width: 'min(1180px, calc(100% - 28px))',
  minWidth: 820,
  margin: 14,
  padding: 18,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(250px, 0.42fr)',
  gap: 16,
  border: '1px solid rgba(80,101,122,0.28)',
  borderRadius: 12,
  background: `
    linear-gradient(rgba(255,255,255,0.26), rgba(255,255,255,0.26)),
    linear-gradient(rgba(80,101,122,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,101,122,0.06) 1px, transparent 1px),
    #dfe7df
  `,
  backgroundSize: '100% 100%, 36px 36px, 36px 36px, 100% 100%',
  boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.18)',
};

const pathwayLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 18,
  borderRadius: 8,
  background: `
    linear-gradient(90deg, transparent 0 8%, rgba(104,123,143,0.12) 8% 92%, transparent 92%),
    linear-gradient(transparent 0 32%, rgba(104,123,143,0.14) 32% 37%, transparent 37% 64%, rgba(104,123,143,0.12) 64% 69%, transparent 69%)
  `,
  pointerEvents: 'none',
  zIndex: 0,
};

const sectionStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  padding: 12,
  border: '1px solid rgba(80,101,122,0.24)',
  borderRadius: 8,
  background: 'rgba(247,249,252,0.74)',
  boxShadow: '0 3px 10px rgba(31,45,61,0.06)',
};

const sectionTitleStyle: React.CSSProperties = {
  marginBottom: 10,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: 1.1,
  textTransform: 'uppercase',
};

const sectionGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  alignItems: 'start',
};

const entrySectionStyle: React.CSSProperties = {
  gridColumn: '1',
};

const resourceSectionStyle: React.CSSProperties = {
  gridColumn: '2',
  gridRow: '1',
};

const wideSectionStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
};

const transportSectionStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
};

const twoColumnGridStyle: React.CSSProperties = {
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
};

const fourColumnGridStyle: React.CSSProperties = {
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
};

const singleColumnGridStyle: React.CSSProperties = {
  gridTemplateColumns: 'minmax(0, 1fr)',
};

const transportGridStyle: React.CSSProperties = {
  gridTemplateColumns: 'repeat(2, minmax(190px, 240px))',
};
