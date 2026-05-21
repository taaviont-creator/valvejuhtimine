import React, { useState } from 'react';
import { RoleSelector } from '../components/simulation/RoleSelector';
import { Header } from '../components/layout/Header';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { FacilityMap } from '../components/map/FacilityMap';
import { IncidentForm } from '../components/incidents/IncidentForm';
import { EscalateForm } from '../components/incidents/EscalateForm';
import { SceneAssessmentForm, SceneAssessmentPayload } from '../components/incidents/SceneAssessmentForm';
import { OverviewEscalationAction } from '../components/incidents/ScenarioOverviewPanel';
import { ClassroomGroupOverview } from '../components/classroom/ClassroomGroupOverview';
import { SharingToolsPanel } from '../components/sharing/SharingToolsPanel';
import { TestingResetPanel } from '../components/testing/TestingResetPanel';
import { SimulationManagementPanel } from '../components/simulation/SimulationManagementPanel';
import { DebriefSummaryPanel } from '../components/debrief/DebriefSummaryPanel';
import { useSimulation } from '../hooks/useSimulation';
import { IncidentSeverity, Simulation } from '../models';
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
  const [sceneAssessmentIncidentId, setSceneAssessmentIncidentId] = useState<string | null>(null);
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
  const simulation = state.simulation;
  const studentIsWaiting = !isFacilitator && simulation.status !== 'active';
  const blockedStudentMessage =
    simulation.status === 'completed'
      ? 'Simulatsioon on lõpetatud.'
      : simulation.status === 'archived'
      ? 'Simulatsioon on arhiveeritud.'
      : 'Simulatsioon ei ole veel käivitatud.';
  const ensureStudentCanAct = () => {
    if (isFacilitator || simulation.status === 'active') return true;
    window.alert(blockedStudentMessage);
    return false;
  };
  const confirmReassignment = (officerId: string) => {
    if (!ensureStudentCanAct()) return false;
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
  const addSceneAssessmentToIncident = (incidentId: string, assessment: SceneAssessmentPayload) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    sim.addSceneAssessment(incidentId, assessment, `Õppejõud lisas kohapealse hinnangu: ${incident.title}`);
    setSceneAssessmentIncidentId(null);
  };
  const addSceneAssessmentToAllGroups = (incidentId: string, assessment: SceneAssessmentPayload) => {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    void sim.addSceneAssessmentForAllClassroomGroups(incidentId, assessment);
    setSceneAssessmentIncidentId(null);
  };
  const resetCurrentSimulation = () => {
    if (window.confirm('Kas oled kindel? See taastab simulatsiooni algseisu.')) {
      sim.resetSimulation();
    }
  };
  const resetClassroomGroup = (simulationId: string) => {
    void sim.resetClassroomGroup(simulationId);
  };
  const currentSimulationId = state.simulation.id;
  const resetSelectedClassroomGroup = () => {
    void sim.resetClassroomGroup(currentSimulationId);
  };
  const resetAllClassroomGroups = () => {
    void sim.resetAllClassroomGroups();
  };

  if (studentIsWaiting) {
    return (
      <div style={appShellStyle}>
        <Header
          role={state.role}
          simulation={state.simulation}
          classroomExercise={state.classroomExercise}
          warnings={[]}
          syncStatus={state.syncStatus}
          syncMessage={state.syncMessage}
          onBack={sim.leaveSimulation}
        />
        <StudentWaitingView simulation={state.simulation} />
      </div>
    );
  }

  return (
    <div style={appShellStyle}>
      <Header
        role={state.role}
        simulation={state.simulation}
        classroomExercise={state.classroomExercise}
        warnings={state.warnings}
        syncStatus={state.syncStatus}
        syncMessage={state.syncMessage}
        onBack={sim.leaveSimulation}
        onStart={isFacilitator ? sim.startSimulation : undefined}
      />

      {isFacilitator && (
        <SharingToolsPanel
          simulation={state.simulation}
          classroomExercise={state.classroomExercise}
        />
      )}

      {isFacilitator && (
        <TestingResetPanel
          simulation={state.simulation}
          classroomExercise={state.classroomExercise}
          onCreateCleanSimulation={sim.createCleanSimulation}
          onResetSimulation={sim.resetSimulation}
          onResetSelectedGroup={resetSelectedClassroomGroup}
          onResetAllGroups={resetAllClassroomGroups}
        />
      )}

      {isFacilitator && (
        <SimulationManagementPanel
          currentSimulationId={state.simulation.id}
          onOpenSimulation={sim.openSimulationById}
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

      {isFacilitator && (
        <DebriefSummaryPanel
          simulation={state.simulation}
          classroomExercise={state.classroomExercise}
          classroomSnapshots={state.classroomSnapshots}
          buildings={state.buildings}
          officers={state.officers}
          incidents={state.incidents}
          buses={state.buses}
          warnings={state.warnings}
          decisionLog={state.decisionLog}
        />
      )}

      <div style={dashboardStyle}>
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
          onUpdateOfficer={sim.updateOfficer}
          onRemoveOfficer={sim.removeOfficer}
          onUpdateBuildingMinimum={sim.updateBuildingMinimum}
          onUpdateBuildingMinimums={sim.updateBuildingMinimums}
          onSetSetupMode={sim.setSetupMode}
          onStartSimulation={sim.startSimulation}
        />

        <div style={mapColumnStyle}>
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
            onOfficerDropToIncident={assignDroppedOfficerToIncident}
            onOfficerDropToBus={assignDroppedOfficerToBus}
            onSelectOfficer={setSelectedOfficerId}
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
          onAddSceneAssessment={setSceneAssessmentIncidentId}
          onEscalate={(id) => setEscalateIncidentId(id)}
          onCloseIncident={sim.closeIncident}
          onOfficerDropToIncident={assignDroppedOfficerToIncident}
          onSelectOfficer={setSelectedOfficerId}
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
            sim.createIncident(buildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
            setIncidentFormBuildingId(null);
          }}
          onSubmitAllGroups={
            state.classroomExercise && isFacilitator
              ? (buildingId, title, desc, sev, req, escort, taser, externalEscort) => {
                  void sim.createIncidentForAllClassroomGroups(buildingId, title, desc, sev as IncidentSeverity, req, escort, taser, externalEscort);
                  setIncidentFormBuildingId(null);
                }
              : undefined
          }
          selectedGroupName={state.simulation.classroomGroupName}
          onCancel={() => setIncidentFormBuildingId(null)}
        />
      )}

      {sceneAssessmentIncidentId && (() => {
        const incident = state.incidents.find((item) => item.id === sceneAssessmentIncidentId);
        if (!incident) return null;
        return (
          <SceneAssessmentForm
            incident={incident}
            onSubmit={(assessment) => addSceneAssessmentToIncident(sceneAssessmentIncidentId, assessment)}
            onSubmitAllGroups={
              state.classroomExercise
                ? (assessment) => addSceneAssessmentToAllGroups(sceneAssessmentIncidentId, assessment)
                : undefined
            }
            onCancel={() => setSceneAssessmentIncidentId(null)}
          />
        );
      })()}

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

const StudentWaitingView: React.FC<{ simulation: Simulation }> = ({ simulation }) => {
  const completed = simulation.status === 'completed';
  const archived = simulation.status === 'archived';
  return (
    <main style={waitingShellStyle}>
      <section style={waitingCardStyle}>
        <div style={waitingRoleStyle}>Korrapidaja / juht</div>
        <h1 style={waitingTitleStyle}>{simulation.name}</h1>
        {simulation.classroomGroupName && <div style={waitingGroupStyle}>{simulation.classroomGroupName}</div>}
        {archived ? (
          <>
            <p style={waitingLeadStyle}>Simulatsioon on arhiveeritud.</p>
            <p style={waitingTextStyle}>Õppejõud saab avada uue aktiivse simulatsiooni.</p>
          </>
        ) : completed ? (
          <>
            <p style={waitingLeadStyle}>Simulatsioon on lõpetatud.</p>
            <p style={waitingTextStyle}>Õppejõud saab vaadata kokkuvõtet ja logisid.</p>
          </>
        ) : (
          <>
            <p style={waitingLeadStyle}>Simulatsioon ei ole veel käivitatud.</p>
            <p style={waitingTextStyle}>Oota õppejõu märguannet.</p>
            <p style={waitingTextStyle}>Kui simulatsioon algab, avaneb korrapidaja töölaud automaatselt.</p>
          </>
        )}
      </section>
    </main>
  );
};

const appShellStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-base)',
};

const dashboardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '240px minmax(0, 1fr) 290px',
  gap: 10,
  padding: 10,
  minHeight: 660,
  height: 'calc(100vh - 74px)',
  maxHeight: 820,
  overflow: 'visible',
};

const mapColumnStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  position: 'relative',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  background: 'var(--bg-base)',
};

const waitingShellStyle: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
};

const waitingCardStyle: React.CSSProperties = {
  width: 'min(560px, 100%)',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  boxShadow: 'var(--shadow-card)',
};

const waitingRoleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--cyan)',
  textTransform: 'uppercase',
  letterSpacing: 1.4,
};

const waitingTitleStyle: React.CSSProperties = {
  margin: '8px 0 6px',
  fontFamily: 'var(--font-display)',
  fontSize: 28,
  color: 'var(--text-primary)',
};

const waitingGroupStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  marginBottom: 14,
};

const waitingLeadStyle: React.CSSProperties = {
  margin: '10px 0 4px',
  color: 'var(--text-primary)',
  fontSize: 18,
  fontWeight: 700,
};

const waitingTextStyle: React.CSSProperties = {
  margin: '5px 0',
  color: 'var(--text-secondary)',
  fontSize: 14,
};

export default App;
