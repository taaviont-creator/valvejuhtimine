export type SimulationStatus = 'setup' | 'active' | 'completed';
export type SetupMode = 'teacher_assigned' | 'student_places_officers';

export interface Simulation {
  id: string;
  name: string;
  joinCode: string;
  teacherCode?: string;
  studentCode?: string;
  classroomExerciseId?: string;
  classroomGroupName?: string;
  classroomGroupIndex?: number;
  classroomGroupCount?: number;
  status: SimulationStatus;
  setupMode: SetupMode;
  createdAt: string;
  updatedAt: string;
}

export type AppRole = 'facilitator' | 'commander';
export type ParticipantRole = 'teacher' | 'student' | 'observer';

export interface Participant {
  id: string;
  simulationId: string;
  role: ParticipantRole;
  displayName: string;
  joinedAt: string;
}

export interface Building {
  id: string;
  simulationId: string;
  name: string;
  x: number;
  y: number;
  minimumStaff: number;
  isResourcePool?: boolean;
}

export type OfficerGender = 'male' | 'female';
export type OfficerRole = 'valvur' | 'vanemvalvur';

export type OfficerStatus =
  | 'available'
  | 'in_building'
  | 'on_incident'
  | 'on_escort'
  | 'busy'
  | 'unavailable';

export interface Officer {
  id: string;
  simulationId: string;
  name: string;
  gender: OfficerGender;
  role: OfficerRole;
  hasEscortPermission: boolean;
  hasTaserPermission: boolean;
  status: OfficerStatus;
  homeBuildingId: string | null;
  currentBuildingId: string | null;
  currentIncidentId: string | null;
  currentBusId: string | null;
}

export type IncidentStatus = 'active' | 'escalated' | 'under_control' | 'closed';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  text: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  simulationId: string;
  sharedScenarioEventId?: string;
  buildingId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  requiredOfficers: number;
  requiresEscortPermission: boolean;
  requiresTaserPermission: boolean;
  externalEscortRequired: boolean;
  status: IncidentStatus;
  updates: IncidentUpdate[];
  createdAt: string;
}

export interface EscortBus {
  id: string;
  simulationId: string;
  name: string;
  minimumEscortQualified: number;
}

export type LogActor = 'teacher' | 'student' | 'system';

export interface DecisionLogEntry {
  id: string;
  simulationId: string;
  actor: LogActor;
  text: string;
  createdAt: string;
}

export interface ClassroomGroup {
  simulationId: string;
  groupName: string;
  groupIndex: number;
  studentCode: string;
  teacherCode: string;
}

export type SharedScenarioEventKind = 'incident' | 'escalation';

export interface SharedScenarioEvent {
  id: string;
  kind: SharedScenarioEventKind;
  title: string;
  description: string;
  targetBuildingId: string;
  targetBuildingName: string;
  severity: IncidentSeverity;
  requiredOfficers: number;
  sentToAllGroups: boolean;
  parentEventId?: string;
  createdAt: string;
}

export interface ClassroomExercise {
  id: string;
  title: string;
  createdAt: string;
  teacherCode: string;
  groupCount: number;
  groups: ClassroomGroup[];
  sharedScenarioEvents: SharedScenarioEvent[];
}

export type WarningType =
  | 'building_below_minimum'
  | 'missing_escort_permission'
  | 'missing_taser_permission'
  | 'incident_understaffed'
  | 'incident_unassigned'
  | 'bus_understaffed'
  | 'officer_already_assigned';

export interface Warning {
  id: string;
  type: WarningType;
  message: string;
  relatedBuildingId?: string;
  relatedIncidentId?: string;
  relatedOfficerId?: string;
  relatedBusId?: string;
}

export interface SimulationSnapshot {
  simulation: Simulation;
  classroomExercise?: ClassroomExercise | null;
  participants: Participant[];
  buildings: Building[];
  officers: Officer[];
  incidents: Incident[];
  buses: EscortBus[];
  decisionLog: DecisionLogEntry[];
}

export interface AppState extends Omit<SimulationSnapshot, 'simulation'> {
  role: AppRole | null;
  participant: Participant | null;
  simulation: Simulation | null;
  classroomExercise: ClassroomExercise | null;
  classroomSnapshots: SimulationSnapshot[];
  warnings: Warning[];
  syncStatus: 'local' | 'supabase' | 'loading' | 'error';
  syncMessage?: string;
}
