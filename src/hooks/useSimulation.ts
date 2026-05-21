import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AppRole,
  AppState,
  Building,
  ClassroomExercise,
  ClassroomGroup,
  DecisionLogEntry,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdate,
  LogActor,
  Officer,
  OfficerGender,
  OfficerRole,
  Participant,
  SharedScenarioEvent,
  SetupMode,
  Simulation,
  SimulationSnapshot,
  Warning,
} from '../models';
import {
  BUILDING_NAMES_BY_ID,
  BUS_NAMES_BY_ID,
  RESOURCE_POOL_ID,
  createDefaultBuildings,
  createDefaultBuses,
  createDefaultOfficers,
  createDefaultSimulation,
} from '../data/demoData';
import { calculateWarnings } from '../lib/calculations';
import {
  getClassroomExerciseByTeacherCode,
  getSimulationByJoinCode,
  hasSupabaseConfig,
  loadLocalSnapshotById,
  loadSnapshotById,
  normalizeJoinCode,
  saveClassroomExercise,
  saveSnapshot,
  supabaseConfigWarning,
  subscribeToSimulation,
} from '../lib/sharedSimulationStore';

function now() {
  return new Date().toISOString();
}

function generateJoinCode() {
  return `VJ-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateTeacherCode() {
  return `OP-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateStudentCode() {
  return `OPIL-${Math.floor(1000 + Math.random() * 9000)}`;
}

function uniqueCode(generator: () => string, usedCodes: Set<string>) {
  let code = generator();
  while (usedCodes.has(normalizeJoinCode(code))) code = generator();
  usedCodes.add(normalizeJoinCode(code));
  return code;
}

function actorForRole(role: AppRole | null): LogActor {
  return role === 'facilitator' ? 'teacher' : role === 'commander' ? 'student' : 'system';
}

function isOccupied(officer: Officer) {
  return Boolean(officer.currentIncidentId || officer.currentBusId || officer.status === 'busy' || officer.status === 'unavailable');
}

function officerAssignmentLabel(officer: Officer, state: AppState) {
  return (
    state.incidents.find((incident) => incident.id === officer.currentIncidentId)?.title ??
    state.buses.find((bus) => bus.id === officer.currentBusId)?.name ??
    state.buildings.find((building) => building.id === officer.currentBuildingId)?.name ??
    (officer.status === 'busy' ? 'Hõivatud' : officer.status === 'unavailable' ? 'Mängust väljas' : 'Asukoht puudub')
  );
}

function assignmentLog(officer: Officer, state: AppState, targetLabel: string, fallback: string) {
  return isOccupied(officer)
    ? `Ametnik ${officer.name} suunati ümber: ${officerAssignmentLabel(officer, state)} → ${targetLabel}`
    : fallback;
}

function unavailableWarning(officer: Officer) {
  return `Hoiatus tekkis: ametnik ${officer.name} on mängust väljas ja teda ei saa suunata.`;
}

function emptyState(): AppState {
  return {
    role: null,
    participant: null,
    simulation: null,
    classroomExercise: null,
    classroomSnapshots: [],
    participants: [],
    buildings: [],
    officers: [],
    incidents: [],
    buses: [],
    decisionLog: [],
    warnings: [],
    syncStatus: hasSupabaseConfig ? 'supabase' : 'local',
    syncMessage: supabaseConfigWarning,
  };
}

function localSyncMessage() {
  return supabaseConfigWarning ?? (hasSupabaseConfig ? 'Supabase ühendus ebaõnnestus, kasutatakse kohalikku režiimi' : undefined);
}

function toSnapshot(state: AppState): SimulationSnapshot | null {
  if (!state.simulation) return null;
  return {
    simulation: state.simulation,
    classroomExercise: state.classroomExercise,
    participants: state.participants,
    buildings: state.buildings,
    officers: state.officers,
    incidents: state.incidents,
    buses: state.buses,
    decisionLog: state.decisionLog,
  };
}

function withSnapshot(state: AppState, snapshot: SimulationSnapshot): AppState {
  const classroomExercise = snapshot.classroomExercise ?? state.classroomExercise ?? null;
  const simulation = {
    ...snapshot.simulation,
    studentCode: snapshot.simulation.studentCode ?? snapshot.simulation.joinCode,
  };
  const buildings = snapshot.buildings.map((building) => ({
    ...building,
    name: BUILDING_NAMES_BY_ID[building.id] ?? (building.isResourcePool ? BUILDING_NAMES_BY_ID[RESOURCE_POOL_ID] : building.name),
  }));
  const buses = snapshot.buses.map((bus) => ({
    ...bus,
    name: BUS_NAMES_BY_ID[bus.id] ?? bus.name,
  }));
  const officers = snapshot.officers.map((officer) => ({
    ...officer,
    role: officer.role ?? 'valvur',
    homeBuildingId:
      officer.homeBuildingId ??
      (!officer.currentIncidentId && !officer.currentBusId && officer.currentBuildingId && officer.currentBuildingId !== RESOURCE_POOL_ID
        ? officer.currentBuildingId
        : null),
  }));

  return {
    ...state,
    ...snapshot,
    simulation,
    classroomExercise: classroomExercise
      ? { ...classroomExercise, sharedScenarioEvents: classroomExercise.sharedScenarioEvents ?? [] }
      : null,
    classroomSnapshots: state.classroomSnapshots,
    buildings,
    officers,
    buses,
    warnings: calculateWarnings(buildings, officers, snapshot.incidents, buses),
    syncStatus: hasSupabaseConfig ? 'supabase' : 'local',
    syncMessage: supabaseConfigWarning,
  };
}

function logEntry(simulationId: string, actor: LogActor, text: string): DecisionLogEntry {
  return {
    id: uuidv4(),
    simulationId,
    actor,
    text,
    createdAt: now(),
  };
}

function appendLog(state: AppState, actor: LogActor, text: string) {
  if (!state.simulation) return state;
  return {
    ...state,
    decisionLog: [logEntry(state.simulation.id, actor, text), ...state.decisionLog],
  };
}

function snapshotWithIncident(
  snapshot: SimulationSnapshot,
  classroomExercise: ClassroomExercise | null,
  buildingId: string,
  title: string,
  description: string,
  severity: IncidentSeverity,
  requiredOfficers: number,
  requiresEscortPermission: boolean,
  requiresTaserPermission: boolean,
  externalEscortRequired: boolean,
  logText: string,
  sharedScenarioEventId?: string
): SimulationSnapshot | null {
  const base = withSnapshot(
    {
      ...emptyState(),
      role: 'facilitator',
      classroomExercise: snapshot.classroomExercise ?? classroomExercise,
    },
    snapshot
  );
  if (!base.simulation) return null;
  const building = base.buildings.find((item) => item.id === buildingId) ?? base.buildings.find((item) => !item.isResourcePool);
  if (!building || building.isResourcePool) return null;
  const incident: Incident = {
    id: uuidv4(),
    simulationId: base.simulation.id,
    sharedScenarioEventId,
    buildingId: building.id,
    title,
    description,
    severity,
    requiredOfficers,
    requiresEscortPermission,
    requiresTaserPermission,
    externalEscortRequired,
    status: 'active',
    updates: [],
    createdAt: now(),
  };
  return toSnapshot(finalizeState(base, appendLog({ ...base, incidents: [...base.incidents, incident] }, 'teacher', logText)));
}

function snapshotWithEscalation(
  snapshot: SimulationSnapshot,
  incidentMatch: { sharedScenarioEventId?: string; title: string; buildingId: string },
  text: string,
  severity: IncidentSeverity,
  requiredOfficers: number,
  requiresEscortPermission: boolean,
  requiresTaserPermission: boolean,
  externalEscortRequired: boolean,
  logText: string
): SimulationSnapshot | null {
  const base = withSnapshot(emptyState(), snapshot);
  if (!base.simulation) return null;
  const incident = base.incidents.find((item) =>
    incidentMatch.sharedScenarioEventId
      ? item.sharedScenarioEventId === incidentMatch.sharedScenarioEventId && item.status !== 'closed'
      : item.title === incidentMatch.title && item.buildingId === incidentMatch.buildingId && item.status !== 'closed'
  );
  if (!incident) return null;

  const update: IncidentUpdate = { id: uuidv4(), incidentId: incident.id, text, createdAt: now() };
  const incidents = base.incidents.map((item) =>
    item.id === incident.id
      ? {
          ...item,
          status: 'escalated' as const,
          severity,
          requiredOfficers,
          requiresEscortPermission,
          requiresTaserPermission,
          externalEscortRequired,
          updates: [...item.updates, update],
        }
      : item
  );

  return toSnapshot(finalizeState(base, appendLog({ ...base, incidents }, 'teacher', logText)));
}

function warningSignature(warning: Warning) {
  return `${warning.type}:${warning.relatedBuildingId ?? ''}:${warning.relatedIncidentId ?? ''}:${warning.relatedBusId ?? ''}`;
}

function finalizeState(previous: AppState, next: AppState): AppState {
  if (!next.simulation) return next;

  const previousWarnings = new Set(previous.warnings.map(warningSignature));
  const warnings = calculateWarnings(next.buildings, next.officers, next.incidents, next.buses);
  const newWarnings = warnings.filter((warning) => !previousWarnings.has(warningSignature(warning)));
  const warningLogs = newWarnings.map((warning) => logEntry(next.simulation!.id, 'system', `Hoiatus tekkis: ${warning.message}`));

  return {
    ...next,
    warnings,
    decisionLog: warningLogs.length > 0 ? [...warningLogs, ...next.decisionLog] : next.decisionLog,
    simulation: { ...next.simulation, updatedAt: now() },
  };
}

function removeOfficerFromAllIncidents(officerId: string, incidents: Incident[]) {
  return incidents.map((incident) => ({
    ...incident,
    updates: incident.updates,
  }));
}

export function useSimulation() {
  const [state, setState] = useState<AppState>(() => emptyState());

  const persist = useCallback((next: AppState) => {
    const snapshot = toSnapshot(next);
    if (!snapshot) return;

    saveSnapshot(snapshot)
      .then((mode) => {
        setState((current) => ({
          ...current,
          syncStatus: mode,
          syncMessage: mode === 'local' ? localSyncMessage() : undefined,
        }));
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          syncStatus: 'error',
          syncMessage: error instanceof Error ? error.message : 'Sünkroonimine ebaõnnestus',
        }));
      });
  }, []);

  const commit = useCallback(
    (updater: (state: AppState) => AppState) => {
      setState((current) => {
        const next = finalizeState(current, updater(current));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  useEffect(() => {
    if (!state.simulation) return undefined;
    return subscribeToSimulation(state.simulation.id, (snapshot) => {
      setState((current) => withSnapshot(current, snapshot));
    });
  }, [state.simulation?.id]);

  useEffect(() => {
    if (!state.classroomExercise || state.role !== 'facilitator') return undefined;
    let stopped = false;

    const refresh = async () => {
      const exercise = state.classroomExercise;
      if (!exercise) return;
      const loaded = await Promise.all(exercise.groups.map((group) => loadSnapshotById(group.simulationId)));
      if (stopped) return;
      const snapshots = loaded.map((result) => result.snapshot).filter((snapshot): snapshot is SimulationSnapshot => Boolean(snapshot));
      setState((current) => ({
        ...current,
        classroomSnapshots: snapshots,
      }));
    };

    void refresh();
    const interval = window.setInterval(refresh, hasSupabaseConfig ? 2500 : 1200);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [state.classroomExercise?.id, state.role]);

  const createSimulation = useCallback(
    (name: string, setupMode: SetupMode, displayName: string) => {
      const simulationId = uuidv4();
      const teacherCode = generateTeacherCode();
      let studentCode = generateStudentCode();
      while (studentCode === teacherCode) studentCode = generateStudentCode();
      const joinCode = studentCode;
      const simulation: Simulation = {
        ...createDefaultSimulation(simulationId, joinCode, name.trim() || 'Valvejuhtimise simulatsioon', teacherCode, studentCode),
        setupMode,
      };
      const participant: Participant = {
        id: uuidv4(),
        simulationId,
        role: 'teacher',
        displayName: displayName.trim() || 'Õppejõud',
        joinedAt: now(),
      };
      const buildings = createDefaultBuildings(simulationId);
      const buses = createDefaultBuses(simulationId);
      const officers = createDefaultOfficers(simulationId, setupMode === 'student_places_officers');
      const initial: AppState = finalizeState(emptyState(), {
        ...emptyState(),
        role: 'facilitator',
        participant,
        simulation,
        participants: [participant],
        buildings,
        officers,
        buses,
        incidents: [],
        decisionLog: [
          logEntry(simulationId, 'teacher', 'Simulatsioon loodud. Õppejõu ja õpilase koodid genereeritud.'),
          logEntry(simulationId, 'teacher', `Simulatsioon loodud (${setupMode === 'teacher_assigned' ? 'õppejõud määrab algpaigutuse' : 'korrapidaja paigutab ametnikud'})`),
        ],
      });
      setState(initial);
      persist(initial);
      window.history.replaceState(null, '', `?join=${teacherCode}&role=teacher`);
    },
    [persist]
  );

  const createClassroomExercise = useCallback(
    (name: string, setupMode: SetupMode, displayName: string, requestedGroupCount: number) => {
      const groupCount = Math.min(8, Math.max(2, Math.round(requestedGroupCount) || 6));
      const classroomExerciseId = uuidv4();
      const createdAt = now();
      const usedCodes = new Set<string>();
      const classroomTeacherCode = uniqueCode(generateTeacherCode, usedCodes);
      const title = name.trim() || 'Valvejuhtimise õppus';
      const teacherDisplayName = displayName.trim() || 'Õppejõud';

      const groups: ClassroomGroup[] = Array.from({ length: groupCount }, (_, index) => {
        const groupIndex = index + 1;
        return {
          simulationId: uuidv4(),
          groupName: `Grupp ${groupIndex}`,
          groupIndex,
          studentCode: uniqueCode(generateStudentCode, usedCodes),
          teacherCode: uniqueCode(generateTeacherCode, usedCodes),
        };
      });

      const exercise: ClassroomExercise = {
        id: classroomExerciseId,
        title,
        createdAt,
        teacherCode: classroomTeacherCode,
        groupCount,
        groups,
        sharedScenarioEvents: [],
      };

      const snapshots: SimulationSnapshot[] = groups.map((group) => {
        const simulation: Simulation = {
          ...createDefaultSimulation(group.simulationId, group.studentCode, `${title} - ${group.groupName}`, group.teacherCode, group.studentCode),
          setupMode,
          classroomExerciseId,
          classroomGroupName: group.groupName,
          classroomGroupIndex: group.groupIndex,
          classroomGroupCount: groupCount,
        };
        const participant: Participant = {
          id: uuidv4(),
          simulationId: group.simulationId,
          role: 'teacher',
          displayName: teacherDisplayName,
          joinedAt: createdAt,
        };
        const buildings = createDefaultBuildings(group.simulationId);
        const buses = createDefaultBuses(group.simulationId);
        const officers = createDefaultOfficers(group.simulationId, setupMode === 'student_places_officers');
        return {
          simulation,
          classroomExercise: exercise,
          participants: [participant],
          buildings,
          officers,
          buses,
          incidents: [],
          decisionLog: [
            logEntry(group.simulationId, 'teacher', `Klassiruumi harjutus loodud: ${group.groupName}.`),
            logEntry(group.simulationId, 'teacher', `Simulatsioon loodud (${setupMode === 'teacher_assigned' ? 'õppejõud määrab algpaigutuse' : 'korrapidaja paigutab ametnikud'})`),
          ],
        };
      });

      const firstSnapshot = snapshots[0];
      const firstParticipant = firstSnapshot.participants[0];
      const initial = finalizeState(emptyState(), {
        ...emptyState(),
        ...firstSnapshot,
        role: 'facilitator',
        participant: firstParticipant,
        classroomExercise: exercise,
        classroomSnapshots: snapshots,
        warnings: calculateWarnings(firstSnapshot.buildings, firstSnapshot.officers, firstSnapshot.incidents, firstSnapshot.buses),
      });

      setState(initial);
      void saveClassroomExercise(exercise);
      snapshots.forEach((snapshot) => {
        void saveSnapshot(snapshot);
      });
      window.history.replaceState(null, '', `?join=${classroomTeacherCode}&role=teacher&group=${firstSnapshot.simulation.id}`);
    },
    []
  );

  const joinSimulation = useCallback(
    async (joinCode: string, requestedRole: AppRole | null, displayName: string) => {
      setState((current) => ({ ...current, syncStatus: 'loading', syncMessage: 'Liitumine simulatsiooniga...' }));
      try {
        const normalizedJoinCode = normalizeJoinCode(joinCode);
        if (!normalizedJoinCode) {
          setState((current) => ({ ...current, syncStatus: hasSupabaseConfig ? 'supabase' : 'local', syncMessage: 'Koodi ei leitud.' }));
          return false;
        }

        const result = await getSimulationByJoinCode(normalizedJoinCode);
        const snapshot = result.snapshot;
        if (!snapshot) {
          if (!requestedRole || requestedRole === 'facilitator') {
            const classroomResult = await getClassroomExerciseByTeacherCode(normalizedJoinCode);
            const exercise = classroomResult.exercise;
            const requestedGroupId = new URLSearchParams(window.location.search).get('group');
            const group = requestedGroupId
              ? exercise?.groups.find((item) => item.simulationId === requestedGroupId) ?? exercise?.groups[0]
              : exercise?.groups[0];
            if (exercise && group) {
              const groupResult = await loadSnapshotById(group.simulationId);
              if (groupResult.snapshot) {
                const participant: Participant = {
                  id: uuidv4(),
                  simulationId: groupResult.snapshot.simulation.id,
                  role: 'teacher',
                  displayName: displayName.trim() || 'Õppejõud',
                  joinedAt: now(),
                };
                const base = withSnapshot(emptyState(), { ...groupResult.snapshot, classroomExercise: exercise });
                const next = finalizeState(base, {
                  ...base,
                  role: 'facilitator',
                  participant,
                  classroomExercise: exercise,
                  classroomSnapshots: [groupResult.snapshot],
                });
                setState(next);
                persist(next);
                window.history.replaceState(null, '', `?join=${exercise.teacherCode}&role=teacher&group=${group.simulationId}`);
                return true;
              }
            }
          }

          setState((current) => ({
            ...current,
            syncStatus: result.mode,
            syncMessage: result.message ?? 'Koodi ei leitud.',
          }));
          return false;
        }

        const role = result.matchedRole;
        if (!role) {
          setState((current) => ({
            ...current,
            syncStatus: result.mode,
            syncMessage: 'Selle koodiga ei saa sellesse vaatesse siseneda',
          }));
          return false;
        }

        if (requestedRole && requestedRole !== role) {
          setState((current) => ({
            ...current,
            syncStatus: result.mode,
            syncMessage:
              role === 'commander'
                ? 'Selle koodiga saab siseneda ainult korrapidaja vaatesse.'
                : 'Selle koodiga saab siseneda ainult õppejõu vaatesse.',
          }));
          return false;
        }

        const participant: Participant = {
          id: uuidv4(),
          simulationId: snapshot.simulation.id,
          role: role === 'facilitator' ? 'teacher' : 'student',
          displayName: displayName.trim() || (role === 'facilitator' ? 'Õppejõud' : 'Korrapidaja'),
          joinedAt: now(),
        };

        const base = withSnapshot(emptyState(), snapshot);
        const next = finalizeState(base, {
          ...base,
          role,
          participant,
          classroomExercise: snapshot.classroomExercise ?? null,
          syncStatus: result.mode,
          syncMessage: result.message,
          participants: [...snapshot.participants, participant],
          decisionLog: [
            logEntry(snapshot.simulation.id, role === 'facilitator' ? 'teacher' : 'student', role === 'facilitator' ? 'Õppejõud liitus simulatsiooniga.' : 'Korrapidaja liitus simulatsiooniga.'),
            ...snapshot.decisionLog,
          ],
        });

        setState(next);
        persist(next);
        const roleCode = role === 'facilitator' ? snapshot.simulation.teacherCode ?? normalizedJoinCode : snapshot.simulation.studentCode ?? snapshot.simulation.joinCode;
        window.history.replaceState(null, '', `?join=${roleCode}&role=${role === 'facilitator' ? 'teacher' : 'student'}`);
        return true;
      } catch (error) {
        setState((current) => ({
          ...current,
          syncStatus: 'error',
          syncMessage: error instanceof Error ? error.message : 'Simulatsiooniga liitumine ebaõnnestus',
        }));
        return false;
      }
    },
    [persist]
  );

  const leaveSimulation = useCallback(() => {
    setState(emptyState());
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const openClassroomGroup = useCallback(
    async (simulationId: string) => {
      const exercise = state.classroomExercise;
      if (!exercise || state.role !== 'facilitator') return false;
      const result = await loadSnapshotById(simulationId);
      if (!result.snapshot) {
        setState((current) => ({
          ...current,
          syncStatus: result.mode,
          syncMessage: result.message ?? 'Gruppi ei leitud.',
        }));
        return false;
      }

      setState((current) => {
        const base = withSnapshot(current, { ...result.snapshot!, classroomExercise: exercise });
        return {
          ...base,
          role: 'facilitator',
          participant: current.participant
            ? { ...current.participant, simulationId: result.snapshot!.simulation.id, role: 'teacher' }
            : {
                id: uuidv4(),
                simulationId: result.snapshot!.simulation.id,
                role: 'teacher',
                displayName: 'Õppejõud',
                joinedAt: now(),
              },
          classroomExercise: exercise,
          syncStatus: result.mode,
          syncMessage: result.message,
        };
      });
      window.history.replaceState(null, '', `?join=${exercise.teacherCode}&role=teacher&group=${simulationId}`);
      return true;
    },
    [state.classroomExercise, state.role]
  );

  const resetSimulation = useCallback(() => {
    commit((current) => {
      if (!current.simulation) return current;
      const placeInPool = current.simulation.setupMode === 'student_places_officers';
      return appendLog(
        {
          ...current,
          simulation: { ...current.simulation, status: 'setup' },
          buildings: createDefaultBuildings(current.simulation.id),
          officers: createDefaultOfficers(current.simulation.id, placeInPool),
          buses: createDefaultBuses(current.simulation.id),
          incidents: [],
        },
        'teacher',
        'Simulatsioon lähtestati algolukorda'
      );
    });
  }, [commit]);

  const startSimulation = useCallback(() => {
    commit((current) => {
      if (!current.simulation) return current;
      return appendLog(
        { ...current, simulation: { ...current.simulation, status: 'active' } },
        actorForRole(current.role),
        'Simulatsioon käivitati'
      );
    });
  }, [commit]);

  const setSetupMode = useCallback(
    (setupMode: SetupMode) => {
      commit((current) => {
        if (!current.simulation || current.simulation.status !== 'setup') return current;
        const firstBuildingId = current.buildings.find((building) => !building.isResourcePool)?.id ?? RESOURCE_POOL_ID;
        const officers = current.officers.map((officer) => ({
          ...officer,
          status: setupMode === 'student_places_officers' ? ('available' as const) : officer.status === 'available' ? ('in_building' as const) : officer.status,
          homeBuildingId:
            setupMode === 'student_places_officers'
              ? null
              : officer.homeBuildingId && officer.homeBuildingId !== RESOURCE_POOL_ID
              ? officer.homeBuildingId
              : firstBuildingId,
          currentBuildingId:
            setupMode === 'student_places_officers'
              ? RESOURCE_POOL_ID
              : officer.currentBuildingId === RESOURCE_POOL_ID
              ? officer.homeBuildingId && officer.homeBuildingId !== RESOURCE_POOL_ID
                ? officer.homeBuildingId
                : firstBuildingId
              : officer.currentBuildingId,
          currentIncidentId: null,
          currentBusId: null,
        }));
        return appendLog(
          {
            ...current,
            simulation: { ...current.simulation, setupMode },
            officers,
            incidents: [],
          },
          'teacher',
          `Algseadistuse režiim muudeti: ${setupMode === 'teacher_assigned' ? 'õppejõud määrab algpaigutuse' : 'korrapidaja paigutab ametnikud'}`
        );
      });
    },
    [commit]
  );

  const moveOfficerToBuilding = useCallback(
    (officerId: string, buildingId: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const officer = current.officers.find((item) => item.id === officerId);
        const building = current.buildings.find((item) => item.id === buildingId);
        if (!officer || !building) return current;
        if (officer.status === 'unavailable') {
          return appendLog(current, 'system', unavailableWarning(officer));
        }

        const officers = current.officers.map((item) =>
          item.id === officerId
            ? {
                ...item,
                homeBuildingId: !building.isResourcePool && !item.homeBuildingId ? buildingId : item.homeBuildingId,
                currentBuildingId: buildingId,
                currentIncidentId: null,
                currentBusId: null,
                status: building.isResourcePool ? ('available' as const) : ('in_building' as const),
              }
            : item
        );

        return appendLog(
          {
            ...current,
            officers,
            incidents: removeOfficerFromAllIncidents(officerId, current.incidents),
          },
          actorForRole(current.role),
          assignmentLog(officer, current, building.name, `Ametnik ${officer.name} suunati: ${building.name}`)
        );
      });
    },
    [commit]
  );

  const assignOfficerToIncident = useCallback(
    (officerId: string, incidentId: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const officer = current.officers.find((item) => item.id === officerId);
        const incident = current.incidents.find((item) => item.id === incidentId && item.status !== 'closed');
        if (!officer || !incident) return current;
        if (officer.status === 'unavailable') {
          return appendLog(current, 'system', unavailableWarning(officer));
        }

        const officers = current.officers.map((item) =>
          item.id === officerId
            ? {
                ...item,
                currentBuildingId: null,
                currentIncidentId: incidentId,
                currentBusId: null,
                status: 'on_incident' as const,
              }
            : item
        );

        return appendLog(
          { ...current, officers },
          actorForRole(current.role),
          assignmentLog(officer, current, incident.title, `Ametnik ${officer.name} määrati sündmusele "${incident.title}"`)
        );
      });
    },
    [commit]
  );

  const assignOfficerToBus = useCallback(
    (officerId: string, busId: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const officer = current.officers.find((item) => item.id === officerId);
        const bus = current.buses.find((item) => item.id === busId);
        if (!officer || !bus) return current;
        if (officer.status === 'unavailable') {
          return appendLog(current, 'system', unavailableWarning(officer));
        }
        if (!officer.hasEscortPermission) {
          return appendLog(
            current,
            'system',
            `Hoiatus tekkis: ametnikul ${officer.name} puudub saateõigus. Saatebussi saab määrata ainult saateõigusega ametniku.`
          );
        }

        const officers = current.officers.map((item) =>
          item.id === officerId
            ? {
                ...item,
                currentBuildingId: null,
                currentIncidentId: null,
                currentBusId: busId,
                status: 'on_escort' as const,
              }
            : item
        );

        return appendLog(
          { ...current, officers },
          actorForRole(current.role),
          assignmentLog(officer, current, bus.name, `Ametnik ${officer.name} määrati: ${bus.name}`)
        );
      });
    },
    [commit]
  );

  const releaseOfficer = useCallback(
    (officerId: string) => {
      moveOfficerToBuilding(officerId, RESOURCE_POOL_ID);
    },
    [moveOfficerToBuilding]
  );

  const createIncident = useCallback(
    (
      buildingId: string,
      title: string,
      description: string,
      severity: IncidentSeverity,
      requiredOfficers: number,
      requiresEscortPermission: boolean,
      requiresTaserPermission: boolean,
      externalEscortRequired: boolean,
      logText?: string
    ) => {
      commit((current) => {
        if (!current.simulation) return current;
        const building = current.buildings.find((item) => item.id === buildingId);
        if (!building || building.isResourcePool) return current;
        const incident: Incident = {
          id: uuidv4(),
          simulationId: current.simulation.id,
          buildingId,
          title,
          description,
          severity,
          requiredOfficers,
          requiresEscortPermission,
          requiresTaserPermission,
          externalEscortRequired,
          status: 'active',
          updates: [],
          createdAt: now(),
        };
        return appendLog(
          { ...current, incidents: [...current.incidents, incident] },
          'teacher',
          logText ?? `Sündmus lisatud: "${title}" asukohas ${building.name}`
        );
      });
    },
    [commit]
  );

  const createIncidentForAllClassroomGroups = useCallback(
    async (
      buildingId: string,
      title: string,
      description: string,
      severity: IncidentSeverity,
      requiredOfficers: number,
      requiresEscortPermission: boolean,
      requiresTaserPermission: boolean,
      externalEscortRequired: boolean
    ) => {
      const exercise = state.classroomExercise;
      if (!exercise || state.role !== 'facilitator') return false;

      const loaded = await Promise.all(exercise.groups.map((group) => loadSnapshotById(group.simulationId)));
      const selectedSnapshot = loaded.find((result) => result.snapshot?.simulation.id === state.simulation?.id)?.snapshot ?? state;
      const selectedBuilding = selectedSnapshot.buildings.find((item) => item.id === buildingId) ?? selectedSnapshot.buildings.find((item) => !item.isResourcePool);
      if (!selectedBuilding || selectedBuilding.isResourcePool) return false;

      const sharedEvent: SharedScenarioEvent = {
        id: uuidv4(),
        kind: 'incident',
        title,
        description,
        targetBuildingId: selectedBuilding.id,
        targetBuildingName: selectedBuilding.name,
        severity,
        requiredOfficers,
        sentToAllGroups: true,
        createdAt: now(),
      };
      const updatedExercise: ClassroomExercise = {
        ...exercise,
        sharedScenarioEvents: [sharedEvent, ...(exercise.sharedScenarioEvents ?? [])],
      };

      const updatedSnapshots = loaded
        .map((result, index) => {
          const snapshot = result.snapshot;
          const group = exercise.groups[index];
          if (!snapshot || !group) return null;
          return snapshotWithIncident(
            snapshot,
            exercise,
            buildingId,
            title,
            description,
            severity,
            requiredOfficers,
            requiresEscortPermission,
            requiresTaserPermission,
            externalEscortRequired,
            `Õppejõud saatis ühise situatsiooni grupile: ${group.groupName} — ${title}`,
            sharedEvent.id
          );
        })
        .filter((snapshot): snapshot is SimulationSnapshot => Boolean(snapshot))
        .map((snapshot) => ({ ...snapshot, classroomExercise: updatedExercise }));

      await saveClassroomExercise(updatedExercise);
      await Promise.all(updatedSnapshots.map((snapshot) => saveSnapshot(snapshot)));
      setState((current) => {
        const currentSnapshot = updatedSnapshots.find((snapshot) => snapshot.simulation.id === current.simulation?.id);
        if (!currentSnapshot) {
          return { ...current, classroomExercise: updatedExercise, classroomSnapshots: updatedSnapshots };
        }
        return {
          ...withSnapshot(current, currentSnapshot),
          classroomExercise: updatedExercise,
          classroomSnapshots: updatedSnapshots,
        };
      });
      return updatedSnapshots.length > 0;
    },
    [state, state.classroomExercise, state.role]
  );

  const escalateIncident = useCallback(
    (
      incidentId: string,
      text: string,
      severity: IncidentSeverity,
      requiredOfficers: number,
      requiresEscortPermission: boolean,
      requiresTaserPermission: boolean,
      externalEscortRequired: boolean,
      logText?: string,
      nextStatus: IncidentStatus = 'escalated'
    ) => {
      commit((current) => {
        if (!current.simulation) return current;
        const incident = current.incidents.find((item) => item.id === incidentId);
        if (!incident) return current;
        const update: IncidentUpdate = { id: uuidv4(), incidentId, text, createdAt: now() };
        const incidents = current.incidents.map((item) =>
          item.id === incidentId
            ? {
                ...item,
                status: nextStatus,
                severity,
                requiredOfficers,
                requiresEscortPermission,
                requiresTaserPermission,
                externalEscortRequired,
                updates: [...item.updates, update],
              }
            : item
        );
        return appendLog({ ...current, incidents }, 'teacher', logText ?? `Sündmust eskaleeriti: "${incident.title}"`);
      });
    },
    [commit]
  );

  const escalateIncidentForAllClassroomGroups = useCallback(
    async (
      incidentId: string,
      text: string,
      severity: IncidentSeverity,
      requiredOfficers: number,
      requiresEscortPermission: boolean,
      requiresTaserPermission: boolean,
      externalEscortRequired: boolean
    ) => {
      const exercise = state.classroomExercise;
      const selectedIncident = state.incidents.find((item) => item.id === incidentId);
      if (!exercise || state.role !== 'facilitator' || !selectedIncident) return false;

      const building = state.buildings.find((item) => item.id === selectedIncident.buildingId);
      const sharedEvent: SharedScenarioEvent = {
        id: uuidv4(),
        kind: 'escalation',
        parentEventId: selectedIncident.sharedScenarioEventId,
        title: `Eskalatsioon: ${selectedIncident.title}`,
        description: text,
        targetBuildingId: selectedIncident.buildingId,
        targetBuildingName: building?.name ?? selectedIncident.buildingId,
        severity,
        requiredOfficers,
        sentToAllGroups: true,
        createdAt: now(),
      };
      const updatedExercise: ClassroomExercise = {
        ...exercise,
        sharedScenarioEvents: [sharedEvent, ...(exercise.sharedScenarioEvents ?? [])],
      };

      const loaded = await Promise.all(exercise.groups.map((group) => loadSnapshotById(group.simulationId)));
      const updatedSnapshots = loaded
        .map((result, index) => {
          const snapshot = result.snapshot;
          const group = exercise.groups[index];
          if (!snapshot || !group) return null;
          return snapshotWithEscalation(
            { ...snapshot, classroomExercise: updatedExercise },
            {
              sharedScenarioEventId: selectedIncident.sharedScenarioEventId,
              title: selectedIncident.title,
              buildingId: selectedIncident.buildingId,
            },
            text,
            severity,
            requiredOfficers,
            requiresEscortPermission,
            requiresTaserPermission,
            externalEscortRequired,
            `Õppejõud saatis ühise eskalatsiooni grupile: ${group.groupName} — ${selectedIncident.title}`
          );
        })
        .filter((snapshot): snapshot is SimulationSnapshot => Boolean(snapshot))
        .map((snapshot) => ({ ...snapshot, classroomExercise: updatedExercise }));

      await saveClassroomExercise(updatedExercise);
      await Promise.all(updatedSnapshots.map((snapshot) => saveSnapshot(snapshot)));
      setState((current) => {
        const currentSnapshot = updatedSnapshots.find((snapshot) => snapshot.simulation.id === current.simulation?.id);
        if (!currentSnapshot) {
          return { ...current, classroomExercise: updatedExercise, classroomSnapshots: updatedSnapshots };
        }
        return {
          ...withSnapshot(current, currentSnapshot),
          classroomExercise: updatedExercise,
          classroomSnapshots: updatedSnapshots,
        };
      });
      return updatedSnapshots.length > 0;
    },
    [state]
  );

  const markOfficerInjured = useCallback(
    (incidentId: string, officerId: string, logText?: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const incident = current.incidents.find((item) => item.id === incidentId && item.status !== 'closed');
        const officer = current.officers.find((item) => item.id === officerId && item.currentIncidentId === incidentId);
        if (!incident || !officer) return current;

        const text = `Olukord eskaleerus: ametnik ${officer.name} sai vigastada ja on mängust väljas.`;
        const update: IncidentUpdate = { id: uuidv4(), incidentId, text, createdAt: now() };
        const incidents = current.incidents.map((item) =>
          item.id === incidentId
            ? {
                ...item,
                status: 'escalated' as const,
                severity: item.severity === 'critical' ? item.severity : ('high' as const),
                updates: [...item.updates, update],
              }
            : item
        );
        const officers = current.officers.map((item) =>
          item.id === officerId
            ? {
                ...item,
                currentBuildingId: null,
                currentIncidentId: null,
                currentBusId: null,
                status: 'unavailable' as const,
              }
            : item
        );

        return appendLog(
          { ...current, incidents, officers },
          'teacher',
          logText ??
            `Õppejõud märkis ametniku ${officer.name} vigastatuks sündmusel: ${incident.title}. Ametnik eemaldati sündmuselt ja on mängust väljas.`
        );
      });
    },
    [commit]
  );

  const closeIncident = useCallback(
    (incidentId: string, logText?: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const incident = current.incidents.find((item) => item.id === incidentId);
        if (!incident) return current;
        const incidents = current.incidents.map((item) =>
          item.id === incidentId ? { ...item, status: 'closed' as const } : item
        );
        const releasedWithoutHome = current.officers.some((officer) => officer.currentIncidentId === incidentId && !officer.homeBuildingId);
        const officers = current.officers.map((officer) => {
          if (officer.currentIncidentId !== incidentId) return officer;
          const homeBuildingId = officer.homeBuildingId;
          const homeBuilding = homeBuildingId
            ? current.buildings.find((building) => building.id === homeBuildingId && !building.isResourcePool)
            : undefined;
          const targetBuildingId = homeBuilding?.id ?? RESOURCE_POOL_ID;

          return {
            ...officer,
            currentBuildingId: targetBuildingId,
            currentIncidentId: null,
            currentBusId: null,
            status: homeBuilding ? ('in_building' as const) : ('available' as const),
          };
        });
        return appendLog(
          { ...current, incidents, officers },
          'teacher',
          logText ??
            (releasedWithoutHome
              ? `Sündmus lõpetati: "${incident.title}". Ametnikud suunati tagasi määratud üksustesse või valves olevate ametnike hulka.`
              : `Sündmus lõpetati: "${incident.title}". Ametnikud suunati tagasi määratud üksustesse.`)
        );
      });
    },
    [commit]
  );

  const updateBuildingMinimum = useCallback(
    (buildingId: string, minimumStaff: number) => {
      commit((current) => {
        if (!current.simulation) return current;
        const building = current.buildings.find((item) => item.id === buildingId);
        if (!building) return current;
        const buildings = current.buildings.map((item) =>
          item.id === buildingId ? { ...item, minimumStaff: Math.max(0, minimumStaff) } : item
        );
        return appendLog({ ...current, buildings }, 'teacher', `${building.name} miinimumkoosseis määrati: ${minimumStaff}`);
      });
    },
    [commit]
  );

  const addOfficer = useCallback(
    (
      name: string,
      gender: OfficerGender,
      hasEscortPermission: boolean,
      hasTaserPermission: boolean,
      buildingId?: string,
      role: OfficerRole = 'valvur'
    ) => {
      commit((current) => {
        if (!current.simulation) return current;
        const targetId =
          current.simulation.setupMode === 'student_places_officers'
            ? RESOURCE_POOL_ID
            : buildingId ?? current.buildings.find((building) => !building.isResourcePool)?.id ?? RESOURCE_POOL_ID;
        const target = current.buildings.find((building) => building.id === targetId);
        const officer: Officer = {
          id: uuidv4(),
          simulationId: current.simulation.id,
          name: name.trim() || `A${current.officers.length + 1}`,
          gender,
          role,
          hasEscortPermission,
          hasTaserPermission,
          status: target?.isResourcePool ? 'available' : 'in_building',
          homeBuildingId: target?.isResourcePool ? null : targetId,
          currentBuildingId: targetId,
          currentIncidentId: null,
          currentBusId: null,
        };
        return appendLog({ ...current, officers: [...current.officers, officer] }, 'teacher', `Ametnik lisatud: ${officer.name}`);
      });
    },
    [commit]
  );

  const activeIncidents = useMemo(() => state.incidents.filter((incident) => incident.status !== 'closed'), [state.incidents]);

  return {
    state,
    activeIncidents,
    createSimulation,
    createClassroomExercise,
    joinSimulation,
    leaveSimulation,
    openClassroomGroup,
    resetSimulation,
    startSimulation,
    setSetupMode,
    moveOfficerToBuilding,
    assignOfficerToIncident,
    assignOfficerToBus,
    releaseOfficer,
    createIncident,
    createIncidentForAllClassroomGroups,
    escalateIncident,
    escalateIncidentForAllClassroomGroups,
    markOfficerInjured,
    closeIncident,
    updateBuildingMinimum,
    addOfficer,
    loadLocalSnapshotById,
  };
}
