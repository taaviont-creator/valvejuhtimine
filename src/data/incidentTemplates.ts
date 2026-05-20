import { IncidentSeverity } from '../models';

export interface IncidentTemplate {
  id: string;
  title: string;
  description: string;
  requiredOfficers: number;
  requiresEscortPermission: boolean;
  requiresTaserPermission: boolean;
  externalEscortRequired: boolean;
  severity: IncidentSeverity;
}

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    id: 'fight-in-unit',
    title: 'Kaklus üksuses',
    description: 'Üksuses on tekkinud kaklus. Vajalik on lisajõud ja olukorra kontrolli alla saamine.',
    requiredOfficers: 3,
    requiresEscortPermission: false,
    requiresTaserPermission: false,
    externalEscortRequired: false,
    severity: 'high',
  },
  {
    id: 'prisoner-unwell',
    title: 'Kinnipeetaval halb olla',
    description: 'Kinnipeetav tunneb ennast halvasti. Vajalik esmane reageerimine ja olukorra hindamine.',
    requiredOfficers: 1,
    requiresEscortPermission: false,
    requiresTaserPermission: false,
    externalEscortRequired: false,
    severity: 'medium',
  },
  {
    id: 'external-escort',
    title: 'Erakorraline väljaviimine',
    description: 'Vajalik on erakorraline vanglaväline väljaviimine.',
    requiredOfficers: 2,
    requiresEscortPermission: true,
    requiresTaserPermission: false,
    externalEscortRequired: true,
    severity: 'high',
  },
  {
    id: 'fire-smoke',
    title: 'Põlengu või suitsu kahtlus',
    description: 'Hoonest/üksusest on tulnud teade suitsu või põlengu kahtlusest.',
    requiredOfficers: 2,
    requiresEscortPermission: false,
    requiresTaserPermission: false,
    externalEscortRequired: false,
    severity: 'critical',
  },
  {
    id: 'disturbance-refusal',
    title: 'Korraldusele mitteallumine',
    description: 'Kinnipeetav või kinnipeetavad ei allu korraldustele. Vajalik olukorra rahustamine ja julgestus.',
    requiredOfficers: 2,
    requiresEscortPermission: false,
    requiresTaserPermission: true,
    externalEscortRequired: false,
    severity: 'high',
  },
  {
    id: 'gatehouse-security',
    title: 'Pääsla või välisvalve sündmus',
    description: 'Pääsla, kokkusaamiste või välisvalve piirkonnas on tekkinud olukord, mis vajab lisaressurssi.',
    requiredOfficers: 2,
    requiresEscortPermission: false,
    requiresTaserPermission: false,
    externalEscortRequired: false,
    severity: 'medium',
  },
];

export interface EscalationTemplate {
  id: string;
  text: string;
  requiredOfficers?: number;
  requiredOfficerDelta?: number;
  requiresEscortPermission?: boolean;
  requiresTaserPermission?: boolean;
  externalEscortRequired?: boolean;
  severity?: IncidentSeverity;
}

export const ESCALATION_TEMPLATES: EscalationTemplate[] = [
  {
    id: 'officer-injured',
    text: 'Ametnik vigastatud.',
    severity: 'critical',
  },
  {
    id: 'more-resources',
    text: 'Vaja lisaressurssi.',
    requiredOfficerDelta: 1,
    severity: 'high',
  },
  {
    id: 'out-of-control',
    text: 'Sündmus kontrolli alt väljas.',
    requiredOfficerDelta: 2,
    severity: 'critical',
  },
  {
    id: 'needs-senior-guard',
    text: 'Vajalik vanemvalvur sündmusele.',
    severity: 'high',
  },
  {
    id: 'urgent-escort',
    text: 'Vajalik 2 saateõigusega ametnikku.',
    requiredOfficers: 2,
    requiresEscortPermission: true,
    externalEscortRequired: true,
    severity: 'high',
  },
  {
    id: 'under-control',
    text: 'Olukord kontrolli all — osa ressurssi võib vabastada.',
    severity: 'low',
  },
  {
    id: 'needs-taser',
    text: 'Vajalik EŠR õigusega ametnik.',
    requiresTaserPermission: true,
    severity: 'high',
  },
  {
    id: 'spread-next-unit',
    text: 'Sündmus laienes kõrvalüksusesse.',
    severity: 'critical',
  },
  {
    id: 'medical-needed',
    text: 'Meditsiiniline abi või hindamine vajalik.',
    severity: 'medium',
  },
];
