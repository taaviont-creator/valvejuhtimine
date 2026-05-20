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
  return supabaseConfigWarning ?? (hasSupabaseConfig ? 'Supabase connection failed, using local mode' : undefined);
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
  return {
    ...state,
    ...snapshot,
    warnings: calculateWarnings(snapshot.buildings, snapshot.officers, snapshot.incidents, snapshot.buses),
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
  const warningLogs = newWarnings.map((warning) => logEntry(next.simulation!.id, 'system', `Warning triggered: ${warning.message}`));

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
          syncMessage: error instanceof Error ? error.message : 'Sync failed',
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
        ...createDefaultSimulation(simulationId, joinCode, name.trim() || 'Prison shift simulation'),
        setupMode,
      };
      const participant: Participant = {
        id: uuidv4(),
        simulationId,
        role: 'teacher',
        displayName: displayName.trim() || 'Teacher',
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
          logEntry(simulationId, 'teacher', `Simulation created (${setupMode === 'teacher_assigned' ? 'teacher pre-assigns officers' : 'student places officers'})`),
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
      setState((current) => ({ ...current, syncStatus: 'loading', syncMessage: 'Joining simulation...' }));
      try {
        const normalizedJoinCode = normalizeJoinCode(joinCode);
        if (!normalizedJoinCode) {
          setState((current) => ({ ...current, syncStatus: hasSupabaseConfig ? 'supabase' : 'local', syncMessage: 'Simulation code not found' }));
          return false;
        }

        const result = await getSimulationByJoinCode(normalizedJoinCode);
        const snapshot = result.snapshot;
        if (!snapshot) {
          setState((current) => ({
            ...current,
            syncStatus: result.mode,
            syncMessage: result.message ?? 'Simulation code not found',
          }));
          return false;
        }

        const participant: Participant = {
          id: uuidv4(),
          simulationId: snapshot.simulation.id,
          role: role === 'facilitator' ? 'teacher' : 'student',
          displayName: displayName.trim() || (role === 'facilitator' ? 'Teacher' : 'Student'),
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
            logEntry(snapshot.simulation.id, role === 'facilitator' ? 'teacher' : 'student', `${participant.displayName} joined simulation`),
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
          syncMessage: error instanceof Error ? error.message : 'Unable to join simulation',
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
        'Simulation reset to starting situation'
      );
    });
  }, [commit]);

  const startSimulation = useCallback(() => {
    commit((current) => {
      if (!current.simulation) return current;
      return appendLog(
        { ...current, simulation: { ...current.simulation, status: 'active' } },
        actorForRole(current.role),
        'Simulation started'
      );
    });
  }, [commit]);

  const setSetupMode = useCallback(
    (setupMode: SetupMode) => {
      commit((current) => {
        if (!current.simulation || current.simulation.status !== 'setup') return current;
        const officers = current.officers.map((officer) => ({
          ...officer,
          status: setupMode === 'student_places_officers' ? ('available' as const) : officer.status === 'available' ? ('in_building' as const) : officer.status,
          currentBuildingId:
            setupMode === 'student_places_officers'
              ? RESOURCE_POOL_ID
              : officer.currentBuildingId === RESOURCE_POOL_ID
              ? current.buildings.find((building) => !building.isResourcePool)?.id ?? RESOURCE_POOL_ID
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
          `Setup mode changed to ${setupMode === 'teacher_assigned' ? 'teacher pre-assigns officers' : 'student places officers'}`
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
          `${officer.name} moved to ${building.name}`
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
          `${officer.name} assigned to incident "${incident.title}"`
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

        return appendLog({ ...current, officers }, actorForRole(current.role), `${officer.name} assigned to ${bus.name}`);
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
          `Incident created: "${title}" at ${building.name}`
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
        return appendLog({ ...current, incidents }, 'teacher', `Incident escalated: "${incident.title}"`);
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
        const officers = current.officers.map((officer) =>
          officer.currentIncidentId === incidentId
            ? {
                ...officer,
                currentBuildingId: RESOURCE_POOL_ID,
                currentIncidentId: null,
                currentBusId: null,
                status: 'available' as const,
              }
            : officer
        );
        return appendLog({ ...current, incidents, officers }, 'teacher', `Incident closed: "${incident.title}"`);
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
        return appendLog({ ...current, buildings }, 'teacher', `${building.name} minimum staffing set to ${minimumStaff}`);
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
          name: name.trim() || `O${current.officers.length + 1}`,
          gender,
          hasEscortPermission,
          hasTaserPermission,
          status: target?.isResourcePool ? 'available' : 'in_building',
          currentBuildingId: targetId,
          currentIncidentId: null,
          currentBusId: null,
        };
        return appendLog({ ...current, officers: [...current.officers, officer] }, 'teacher', `Officer created: ${officer.name}`);
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
