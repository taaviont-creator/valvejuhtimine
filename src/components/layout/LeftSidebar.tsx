import React, { useState } from 'react';
import { AppRole, Building, EscortBus, Incident, Officer, OfficerGender, SetupMode, Simulation } from '../../models';
import { OfficerCard } from '../officers/OfficerCard';
import { OfficerDetailPanel } from '../officers/OfficerDetailPanel';

interface Props {
  role: AppRole;
  simulation: Simulation;
  officers: Officer[];
  buildings: Building[];
  incidents: Incident[];
  buses: EscortBus[];
  selectedOfficerId: string | null;
  onSelectOfficer: (id: string | null) => void;
  onMoveToBuilding: (officerId: string, buildingId: string) => void;
  onAssignToIncident: (officerId: string, incidentId: string) => void;
  onAssignToBus: (officerId: string, busId: string) => void;
  onRelease: (officerId: string) => void;
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
  onSetSetupMode: (mode: SetupMode) => void;
}

export const LeftSidebar: React.FC<Props> = ({
  role,
  simulation,
  officers,
  buildings,
  incidents,
  buses,
  selectedOfficerId,
  onSelectOfficer,
  onMoveToBuilding,
  onAssignToIncident,
  onAssignToBus,
  onRelease,
  onAddOfficer,
  onUpdateBuildingMinimum,
  onSetSetupMode,
}) => {
  const selectedOfficer = officers.find((officer) => officer.id === selectedOfficerId);
  const [setupOpen, setSetupOpen] = useState(role === 'facilitator');

  return (
    <div style={sidebarStyle}>
      <SectionHeader title="Officers" count={officers.length} />

      <div style={listStyle}>
        {(['available', 'in_building', 'on_incident', 'on_escort', 'busy', 'unavailable'] as const).map((status) => {
          const group = officers.filter((officer) => officer.status === status);
          if (group.length === 0) return null;
          return group.map((officer) => (
            <OfficerCard
              key={officer.id}
              officer={officer}
              selected={selectedOfficerId === officer.id}
              onClick={() => onSelectOfficer(selectedOfficerId === officer.id ? null : officer.id)}
              buildingName={officer.currentBuildingId ? buildings.find((building) => building.id === officer.currentBuildingId)?.name : undefined}
              incidentTitle={officer.currentIncidentId ? incidents.find((incident) => incident.id === officer.currentIncidentId)?.title : undefined}
              busName={officer.currentBusId ? buses.find((bus) => bus.id === officer.currentBusId)?.name : undefined}
            />
          ));
        })}
      </div>

      {selectedOfficer && (
        <div style={detailStyle}>
          <OfficerDetailPanel
            officer={selectedOfficer}
            buildings={buildings}
            incidents={incidents}
            buses={buses}
            onMoveToBuilding={(buildingId) => onMoveToBuilding(selectedOfficer.id, buildingId)}
            onAssignToIncident={(incidentId) => onAssignToIncident(selectedOfficer.id, incidentId)}
            onAssignToBus={(busId) => onAssignToBus(selectedOfficer.id, busId)}
            onRelease={() => onRelease(selectedOfficer.id)}
            onClose={() => onSelectOfficer(null)}
          />
        </div>
      )}

      {role === 'facilitator' && (
        <div style={setupShellStyle}>
          <button style={setupToggleStyle} onClick={() => setSetupOpen((value) => !value)}>
            Setup controls {setupOpen ? '-' : '+'}
          </button>
          {setupOpen && (
            <TeacherSetup
              simulation={simulation}
              buildings={buildings}
              onSetSetupMode={onSetSetupMode}
              onAddOfficer={onAddOfficer}
              onUpdateBuildingMinimum={onUpdateBuildingMinimum}
            />
          )}
        </div>
      )}
    </div>
  );
};

const TeacherSetup: React.FC<{
  simulation: Simulation;
  buildings: Building[];
  onSetSetupMode: (mode: SetupMode) => void;
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
}> = ({ simulation, buildings, onSetSetupMode, onAddOfficer, onUpdateBuildingMinimum }) => {
  const firstBuilding = buildings.find((building) => !building.isResourcePool)?.id;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<OfficerGender>('male');
  const [escort, setEscort] = useState(false);
  const [taser, setTaser] = useState(false);
  const [buildingId, setBuildingId] = useState(firstBuilding ?? '');

  const canEditMode = simulation.status === 'setup';

  return (
    <div style={{ padding: 8 }}>
      <div style={miniLabelStyle}>Setup mode</div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'teacher_assigned'} onClick={() => onSetSetupMode('teacher_assigned')}>
          A
        </SmallButton>
        <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'student_places_officers'} onClick={() => onSetSetupMode('student_places_officers')}>
          B
        </SmallButton>
      </div>

      <div style={miniLabelStyle}>Create officer</div>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Officer code" style={smallInputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
        <select value={gender} onChange={(event) => setGender(event.target.value as OfficerGender)} style={smallInputStyle}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} style={smallInputStyle}>
          {buildings.filter((building) => !building.isResourcePool).map((building) => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
      </div>
      <label style={checkStyle}><input type="checkbox" checked={escort} onChange={(event) => setEscort(event.target.checked)} /> Escort</label>
      <label style={checkStyle}><input type="checkbox" checked={taser} onChange={(event) => setTaser(event.target.checked)} /> Taser</label>
      <button
        style={wideSmallButtonStyle}
        onClick={() => {
          onAddOfficer(name, gender, escort, taser, buildingId);
          setName('');
        }}
      >
        Add officer
      </button>

      <div style={{ ...miniLabelStyle, marginTop: 12 }}>Minimum staffing</div>
      <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {buildings.filter((building) => !building.isResourcePool).map((building) => (
          <label key={building.id} style={minRowStyle}>
            <span>{building.name}</span>
            <input
              type="number"
              min={0}
              value={building.minimumStaff}
              onChange={(event) => onUpdateBuildingMinimum(building.id, Number(event.target.value))}
              style={{ ...smallInputStyle, width: 48, padding: '3px 5px' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

const SmallButton: React.FC<{ active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button disabled={disabled} onClick={onClick} style={{ ...smallButtonStyle, borderColor: active ? 'var(--cyan)' : 'var(--border)', color: active ? 'var(--cyan)' : 'var(--text-secondary)', opacity: disabled ? 0.45 : 1 }}>
    {children}
  </button>
);

const SectionHeader: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
  <div style={sectionHeaderStyle}>
    <span>{title}</span>
    {count !== undefined && <span style={{ color: 'var(--cyan)' }}>{count}</span>}
  </div>
);

const sidebarStyle: React.CSSProperties = {
  width: 250,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-panel)',
  borderRight: '1px solid var(--border)',
  overflow: 'hidden',
  flexShrink: 0,
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '10px 12px 8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 2,
  textTransform: 'uppercase',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const detailStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  padding: 8,
  overflowY: 'auto',
  maxHeight: '45%',
};

const setupShellStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  maxHeight: '42%',
  overflowY: 'auto',
};

const setupToggleStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--bg-card)',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  color: 'var(--amber)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  textAlign: 'left',
};

const miniLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: 5,
};

const smallInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '5px 7px',
  fontSize: 12,
};

const checkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  marginTop: 7,
  marginRight: 10,
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const smallButtonStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const wideSmallButtonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 7,
  background: 'transparent',
  border: '1px solid var(--cyan-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--cyan)',
  padding: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const minRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 52px',
  gap: 6,
  alignItems: 'center',
  fontSize: 11,
  color: 'var(--text-secondary)',
};
