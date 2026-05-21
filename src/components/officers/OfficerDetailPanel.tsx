import React from 'react';
import { Building, EscortBus, Incident, Officer } from '../../models';
import { OfficerMarker, officerGenderLabels, officerStatusLabels } from './OfficerMarker';

type DestinationType = 'building' | 'incident' | 'bus' | 'pool';

const statusLabels: Record<Officer['status'], string> = {
  available: 'Vaba',
  in_building: 'Vaba',
  on_incident: 'Sündmusel',
  on_escort: 'Saatmisel',
  busy: 'Hõivatud',
  unavailable: 'Mängust väljas',
};

const reassignmentMessage = 'Ametnik on juba hõivatud. Kas vabastada ta praeguselt ülesandelt ja suunata uude kohta?';
const escortPermissionMessage = 'Ametnikul puudub saateõigus. Saatebussi saab määrata ainult saateõigusega ametniku.';
const unavailableMessage = 'Ametnik on mängust väljas ja teda ei saa suunata.';

interface Props {
  officer: Officer;
  buildings: Building[];
  incidents: Incident[];
  buses: EscortBus[];
  onMoveToBuilding: (buildingId: string) => void;
  onAssignToIncident: (incidentId: string) => void;
  onAssignToBus: (busId: string) => void;
  onRelease: () => void;
  onClose: () => void;
}

export const OfficerDetailPanel: React.FC<Props> = ({
  officer,
  buildings,
  incidents,
  buses,
  onMoveToBuilding,
  onAssignToIncident,
  onAssignToBus,
  onRelease,
  onClose,
}) => {
  const [destinationType, setDestinationType] = React.useState<DestinationType>('building');
  const activeIncidents = incidents.filter((incident) => incident.status !== 'closed');
  const pool = buildings.find((building) => building.isResourcePool);
  const currentLocation =
    buses.find((bus) => bus.id === officer.currentBusId)?.name ??
    incidents.find((incident) => incident.id === officer.currentIncidentId)?.title ??
    buildings.find((building) => building.id === officer.currentBuildingId)?.name ??
    'Asukoht puudub';
  const currentAssignment =
    incidents.find((incident) => incident.id === officer.currentIncidentId)?.title ??
    buses.find((bus) => bus.id === officer.currentBusId)?.name ??
    (officer.status === 'busy' ? 'Hõivatud' : 'Puudub');
  const unavailable = officer.status === 'unavailable';
  const isOccupied = Boolean(
    officer.currentIncidentId ||
      officer.currentBusId ||
      officer.status === 'busy' ||
      officer.status === 'unavailable'
  );

  const confirmReassignment = () => {
    if (officer.status === 'unavailable') {
      window.alert(unavailableMessage);
      return false;
    }
    return !isOccupied || window.confirm(reassignmentMessage);
  };
  const moveToBuilding = (buildingId: string) => {
    if (confirmReassignment()) onMoveToBuilding(buildingId);
  };
  const assignToIncident = (incidentId: string) => {
    if (confirmReassignment()) onAssignToIncident(incidentId);
  };
  const assignToBus = (busId: string) => {
    if (!officer.hasEscortPermission) {
      window.alert(escortPermissionMessage);
      return;
    }
    if (confirmReassignment()) onAssignToBus(busId);
  };
  const releaseToPool = () => {
    if (confirmReassignment()) onRelease();
  };

  const destinationCount: Record<DestinationType, number> = {
    building: buildings.filter((building) => !building.isResourcePool).length,
    incident: activeIncidents.length,
    bus: buses.length,
    pool: pool ? 1 : 0,
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={panelTitleStyle}>Ametniku info</div>
          <div style={{ marginTop: 6 }}>
            <OfficerMarker officer={officer} selected draggable={false} />
          </div>
        </div>
        <button onClick={onClose} style={closeStyle}>x</button>
      </div>

      <div style={infoGridStyle}>
        <InfoRow label="Ametnik" value={officer.name} />
        <InfoRow label="Roll" value={officer.role === 'vanemvalvur' ? 'Vanemvalvur' : 'Valvur'} />
        <InfoRow label="Sugu" value={officerGenderLabels[officer.gender]} />
        <InfoRow label="Staatus" value={statusLabels[officer.status] ?? officerStatusLabels[officer.status]} />
        <InfoRow label="Asukoht" value={currentLocation} />
        <InfoRow label="Saateõigus" value={officer.hasEscortPermission ? 'Jah' : 'Ei'} />
        <InfoRow label="Elektrišokirelva õigus" value={officer.hasTaserPermission ? 'Jah' : 'Ei'} />
        <InfoRow label="Praegune ülesanne" value={currentAssignment} />
      </div>

      {unavailable && <div style={unavailableNoticeStyle}>Ametnik on mängust väljas ja teda ei saa suunata.</div>}

      <div>
        <div style={sectionTitleStyle}>Suuna ametnik</div>
        <div style={destinationTabsStyle}>
          {(['building', 'incident', 'bus', 'pool'] as DestinationType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDestinationType(type)}
              disabled={destinationCount[type] === 0 || unavailable}
              style={destinationTabStyle(destinationType === type, destinationCount[type] === 0 || unavailable)}
            >
              {type === 'building' ? 'Suuna üksusesse' : type === 'incident' ? 'Määra sündmusele' : type === 'bus' ? 'Määra saatebussile' : 'Valves olevad'}
            </button>
          ))}
        </div>
      </div>

      {destinationType === 'building' && (
        <Section title="Vali üksus / hoone">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
            {buildings.filter((building) => !building.isResourcePool).map((building) => (
              <ActionBtn
                key={building.id}
                label={building.name}
                disabled={unavailable || (officer.currentBuildingId === building.id && !officer.currentIncidentId && !officer.currentBusId)}
                onClick={() => moveToBuilding(building.id)}
                accent="var(--cyan)"
              />
            ))}
            {pool && (
              <ActionBtn
                label={pool.name}
                disabled={unavailable || (officer.currentBuildingId === pool.id && !officer.currentIncidentId && !officer.currentBusId)}
                onClick={() => moveToBuilding(pool.id)}
                accent="var(--green)"
                actionLabel="Suuna valves olevate ametnike hulka"
              />
            )}
          </div>
        </Section>
      )}

      {destinationType === 'incident' && (
        <Section title="Vali aktiivne sündmus">
          {activeIncidents.length === 0 ? (
            <div style={emptyDestinationStyle}>Aktiivseid sündmusi pole</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {activeIncidents.map((incident) => (
                <ActionBtn
                  key={incident.id}
                  label={`${incident.title} (vajalik ${incident.requiredOfficers})`}
                  disabled={unavailable || officer.currentIncidentId === incident.id}
                  onClick={() => assignToIncident(incident.id)}
                  accent={incident.status === 'escalated' ? 'var(--red)' : 'var(--amber)'}
                  actionLabel="Määra sündmusele"
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {destinationType === 'bus' && (
        <Section title="Vali saatebuss">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {buses.map((bus) => (
              <ActionBtn
                key={bus.id}
                label={bus.name}
                disabled={unavailable || officer.currentBusId === bus.id}
                onClick={() => assignToBus(bus.id)}
                accent="var(--amber)"
                actionLabel="Määra saatebussile"
              />
            ))}
          </div>
        </Section>
      )}

      {destinationType === 'pool' && pool && (
        <Section title="Valves olevad ametnikud">
          <ActionBtn
            label={pool.name}
            disabled={unavailable || (officer.currentBuildingId === pool.id && !officer.currentIncidentId && !officer.currentBusId)}
            onClick={() => moveToBuilding(pool.id)}
            accent="var(--green)"
            actionLabel="Suuna valves olevate ametnike hulka"
          />
        </Section>
      )}

      <button disabled={unavailable} onClick={releaseToPool} style={{ ...releaseStyle, opacity: unavailable ? 0.45 : 1 }}>Vabasta / suuna tagasi</button>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={infoRowStyle}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={sectionTitleStyle}>{title}</div>
    {children}
  </div>
);

const ActionBtn: React.FC<{ label: string; disabled: boolean; onClick: () => void; accent?: string; actionLabel?: string }> = ({
  label,
  disabled,
  onClick,
  accent = 'var(--cyan)',
  actionLabel = 'Suuna',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      minHeight: 30,
      padding: '6px 8px',
      background: disabled ? 'var(--bg-card)' : 'transparent',
      border: `1px solid ${disabled ? 'var(--border)' : accent}`,
      borderRadius: 'var(--radius-sm)',
      color: disabled ? 'var(--text-muted)' : accent,
      fontSize: 11,
      textAlign: 'left',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span>{label}</span>
    <span style={actionSuffixStyle}>{actionLabel}</span>
  </button>
);

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-bright)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 16,
  padding: '0 4px',
};

const infoGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const infoRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '118px 1fr',
  gap: 7,
  alignItems: 'center',
  padding: '6px 8px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11,
  color: 'var(--text-secondary)',
};

const unavailableNoticeStyle: React.CSSProperties = {
  padding: '7px 8px',
  background: 'rgba(185,67,77,0.08)',
  border: '1px solid rgba(185,67,77,0.28)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontSize: 11,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.5,
  marginBottom: 5,
  textTransform: 'uppercase',
};

const destinationTabsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 5,
};

const destinationTabStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
  minHeight: 30,
  padding: '5px 6px',
  background: active ? 'var(--bg-elevated)' : 'var(--bg-card)',
  border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  opacity: disabled ? 0.45 : 1,
});

const emptyDestinationStyle: React.CSSProperties = {
  padding: '7px 8px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  fontSize: 11,
};

const actionSuffixStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 2,
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  color: 'inherit',
  opacity: 0.8,
  textTransform: 'uppercase',
};

const releaseStyle: React.CSSProperties = {
  width: '100%',
  padding: 7,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
};
