import React, { useState } from 'react';
import { RoleSelector } from '../components/simulation/RoleSelector';
import { Header } from '../components/layout/Header';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { FacilityMap } from '../components/map/FacilityMap';
import { IncidentForm } from '../components/incidents/IncidentForm';
import { EscalateForm } from '../components/incidents/EscalateForm';
import { useSimulation } from '../hooks/useSimulation';
import { IncidentSeverity } from '../models';

export const App: React.FC = () => {
  const sim = useSimulation();
  const { state } = sim;

  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [incidentFormBuildingId, setIncidentFormBuildingId] = useState<string | null>(null);
  const [escalateIncidentId, setEscalateIncidentId] = useState<string | null>(null);

  if (!state.role || !state.simulation) {
    return (
      <RoleSelector
        onCreate={sim.createSimulation}
        onJoin={sim.joinSimulation}
        syncStatus={state.syncStatus}
        syncMessage={state.syncMessage}
      />
    );
  }

  const isFacilitator = state.role === 'facilitator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        role={state.role}
        simulation={state.simulation}
        warnings={state.warnings}
        syncStatus={state.syncStatus}
        syncMessage={state.syncMessage}
        onBack={sim.leaveSimulation}
        onStart={isFacilitator ? sim.startSimulation : undefined}
        onReset={isFacilitator ? sim.resetSimulation : undefined}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar
          role={state.role}
          simulation={state.simulation}
          officers={state.officers}
          buildings={state.buildings}
          incidents={state.incidents}
          buses={state.buses}
          selectedOfficerId={selectedOfficerId}
          onSelectOfficer={setSelectedOfficerId}
          onMoveToBuilding={sim.moveOfficerToBuilding}
          onAssignToIncident={sim.assignOfficerToIncident}
          onAssignToBus={sim.assignOfficerToBus}
          onRelease={sim.releaseOfficer}
          onAddOfficer={sim.addOfficer}
          onUpdateBuildingMinimum={sim.updateBuildingMinimum}
          onSetSetupMode={sim.setSetupMode}
        />

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <FacilityMap
            buildings={state.buildings}
            officers={state.officers}
            incidents={state.incidents}
            buses={state.buses}
            selectedBuildingId={selectedBuildingId}
            selectedBusId={selectedBusId}
            onSelectBuilding={setSelectedBuildingId}
            onSelectBus={setSelectedBusId}
            isFacilitator={isFacilitator}
            onCreateIncident={(buildingId) => setIncidentFormBuildingId(buildingId)}
          />
        </div>

        <RightSidebar
          incidents={state.incidents}
          officers={state.officers}
          buildings={state.buildings}
          warnings={state.warnings}
          decisionLog={state.decisionLog}
          isFacilitator={isFacilitator}
          onEscalate={(id) => setEscalateIncidentId(id)}
          onCloseIncident={sim.closeIncident}
        />
      </div>

      {incidentFormBuildingId && (
        <IncidentForm
          buildingName={state.buildings.find((building) => building.id === incidentFormBuildingId)?.name ?? ''}
          onSubmit={(title, desc, sev, req, escort, taser, externalEscort) => {
            sim.createIncident(incidentFormBuildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
            setIncidentFormBuildingId(null);
          }}
          onCancel={() => setIncidentFormBuildingId(null)}
        />
      )}

      {escalateIncidentId && (() => {
        const incident = state.incidents.find((item) => item.id === escalateIncidentId);
        if (!incident) return null;
        return (
          <EscalateForm
            incident={incident}
            onSubmit={(text, severity, required, escort, taser, externalEscort) => {
              sim.escalateIncident(escalateIncidentId, text, severity, required, escort, taser, externalEscort);
              setEscalateIncidentId(null);
            }}
            onCancel={() => setEscalateIncidentId(null)}
          />
        );
      })()}
    </div>
  );
};

export default App;
