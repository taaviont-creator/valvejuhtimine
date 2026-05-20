import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AppRole,
  AppState,
  Building,
  DecisionLogEntry,
  Incident,
  IncidentSeverity,
  IncidentUpdate,
  LogActor,
  Officer,
  OfficerGender,
  Participant,
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
  getSimulationByJoinCode,
  hasSupabaseConfig,
  loadLocalSnapshotById,
  normalizeJoinCode,
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

function emptyState(): AppState {
  return {
    role: null,
    participant: null,
    simulation: null,
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
    participants: state.participants,
    buildings: state.buildings,
    officers: state.officers,
    incidents: state.incidents,
    buses: state.buses,
    decisionLog: state.decisionLog,
  };
}

function withSnapshot(state: AppState, snapshot: SimulationSnapshot): AppState {
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
    homeBuildingId:
      officer.homeBuildingId ??
      (!officer.currentIncidentId && !officer.currentBusId && officer.currentBuildingId && officer.currentBuildingId !== RESOURCE_POOL_ID
        ? officer.currentBuildingId
        : null),
  }));

  return {
    ...state,
    ...snapshot,
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

  const createSimulation = useCallback(
    (name: string, setupMode: SetupMode, displayName: string) => {
      const simulationId = uuidv4();
      const joinCode = generateJoinCode();
      const simulation: Simulation = {
        ...createDefaultSimulation(simulationId, joinCode, name.trim() || 'Valvejuhtimise simulatsioon'),
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
          logEntry(simulationId, 'teacher', `Simulatsioon loodud (${setupMode === 'teacher_assigned' ? 'õppejõud määrab algpaigutuse' : 'korrapidaja paigutab ametnikud'})`),
        ],
      });
      setState(initial);
      persist(initial);
      window.history.replaceState(null, '', `?join=${joinCode}&role=teacher`);
    },
    [persist]
  );

  const joinSimulation = useCallback(
    async (joinCode: string, role: AppRole, displayName: string) => {
      setState((current) => ({ ...current, syncStatus: 'loading', syncMessage: 'Liitumine simulatsiooniga...' }));
      try {
        const normalizedJoinCode = normalizeJoinCode(joinCode);
        if (!normalizedJoinCode) {
          setState((current) => ({ ...current, syncStatus: hasSupabaseConfig ? 'supabase' : 'local', syncMessage: 'Simulatsiooni koodi ei leitud' }));
          return false;
        }

        const result = await getSimulationByJoinCode(normalizedJoinCode);
        const snapshot = result.snapshot;
        if (!snapshot) {
          setState((current) => ({
            ...current,
            syncStatus: result.mode,
            syncMessage: result.message ?? 'Simulatsiooni koodi ei leitud',
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
          syncStatus: result.mode,
          syncMessage: result.message,
          participants: [...snapshot.participants, participant],
          decisionLog: [
            logEntry(snapshot.simulation.id, role === 'facilitator' ? 'teacher' : 'student', `${participant.displayName} liitus simulatsiooniga`),
            ...snapshot.decisionLog,
          ],
        });

        setState(next);
        persist(next);
        window.history.replaceState(null, '', `?join=${snapshot.simulation.joinCode}&role=${role === 'facilitator' ? 'teacher' : 'student'}`);
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
      externalEscortRequired: boolean
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
          `Sündmus lisatud: "${title}" asukohas ${building.name}`
        );
      });
    },
    [commit]
  );

  const escalateIncident = useCallback(
    (
      incidentId: string,
      text: string,
      severity: IncidentSeverity,
      requiredOfficers: number,
      requiresEscortPermission: boolean,
      requiresTaserPermission: boolean,
      externalEscortRequired: boolean
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
        return appendLog({ ...current, incidents }, 'teacher', `Sündmust eskaleeriti: "${incident.title}"`);
      });
    },
    [commit]
  );

  const closeIncident = useCallback(
    (incidentId: string) => {
      commit((current) => {
        if (!current.simulation) return current;
        const incident = current.incidents.find((item) => item.id === incidentId);
        if (!incident) return current;
        const incidents = current.incidents.map((item) =>
          item.id === incidentId ? { ...item, status: 'closed' as const } : item
        );
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
          `Sündmus lõpetati: "${incident.title}". Määratud ametnikud vabastati tagasi määratud üksusesse või valves olevate ametnike hulka.`
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
      buildingId?: string
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
    joinSimulation,
    leaveSimulation,
    resetSimulation,
    startSimulation,
    setSetupMode,
    moveOfficerToBuilding,
    assignOfficerToIncident,
    assignOfficerToBus,
    releaseOfficer,
    createIncident,
    escalateIncident,
    closeIncident,
    updateBuildingMinimum,
    addOfficer,
    loadLocalSnapshotById,
  };
}
