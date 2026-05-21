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
}) => (
  <div style={mapShellStyle} onClick={(event) => {
    if (event.target === event.currentTarget) {
      onSelectBuilding(null);
      onSelectBus(null);
    }
  }}>
    <div style={gridStyle} />
    <div style={mapAreaStyle}>
      <SectionLabel x={60} y={40} text="Üksused" />
      <SectionLabel x={60} y={260} text="Eri- ja vastuvõtualad" />
      <SectionLabel x={60} y={460} text="Tugiteenused" />
      <SectionLabel x={60} y={640} text="Saatebussid ja valves olevad ametnikud" />

      {buildings.map((building) => (
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
      ))}

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
    </div>
  </div>
);

const SectionLabel: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <div style={{ ...sectionLabelStyle, left: x, top: y }}>{text}</div>
);

const mapShellStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: 'var(--bg-base)',
  overflow: 'auto',
};

const gridStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(80,101,122,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,101,122,0.12) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  pointerEvents: 'none',
};

const mapAreaStyle: React.CSSProperties = {
  position: 'relative',
  width: 1100,
  height: 900,
  margin: '20px auto',
};

const sectionLabelStyle: React.CSSProperties = {
  position: 'absolute',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--text-muted)',
  letterSpacing: 1.4,
  textTransform: 'uppercase',
};
