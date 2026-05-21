import React, { useState } from 'react';
import { RoleSelector } from '../components/simulation/RoleSelector';
import { Header } from '../components/layout/Header';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { FacilityMap } from '../components/map/FacilityMap';
import { IncidentForm } from '../components/incidents/IncidentForm';
import { EscalateForm } from '../components/incidents/EscalateForm';
import { OverviewEscalationAction } from '../components/incidents/ScenarioOverviewPanel';
import { ClassroomGroupOverview } from '../components/classroom/ClassroomGroupOverview';
import { SharingToolsPanel } from '../components/sharing/SharingToolsPanel';
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
  const [activatedPreparedInjectIds, setActivatedPreparedInjectIds] = useState<string[]>([]);

  if (!state.role || !state.simulation) {
    return (
      <RoleSelector
        onCreate={sim.createSimulation}
        onCreateClassroom={sim.createClassroomExercise}
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
  const markPreparedInjectActivated = (injectId: string) => {
    setActivatedPreparedInjectIds((current) => (current.includes(injectId) ? current : [...current, injectId]));
  };
  const activatePreparedInject = (inject: PreparedScenarioInject, buildingId: string, logText?: string) => {
    sim.createIncident(
      buildingId,
      inject.title,
      inject.description,
      inject.severity,
      inject.requiredOfficers,
      inject.requiresEscortPermission,
      inject.requiresTaserPermission,
      inject.externalEscortRequired,
      logText ?? `Õppejõud käivitas valmis sündmuse: ${inject.title}`
    );
    markPreparedInjectActivated(inject.id);
  };
  const activatePreparedInjectForAllGroups = (inject: PreparedScenarioInject, buildingId: string) => {
    void sim.createIncidentForAllClassroomGroups(
      buildingId,
      inject.title,
      inject.description,
      inject.severity,
      inject.requiredOfficers,
      inject.requiresEscortPermission,
      inject.requiresTaserPermission,
      inject.externalEscortRequired
    );
    markPreparedInjectActivated(inject.id);
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
    markPreparedInjectActivated(inject.id);
  };
  const applyPreparedEscalationForAllGroups = (inject: PreparedScenarioInject, incidentId: string) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const severity = severityRank[inject.severity] > severityRank[incident.severity] ? inject.severity : incident.severity;
    void sim.escalateIncidentForAllClassroomGroups(
      incidentId,
      inject.escalationText ?? inject.description,
      severity,
      Math.max(incident.requiredOfficers, inject.requiredOfficers),
      incident.requiresEscortPermission || inject.requiresEscortPermission,
      incident.requiresTaserPermission || inject.requiresTaserPermission,
      incident.externalEscortRequired || inject.externalEscortRequired
    );
    markPreparedInjectActivated(inject.id);
  };
  const activatePreparedInjectFromOverview = (inject: PreparedScenarioInject, buildingId: string) => {
    activatePreparedInject(inject, buildingId, `Õppejõud käivitas sündmuse ülevaatest: ${inject.title}`);
  };
  const strongerSeverity = (current: IncidentSeverity, next: IncidentSeverity) =>
    severityRank[next] > severityRank[current] ? next : current;
  const quickOverviewEscalation = (incidentId: string, action: OverviewEscalationAction) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const baseLog = `Õppejõud lisas eskalatsiooni ülevaatest: ${incident.title}`;
    if (action === 'more_resources') {
      sim.escalateIncident(
        incidentId,
        'Vaja lisaressurssi.',
        strongerSeverity(incident.severity, 'high'),
        incident.requiredOfficers + 1,
        incident.requiresEscortPermission,
        incident.requiresTaserPermission,
        incident.externalEscortRequired,
        baseLog
      );
      return;
    }
    if (action === 'needs_taser') {
      sim.escalateIncident(
        incidentId,
        'Vajalik EŠR õigusega ametnik.',
        strongerSeverity(incident.severity, 'high'),
        incident.requiredOfficers,
        incident.requiresEscortPermission,
        true,
        incident.externalEscortRequired,
        baseLog
      );
      return;
    }
    if (action === 'needs_escort') {
      sim.escalateIncident(
        incidentId,
        'Vajalik 2 saateõigusega ametnikku.',
        strongerSeverity(incident.severity, 'high'),
        Math.max(incident.requiredOfficers, 2),
        true,
        incident.requiresTaserPermission,
        true,
        baseLog
      );
      return;
    }
    sim.escalateIncident(
      incidentId,
      'Olukord kontrolli all.',
      'low',
      incident.requiredOfficers,
      incident.requiresEscortPermission,
      incident.requiresTaserPermission,
      incident.externalEscortRequired,
      baseLog,
      'under_control'
    );
  };
  const markOfficerInjuredFromOverview = (incidentId: string, officerId: string) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    sim.markOfficerInjured(
      incidentId,
      officerId,
      `Õppejõud lisas eskalatsiooni ülevaatest: ${incident?.title ?? 'sündmus'}. Ametnik märgiti vigastatuks.`
    );
  };
  const closeIncidentFromOverview = (incidentId: string) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const confirmed = window.confirm(
      `Sündmuse lõpetamisel vabastatakse sellele määratud ametnikud.\n\nVaikimisi: saada ametnikud tagasi määratud üksusesse.\n\nLõpeta sündmus "${incident.title}"?`
    );
    if (confirmed) sim.closeIncident(incidentId, `Õppejõud lõpetas sündmuse ülevaatest: ${incident.title}`);
  };
  const resetCurrentSimulation = () => {
    if (window.confirm('Kas oled kindel? See taastab simulatsiooni algseisu.')) {
      sim.resetSimulation();
    }
  };
  const resetClassroomGroup = (simulationId: string) => {
    void sim.resetClassroomGroup(simulationId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        role={state.role}
        simulation={state.simulation}
        classroomExercise={state.classroomExercise}
        warnings={state.warnings}
        syncStatus={state.syncStatus}
        syncMessage={state.syncMessage}
        onBack={sim.leaveSimulation}
        onStart={isFacilitator ? sim.startSimulation : undefined}
        onReset={isFacilitator && !state.classroomExercise ? resetCurrentSimulation : undefined}
      />

      {isFacilitator && (
        <SharingToolsPanel
          simulation={state.simulation}
          classroomExercise={state.classroomExercise}
          onResetSimulation={resetCurrentSimulation}
          onResetGroup={resetClassroomGroup}
        />
      )}

      {isFacilitator && state.classroomExercise && (
        <ClassroomGroupOverview
          exercise={state.classroomExercise}
          snapshots={state.classroomSnapshots}
          currentSimulationId={state.simulation.id}
          onOpenGroup={(simulationId) => void sim.openClassroomGroup(simulationId)}
        />
      )}

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
          activatedPreparedInjectIds={activatedPreparedInjectIds}
          onActivatePreparedInject={activatePreparedInject}
          onActivatePreparedInjectForAllGroups={activatePreparedInjectForAllGroups}
          onActivateOverviewInject={activatePreparedInjectFromOverview}
          onActivateOverviewInjectForAllGroups={activatePreparedInjectForAllGroups}
          onApplyPreparedEscalation={applyPreparedEscalation}
          onApplyPreparedEscalationForAllGroups={applyPreparedEscalationForAllGroups}
          canActivateAllGroups={Boolean(state.classroomExercise)}
          onQuickOverviewEscalation={quickOverviewEscalation}
          onOverviewOfficerInjured={markOfficerInjuredFromOverview}
          onOverviewCloseIncident={closeIncidentFromOverview}
        />
      </div>

      {incidentFormBuildingId && (
        <IncidentForm
          buildings={state.buildings}
          initialBuildingId={incidentFormBuildingId}
          onSubmit={(buildingId, title, desc, sev, req, escort, taser, externalEscort) => {
            if (state.classroomExercise && isFacilitator) {
              void sim.createIncidentForAllClassroomGroups(buildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
            } else {
              sim.createIncident(buildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
            }
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
            onSubmitAllGroups={
              state.classroomExercise
                ? (text, severity, required, escort, taser, externalEscort) => {
                    void sim.escalateIncidentForAllClassroomGroups(escalateIncidentId, text, severity, required, escort, taser, externalEscort);
                    setEscalateIncidentId(null);
                  }
                : undefined
            }
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
