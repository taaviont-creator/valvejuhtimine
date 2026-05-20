import { Building, EscortBus, Officer, Simulation } from '../models';

export const RESOURCE_POOL_ID = 'resource-pool';

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
    { id: 'unit-1', simulationId, name: '1. üksus', x: 60, y: 80, minimumStaff: 2 },
    { id: 'unit-2', simulationId, name: '2. üksus', x: 300, y: 80, minimumStaff: 2 },
    { id: 'unit-3', simulationId, name: '3. üksus', x: 540, y: 80, minimumStaff: 2 },
    { id: 'unit-4', simulationId, name: '4. üksus', x: 780, y: 80, minimumStaff: 2 },
    { id: 'gate', simulationId, name: 'Pääsla / kokkusaamised / välisvalve', x: 60, y: 300, minimumStaff: 2 },
    { id: 'open-prison', simulationId, name: 'Avavangla', x: 300, y: 300, minimumStaff: 1 },
    { id: 'industry', simulationId, name: 'Tööstus', x: 540, y: 300, minimumStaff: 1 },
    { id: 'reception', simulationId, name: 'Arestimaja ja vastuvõtt', x: 780, y: 300, minimumStaff: 2 },
    { id: 'canteen', simulationId, name: 'Söökla', x: 180, y: 500, minimumStaff: 1 },
    { id: 'school', simulationId, name: 'Kool', x: 660, y: 500, minimumStaff: 1 },
    { id: RESOURCE_POOL_ID, simulationId, name: 'Available Resource Pool', x: 760, y: 670, minimumStaff: 0, isResourcePool: true },
  ];
}

export function createDefaultBuses(simulationId: string): EscortBus[] {
  return [
    { id: 'bus-1', simulationId, name: 'Saatebuss 1', minimumEscortQualified: 2 },
    { id: 'bus-2', simulationId, name: 'Saatebuss 2', minimumEscortQualified: 2 },
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

  const officers: Array<Omit<Officer, 'simulationId' | 'status' | 'currentBuildingId' | 'currentIncidentId' | 'currentBusId'>> = [
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
    currentBuildingId: placeInPool ? RESOURCE_POOL_ID : assignments[index],
    currentIncidentId: null,
    currentBusId: null,
  }));
}
