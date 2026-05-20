import { Building, EscortBus, Incident, Officer, Warning } from '../models';

export function getBuildingOfficerCount(building: Building, officers: Officer[]): number {
  return officers.filter(
    (officer) =>
      officer.currentBuildingId === building.id &&
      officer.currentIncidentId === null &&
      officer.currentBusId === null &&
      officer.status !== 'unavailable'
  ).length;
}

export function getIncidentOfficers(incident: Incident, officers: Officer[]): Officer[] {
  return officers.filter((officer) => officer.currentIncidentId === incident.id);
}

export function getBusOfficers(bus: EscortBus, officers: Officer[]): Officer[] {
  return officers.filter((officer) => officer.currentBusId === bus.id);
}

export function calculateWarnings(
  buildings: Building[],
  officers: Officer[],
  incidents: Incident[],
  buses: EscortBus[]
): Warning[] {
  const warnings: Warning[] = [];

  for (const building of buildings) {
    if (building.isResourcePool) continue;
    const count = getBuildingOfficerCount(building, officers);
    if (count < building.minimumStaff) {
      warnings.push({
        id: `building-min-${building.id}`,
        type: 'building_below_minimum',
        message: `${building.name} below minimum staffing (${count}/${building.minimumStaff})`,
        relatedBuildingId: building.id,
      });
    }
  }

  for (const incident of incidents) {
    if (incident.status === 'closed') continue;
    const assigned = getIncidentOfficers(incident, officers);

    if (assigned.length === 0) {
      warnings.push({
        id: `incident-empty-${incident.id}`,
        type: 'incident_unassigned',
        message: `Incident "${incident.title}" has no officers assigned`,
        relatedIncidentId: incident.id,
      });
    }

    if (assigned.length < incident.requiredOfficers) {
      warnings.push({
        id: `incident-staff-${incident.id}`,
        type: 'incident_understaffed',
        message: `Incident "${incident.title}" needs ${incident.requiredOfficers} officers, assigned ${assigned.length}`,
        relatedIncidentId: incident.id,
      });
    }

    if (incident.requiresEscortPermission) {
      const escortCount = assigned.filter((officer) => officer.hasEscortPermission).length;
      if (escortCount < Math.min(incident.requiredOfficers, assigned.length || 1)) {
        warnings.push({
          id: `incident-escort-${incident.id}`,
          type: 'missing_escort_permission',
          message: `Incident "${incident.title}" requires escort-qualified officers (${escortCount}/${incident.requiredOfficers})`,
          relatedIncidentId: incident.id,
        });
      }
    }

    if (incident.requiresTaserPermission) {
      const taserCount = assigned.filter((officer) => officer.hasTaserPermission).length;
      if (taserCount < Math.min(incident.requiredOfficers, assigned.length || 1)) {
        warnings.push({
          id: `incident-taser-${incident.id}`,
          type: 'missing_taser_permission',
          message: `Incident "${incident.title}" requires taser-qualified officers (${taserCount}/${incident.requiredOfficers})`,
          relatedIncidentId: incident.id,
        });
      }
    }
  }

  for (const bus of buses) {
    const assigned = getBusOfficers(bus, officers);
    if (assigned.length === 0) continue;

    const escortQualified = assigned.filter((officer) => officer.hasEscortPermission).length;
    if (escortQualified < bus.minimumEscortQualified) {
      warnings.push({
        id: `bus-escort-${bus.id}`,
        type: 'bus_understaffed',
        message: `${bus.name} needs ${bus.minimumEscortQualified} escort-qualified officers, assigned ${escortQualified}`,
        relatedBusId: bus.id,
      });
    }
  }

  return warnings;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
