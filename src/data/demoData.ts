import { Building, EscortBus, Officer, Simulation } from '../models';

export const RESOURCE_POOL_ID = 'resource-pool';
export const RESOURCE_POOL_NAME = 'Valves olevad ametnikud';
export const BUILDING_NAMES_BY_ID: Record<string, string> = {
  'unit-1': '1. üksus',
  'unit-2': '2. üksus',
  'unit-3': '3. üksus',
  'unit-4': '4. üksus',
  gate: 'Pääsla / kokkusaamised / välisvalve',
  'open-prison': 'Avavangla',
  industry: 'Tööstus',
  reception: 'Arestimaja ja vastuvõtt',
  canteen: 'Söökla',
  school: 'Kool',
  [RESOURCE_POOL_ID]: RESOURCE_POOL_NAME,
};
export const BUS_NAMES_BY_ID: Record<string, string> = {
  'bus-1': 'Saatebuss 1',
  'bus-2': 'Saatebuss 2',
};

export function createDefaultSimulation(id: string, joinCode: string, name: string): Simulation {
  const createdAt = new Date().toISOString();
  return {
    id,
    name,
    joinCode,
    status: 'setup',
    setupMode: 'teacher_assigned',
    createdAt,
    updatedAt: createdAt,
  };
}

export function createDefaultBuildings(simulationId: string): Building[] {
  return [
    { id: 'unit-1', simulationId, name: BUILDING_NAMES_BY_ID['unit-1'], x: 60, y: 80, minimumStaff: 2 },
    { id: 'unit-2', simulationId, name: BUILDING_NAMES_BY_ID['unit-2'], x: 300, y: 80, minimumStaff: 2 },
    { id: 'unit-3', simulationId, name: BUILDING_NAMES_BY_ID['unit-3'], x: 540, y: 80, minimumStaff: 2 },
    { id: 'unit-4', simulationId, name: BUILDING_NAMES_BY_ID['unit-4'], x: 780, y: 80, minimumStaff: 2 },
    { id: 'gate', simulationId, name: BUILDING_NAMES_BY_ID.gate, x: 60, y: 300, minimumStaff: 2 },
    { id: 'open-prison', simulationId, name: BUILDING_NAMES_BY_ID['open-prison'], x: 300, y: 300, minimumStaff: 1 },
    { id: 'industry', simulationId, name: BUILDING_NAMES_BY_ID.industry, x: 540, y: 300, minimumStaff: 1 },
    { id: 'reception', simulationId, name: BUILDING_NAMES_BY_ID.reception, x: 780, y: 300, minimumStaff: 2 },
    { id: 'canteen', simulationId, name: BUILDING_NAMES_BY_ID.canteen, x: 180, y: 500, minimumStaff: 1 },
    { id: 'school', simulationId, name: BUILDING_NAMES_BY_ID.school, x: 660, y: 500, minimumStaff: 1 },
    { id: RESOURCE_POOL_ID, simulationId, name: BUILDING_NAMES_BY_ID[RESOURCE_POOL_ID], x: 760, y: 670, minimumStaff: 0, isResourcePool: true },
  ];
}

export function createDefaultBuses(simulationId: string): EscortBus[] {
  return [
    { id: 'bus-1', simulationId, name: BUS_NAMES_BY_ID['bus-1'], minimumEscortQualified: 2 },
    { id: 'bus-2', simulationId, name: BUS_NAMES_BY_ID['bus-2'], minimumEscortQualified: 2 },
  ];
}

export function createDefaultOfficers(simulationId: string, placeInPool: boolean): Officer[] {
  const assignments = [
    'unit-1',
    'unit-1',
    'unit-2',
    'unit-2',
    'unit-3',
    'unit-3',
    'unit-4',
    'gate',
    'reception',
    'open-prison',
    'school',
    'canteen',
  ];

  const officers: Array<Omit<Officer, 'simulationId' | 'status' | 'homeBuildingId' | 'currentBuildingId' | 'currentIncidentId' | 'currentBusId'>> = [
    { id: 'A1', name: 'A1', gender: 'male', hasEscortPermission: true, hasTaserPermission: true },
    { id: 'A2', name: 'A2', gender: 'male', hasEscortPermission: false, hasTaserPermission: false },
    { id: 'A3', name: 'A3', gender: 'female', hasEscortPermission: true, hasTaserPermission: false },
    { id: 'B1', name: 'B1', gender: 'male', hasEscortPermission: true, hasTaserPermission: true },
    { id: 'B2', name: 'B2', gender: 'female', hasEscortPermission: false, hasTaserPermission: false },
    { id: 'C1', name: 'C1', gender: 'male', hasEscortPermission: true, hasTaserPermission: false },
    { id: 'C2', name: 'C2', gender: 'female', hasEscortPermission: false, hasTaserPermission: true },
    { id: 'D1', name: 'D1', gender: 'male', hasEscortPermission: true, hasTaserPermission: true },
    { id: 'D2', name: 'D2', gender: 'female', hasEscortPermission: false, hasTaserPermission: false },
    { id: 'E1', name: 'E1', gender: 'male', hasEscortPermission: true, hasTaserPermission: false },
    { id: 'E2', name: 'E2', gender: 'female', hasEscortPermission: false, hasTaserPermission: false },
    { id: 'F1', name: 'F1', gender: 'male', hasEscortPermission: true, hasTaserPermission: true },
  ];

  return officers.map((officer, index) => ({
    ...officer,
    simulationId,
    status: placeInPool ? 'available' : 'in_building',
    homeBuildingId: placeInPool ? null : assignments[index],
    currentBuildingId: placeInPool ? RESOURCE_POOL_ID : assignments[index],
    currentIncidentId: null,
    currentBusId: null,
  }));
}
