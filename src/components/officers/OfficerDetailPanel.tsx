import React from 'react';
import { Building, EscortBus, Incident, Officer } from '../../models';

type DestinationType = 'building' | 'incident' | 'bus' | 'pool';

const statusLabels: Record<Officer['status'], string> = {
  available: 'vaba',
  in_building: 'üksuses',
  on_incident: 'sündmusel',
  on_escort: 'saatmisel',
  busy: 'hõivatud',
  unavailable: 'mängust väljas',
};

const reassignmentMessage = 'Ametnik on juba hõivatud. Kas vabastada ta praeguselt ülesandelt ja suunata uude kohta?';
const escortPermissionMessage = 'Ametnikul puudub saateõigus. Saatebussi saab määrata ainult saateõigusega ametniku.';

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
  const isOccupied = Boolean(
    officer.currentIncidentId ||
      officer.currentBusId ||
      officer.status === 'busy' ||
      officer.status === 'unavailable'
  );

  const confirmReassignment = () => !isOccupied || window.confirm(reassignmentMessage);
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
          <div style={{ ...nameStyle, color: officer.gender === 'male' ? 'var(--cyan)' : '#ff99cc' }}>{officer.name}</div>
          <div style={metaStyle}>{officer.gender === 'male' ? 'Mees' : 'Naine'}</div>
        </div>
        <button onClick={onClose} style={closeStyle}>x</button>
      </div>

      <div style={currentLocationStyle}>
        <span>{statusLabels[officer.status]}</span>
        <strong>{currentLocation}</strong>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <RightBadge label="Saateõigus" active={officer.hasEscortPermission} />
        <RightBadge label="EŠR õigus" active={officer.hasTaserPermission} />
      </div>

      <div>
        <div style={sectionTitleStyle}>Sihtkoha tüüp</div>
        <div style={destinationTabsStyle}>
          {(['building', 'incident', 'bus', 'pool'] as DestinationType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDestinationType(type)}
              disabled={destinationCount[type] === 0}
              style={destinationTabStyle(destinationType === type, destinationCount[type] === 0)}
            >
              {type === 'building' ? 'Üksus / hoone' : type === 'incident' ? 'Sündmus' : type === 'bus' ? 'Saatebuss' : 'Valves'}
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
                disabled={officer.currentBuildingId === building.id && !officer.currentIncidentId && !officer.currentBusId}
                onClick={() => moveToBuilding(building.id)}
                accent="var(--cyan)"
              />
            ))}
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
                  disabled={officer.currentIncidentId === incident.id}
                  onClick={() => assignToIncident(incident.id)}
                  accent={incident.status === 'escalated' ? 'var(--red)' : 'var(--amber)'}
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
                disabled={officer.currentBusId === bus.id}
                onClick={() => assignToBus(bus.id)}
                accent="var(--amber)"
              />
            ))}
          </div>
        </Section>
      )}

      {destinationType === 'pool' && pool && (
        <Section title="Valves olevad ametnikud">
          <ActionBtn
            label={pool.name}
            disabled={officer.currentBuildingId === pool.id && !officer.currentIncidentId && !officer.currentBusId}
            onClick={() => moveToBuilding(pool.id)}
            accent="var(--green)"
          />
        </Section>
      )}

      <button onClick={releaseToPool} style={releaseStyle}>Vabasta valves olevate ametnike hulka</button>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={sectionTitleStyle}>{title}</div>
    {children}
  </div>
);

const RightBadge: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div style={{ ...badgeStyle, color: active ? 'var(--green)' : 'var(--text-muted)', borderColor: active ? 'var(--green-dim)' : 'var(--border)' }}>
    {active ? 'jah' : 'ei'} {label}
  </div>
);

const ActionBtn: React.FC<{ label: string; disabled: boolean; onClick: () => void; accent?: string }> = ({
  label,
  disabled,
  onClick,
  accent = 'var(--cyan)',
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
    {label}
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

const nameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
};

const metaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 16,
  padding: '0 4px',
};

const currentLocationStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '72px 1fr',
  gap: 7,
  alignItems: 'center',
  padding: '7px 8px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
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

const badgeStyle: React.CSSProperties = {
  padding: '3px 7px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
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
