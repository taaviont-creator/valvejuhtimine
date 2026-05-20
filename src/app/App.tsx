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
import { PreparedScenarioInject } from '../data/incidentTemplates';

const severityRank: Record<IncidentSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

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
  const confirmReassignment = (officerId: string) => {
    const officer = state.officers.find((item) => item.id === officerId);
    if (!officer) return false;
    if (officer.status === 'unavailable') {
      window.alert('Ametnik on mängust väljas ja teda ei saa suunata.');
      return false;
    }
    const occupied = Boolean(officer.currentIncidentId || officer.currentBusId || officer.status === 'busy');
    return !occupied || window.confirm('Ametnik on juba hõivatud. Kas vabastada ta praeguselt ülesandelt ja suunata uude kohta?');
  };
  const moveDroppedOfficerToBuilding = (officerId: string, buildingId: string) => {
    if (confirmReassignment(officerId)) sim.moveOfficerToBuilding(officerId, buildingId);
  };
  const assignDroppedOfficerToIncident = (officerId: string, incidentId: string) => {
    if (confirmReassignment(officerId)) sim.assignOfficerToIncident(officerId, incidentId);
  };
  const assignDroppedOfficerToBus = (officerId: string, busId: string) => {
    const officer = state.officers.find((item) => item.id === officerId);
    if (!officer) return;
    if (!officer.hasEscortPermission) {
      window.alert('Ametnikul puudub saateõigus. Saatebussi saab määrata ainult saateõigusega ametniku.');
      return;
    }
    if (confirmReassignment(officerId)) sim.assignOfficerToBus(officerId, busId);
  };
  const activatePreparedInject = (inject: PreparedScenarioInject, buildingId: string) => {
    sim.createIncident(
      buildingId,
      inject.title,
      inject.description,
      inject.severity,
      inject.requiredOfficers,
      inject.requiresEscortPermission,
      inject.requiresTaserPermission,
      inject.externalEscortRequired,
      `Õppejõud käivitas valmis sündmuse: ${inject.title}`
    );
  };
  const applyPreparedEscalation = (inject: PreparedScenarioInject, incidentId: string) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const severity = severityRank[inject.severity] > severityRank[incident.severity] ? inject.severity : incident.severity;
    sim.escalateIncident(
      incidentId,
      inject.escalationText ?? inject.description,
      severity,
      Math.max(incident.requiredOfficers, inject.requiredOfficers),
      incident.requiresEscortPermission || inject.requiresEscortPermission,
      incident.requiresTaserPermission || inject.requiresTaserPermission,
      incident.externalEscortRequired || inject.externalEscortRequired,
      `Õppejõud lisas valmis eskalatsiooni: ${inject.escalationLogText ?? inject.escalationText ?? inject.title}.`
    );
  };

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
            onOfficerDropToBuilding={moveDroppedOfficerToBuilding}
            onOfficerDropToBus={assignDroppedOfficerToBus}
          />
        </div>

        <RightSidebar
          incidents={state.incidents}
          officers={state.officers}
          buildings={state.buildings}
          warnings={state.warnings}
          decisionLog={state.decisionLog}
          isFacilitator={isFacilitator}
          onCreateIncident={() => {
            const fallbackBuilding = state.buildings.find((building) => !building.isResourcePool)?.id ?? null;
            setIncidentFormBuildingId(selectedBuildingId ?? fallbackBuilding);
          }}
          onEscalate={(id) => setEscalateIncidentId(id)}
          onCloseIncident={sim.closeIncident}
          onOfficerDropToIncident={assignDroppedOfficerToIncident}
          onActivatePreparedInject={activatePreparedInject}
          onApplyPreparedEscalation={applyPreparedEscalation}
        />
      </div>

      {incidentFormBuildingId && (
        <IncidentForm
          buildings={state.buildings}
          initialBuildingId={incidentFormBuildingId}
          onSubmit={(buildingId, title, desc, sev, req, escort, taser, externalEscort) => {
            sim.createIncident(buildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
            setIncidentFormBuildingId(null);
          }}
          onCancel={() => setIncidentFormBuildingId(null)}
        />
      )}

      {escalateIncidentId && (() => {
        const incident = state.incidents.find((item) => item.id === escalateIncidentId);
        if (!incident) return null;
        const assignedOfficers = state.officers.filter((officer) => officer.currentIncidentId === incident.id);
        return (
          <EscalateForm
            incident={incident}
            assignedOfficers={assignedOfficers}
            onSubmit={(text, severity, required, escort, taser, externalEscort) => {
              sim.escalateIncident(escalateIncidentId, text, severity, required, escort, taser, externalEscort);
              setEscalateIncidentId(null);
            }}
            onMarkOfficerInjured={(officerId) => {
              sim.markOfficerInjured(escalateIncidentId, officerId);
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
