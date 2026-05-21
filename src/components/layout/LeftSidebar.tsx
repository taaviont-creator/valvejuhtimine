import React, { useEffect, useState } from 'react';
import { AppRole, Building, EscortBus, Incident, Officer, OfficerGender, OfficerRole, SetupMode, Simulation } from '../../models';
import { OfficerCard } from '../officers/OfficerCard';
import { OfficerDetailPanel } from '../officers/OfficerDetailPanel';

type OfficerSetupPatch = Partial<
  Pick<
    Officer,
    | 'name'
    | 'gender'
    | 'role'
    | 'hasEscortPermission'
    | 'hasTaserPermission'
    | 'homeBuildingId'
    | 'currentBuildingId'
    | 'currentIncidentId'
    | 'currentBusId'
    | 'status'
  >
>;

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
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string, role?: OfficerRole) => void;
  onUpdateOfficer: (officerId: string, patch: OfficerSetupPatch) => void;
  onRemoveOfficer: (officerId: string) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
  onSetSetupMode: (mode: SetupMode) => void;
  onStartSimulation: () => void;
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
  onUpdateOfficer,
  onRemoveOfficer,
  onUpdateBuildingMinimum,
  onSetSetupMode,
  onStartSimulation,
}) => {
  const selectedOfficer = officers.find((officer) => officer.id === selectedOfficerId);
  const [setupOpen, setSetupOpen] = useState(role === 'facilitator');
  const groupIds = [
    ...buildings.map((building) => building.id),
    ...buses.map((bus) => bus.id),
    'other',
  ];
  const groupedOfficers = groupIds
    .map((groupId) => {
      const label =
        buildings.find((building) => building.id === groupId)?.name ??
        buses.find((bus) => bus.id === groupId)?.name ??
        'Sündmusel / hõivatud';
      const groupOfficers = officers.filter((officer) => officerGroupId(officer) === groupId);
      return { groupId, label, officers: groupOfficers };
    })
    .filter((group) => group.officers.length > 0);

  return (
    <div style={sidebarStyle}>
      <SectionHeader title="Ametnikud" count={officers.length} />

      <div style={listStyle}>
        {groupedOfficers.map((group) => (
          <OfficerGroup key={group.groupId} title={group.label}>
            <RoleGroup title="Vanemvalvur" officers={group.officers.filter((officer) => officer.role === 'vanemvalvur')}>
              {(officer) => (
                <OfficerRow
                  officer={officer}
                  selected={selectedOfficerId === officer.id}
                  onSelect={() => onSelectOfficer(selectedOfficerId === officer.id ? null : officer.id)}
                  buildingName={buildingLabel(officer, buildings)}
                  incidentTitle={officer.currentIncidentId ? incidents.find((incident) => incident.id === officer.currentIncidentId)?.title : undefined}
                  busName={officer.currentBusId ? buses.find((bus) => bus.id === officer.currentBusId)?.name : undefined}
                />
              )}
            </RoleGroup>
            <RoleGroup title="Valvurid" officers={group.officers.filter((officer) => officer.role !== 'vanemvalvur')}>
              {(officer) => (
                <OfficerRow
                  officer={officer}
                  selected={selectedOfficerId === officer.id}
                  onSelect={() => onSelectOfficer(selectedOfficerId === officer.id ? null : officer.id)}
                  buildingName={buildingLabel(officer, buildings)}
                  incidentTitle={officer.currentIncidentId ? incidents.find((incident) => incident.id === officer.currentIncidentId)?.title : undefined}
                  busName={officer.currentBusId ? buses.find((bus) => bus.id === officer.currentBusId)?.name : undefined}
                />
              )}
            </RoleGroup>
          </OfficerGroup>
        ))}
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
            Simulatsiooni ettevalmistus {setupOpen ? '-' : '+'}
          </button>
          {setupOpen && (
            <TeacherPreparationPanel
              simulation={simulation}
              officers={officers}
              buildings={buildings}
              onSetSetupMode={onSetSetupMode}
              onAddOfficer={onAddOfficer}
              onUpdateOfficer={onUpdateOfficer}
              onRemoveOfficer={onRemoveOfficer}
              onUpdateBuildingMinimum={onUpdateBuildingMinimum}
              onStartSimulation={onStartSimulation}
            />
          )}
        </div>
      )}
    </div>
  );
};

const TeacherPreparationPanel: React.FC<{
  simulation: Simulation;
  officers: Officer[];
  buildings: Building[];
  onSetSetupMode: (mode: SetupMode) => void;
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string, role?: OfficerRole) => void;
  onUpdateOfficer: (officerId: string, patch: OfficerSetupPatch) => void;
  onRemoveOfficer: (officerId: string) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
  onStartSimulation: () => void;
}> = ({
  simulation,
  officers,
  buildings,
  onSetSetupMode,
  onAddOfficer,
  onUpdateOfficer,
  onRemoveOfficer,
  onUpdateBuildingMinimum,
  onStartSimulation,
}) => {
  const regularBuildings = buildings.filter((building) => !building.isResourcePool);
  const resourcePool = buildings.find((building) => building.isResourcePool);
  const placementOptions = resourcePool ? [...regularBuildings, resourcePool] : regularBuildings;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<OfficerGender>('male');
  const [officerRole, setOfficerRole] = useState<OfficerRole>('valvur');
  const [escort, setEscort] = useState(false);
  const [taser, setTaser] = useState(false);
  const [buildingId, setBuildingId] = useState(regularBuildings[0]?.id ?? '');
  const [minimumDrafts, setMinimumDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    const drafts = regularBuildings.reduce<Record<string, number>>((next, building) => {
      next[building.id] = building.minimumStaff;
      return next;
    }, {});
    setMinimumDrafts(drafts);
  }, [buildings]);

  const canEditMode = simulation.status === 'setup';
  const poolOfficerCount = resourcePool ? countOfficersInBuilding(resourcePool.id, officers) : 0;
  const unitsBelowMinimum = regularBuildings.filter((building) => countOfficersInBuilding(building.id, officers) < building.minimumStaff);

  const updateOfficerHome = (officer: Officer, nextBuildingId: string) => {
    const building = buildings.find((item) => item.id === nextBuildingId);
    const homeBuildingId = building?.isResourcePool ? null : nextBuildingId || null;
    const patch: OfficerSetupPatch = { homeBuildingId };
    if (simulation.setupMode === 'teacher_assigned' && !officer.currentIncidentId && !officer.currentBusId && nextBuildingId) {
      patch.currentBuildingId = nextBuildingId;
      patch.status = building?.isResourcePool ? 'available' : 'in_building';
      patch.currentIncidentId = null;
      patch.currentBusId = null;
    }
    onUpdateOfficer(officer.id, patch);
  };

  const updateOfficerStartLocation = (officer: Officer, nextBuildingId: string) => {
    const building = buildings.find((item) => item.id === nextBuildingId);
    onUpdateOfficer(officer.id, {
      currentBuildingId: nextBuildingId,
      currentIncidentId: null,
      currentBusId: null,
      status: building?.isResourcePool ? 'available' : 'in_building',
      homeBuildingId: building && !building.isResourcePool ? officer.homeBuildingId ?? nextBuildingId : officer.homeBuildingId,
    });
  };

  const saveMinimums = () => {
    regularBuildings.forEach((building) => {
      const value = minimumDrafts[building.id];
      onUpdateBuildingMinimum(building.id, Number.isFinite(value) ? value : building.minimumStaff);
    });
  };

  const removeOfficer = (officer: Officer) => {
    if (simulation.status !== 'setup') {
      window.alert('Aktiivse simulatsiooni ajal ei ole ametniku eemaldamine soovitatav.');
      return;
    }
    if (window.confirm(`Eemalda ametnik ${officer.name}?`)) {
      onRemoveOfficer(officer.id);
    }
  };

  return (
    <div style={setupContentStyle}>
      <SetupSection title="Algpaigutus">
        <div style={{ display: 'grid', gap: 6 }}>
          <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'teacher_assigned'} onClick={() => onSetSetupMode('teacher_assigned')}>
            Õppejõud määrab ametnikud üksustesse
          </SmallButton>
          <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'student_places_officers'} onClick={() => onSetSetupMode('student_places_officers')}>
            Korrapidaja alustab ametnike paigutamisega
          </SmallButton>
        </div>
      </SetupSection>

      <SetupSection title="Üksuste miinimumkoosseis">
        <div style={setupTableHeaderStyle}>
          <span>Üksus / hoone</span>
          <span>Miinimumkoosseis</span>
        </div>
        <div style={minimumListStyle}>
          {regularBuildings.map((building) => (
            <label key={building.id} style={minRowStyle}>
              <span>{building.name}</span>
              <input
                type="number"
                min={0}
                value={minimumDrafts[building.id] ?? building.minimumStaff}
                onChange={(event) =>
                  setMinimumDrafts((current) => ({
                    ...current,
                    [building.id]: Math.max(0, Number(event.target.value)),
                  }))
                }
                style={{ ...smallInputStyle, width: 64, padding: '3px 5px' }}
              />
            </label>
          ))}
        </div>
        <button style={wideSmallButtonStyle} onClick={saveMinimums}>
          Salvesta miinimumid
        </button>
      </SetupSection>

      <SetupSection title="Ametnikud">
        <div style={officerSetupListStyle}>
          {officers.map((officer) => (
            <div key={officer.id} style={officerSetupRowStyle}>
              <label style={fieldStyle}>
                <span>Ametnik</span>
                <input
                  disabled={!canEditMode}
                  defaultValue={officer.name}
                  onBlur={(event) => {
                    if (event.target.value.trim() !== officer.name) onUpdateOfficer(officer.id, { name: event.target.value });
                  }}
                  style={smallInputStyle}
                />
              </label>
              <label style={fieldStyle}>
                <span>Roll</span>
                <select disabled={!canEditMode} value={officer.role} onChange={(event) => onUpdateOfficer(officer.id, { role: event.target.value as OfficerRole })} style={smallInputStyle}>
                  <option value="valvur">Valvur</option>
                  <option value="vanemvalvur">Vanemvalvur</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span>Sugu</span>
                <select disabled={!canEditMode} value={officer.gender} onChange={(event) => onUpdateOfficer(officer.id, { gender: event.target.value as OfficerGender })} style={smallInputStyle}>
                  <option value="male">Mees</option>
                  <option value="female">Naine</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span>Saateõigus</span>
                <select disabled={!canEditMode} value={officer.hasEscortPermission ? 'yes' : 'no'} onChange={(event) => onUpdateOfficer(officer.id, { hasEscortPermission: event.target.value === 'yes' })} style={smallInputStyle}>
                  <option value="yes">Jah</option>
                  <option value="no">Ei</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span>Elektrišokirelva õigus</span>
                <select disabled={!canEditMode} value={officer.hasTaserPermission ? 'yes' : 'no'} onChange={(event) => onUpdateOfficer(officer.id, { hasTaserPermission: event.target.value === 'yes' })} style={smallInputStyle}>
                  <option value="yes">Jah</option>
                  <option value="no">Ei</option>
                </select>
              </label>
              <label style={fieldStyle}>
                <span>Määratud üksus</span>
                <select disabled={!canEditMode} value={officer.homeBuildingId ?? resourcePool?.id ?? ''} onChange={(event) => updateOfficerHome(officer, event.target.value)} style={smallInputStyle}>
                  {resourcePool && <option value={resourcePool.id}>Valves olevad ametnikud</option>}
                  {regularBuildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </label>
              <label style={fieldStyle}>
                <span>Algne asukoht</span>
                <select
                  value={officer.currentBuildingId ?? resourcePool?.id ?? ''}
                  disabled={!canEditMode || simulation.setupMode === 'student_places_officers'}
                  onChange={(event) => updateOfficerStartLocation(officer, event.target.value)}
                  style={smallInputStyle}
                >
                  {placementOptions.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </label>
              <button style={dangerSmallButtonStyle} onClick={() => removeOfficer(officer)}>
                Eemalda
              </button>
            </div>
          ))}
        </div>

        <div style={addOfficerBoxStyle}>
          <div style={miniLabelStyle}>Lisa ametnik</div>
          <input disabled={!canEditMode} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ametniku kood" style={smallInputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
            <select disabled={!canEditMode} value={gender} onChange={(event) => setGender(event.target.value as OfficerGender)} style={smallInputStyle}>
              <option value="male">Mees</option>
              <option value="female">Naine</option>
            </select>
            <select disabled={!canEditMode} value={officerRole} onChange={(event) => setOfficerRole(event.target.value as OfficerRole)} style={smallInputStyle}>
              <option value="valvur">Valvur</option>
              <option value="vanemvalvur">Vanemvalvur</option>
            </select>
          </div>
          <div style={{ marginTop: 5 }}>
            <select disabled={!canEditMode} value={buildingId} onChange={(event) => setBuildingId(event.target.value)} style={smallInputStyle}>
              {regularBuildings.map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </div>
          <label style={checkStyle}><input type="checkbox" disabled={!canEditMode} checked={escort} onChange={(event) => setEscort(event.target.checked)} /> Saateõigus</label>
          <label style={checkStyle}><input type="checkbox" disabled={!canEditMode} checked={taser} onChange={(event) => setTaser(event.target.checked)} /> Elektrišokirelva õigus</label>
          <button
            style={wideSmallButtonStyle}
            disabled={!canEditMode}
            onClick={() => {
              onAddOfficer(name, gender, escort, taser, buildingId, officerRole);
              setName('');
            }}
          >
            Lisa ametnik
          </button>
        </div>
      </SetupSection>

      <SetupSection title="Mängu alustamine">
        <div style={summaryGridStyle}>
          <span>Üksuseid</span><strong>{regularBuildings.length}</strong>
          <span>Ametnikke</span><strong>{officers.length}</strong>
          <span>Valves olevad ametnikud</span><strong>{poolOfficerCount}</strong>
          <span>Alla miinimumi</span><strong>{unitsBelowMinimum.length}</strong>
        </div>
        {unitsBelowMinimum.length > 0 && <div style={setupWarningStyle}>Mõned üksused on alla miinimumkoosseisu.</div>}
        {simulation.status === 'setup' ? (
          <button style={startButtonStyle} onClick={onStartSimulation}>
            Alusta simulatsiooni
          </button>
        ) : (
          <div style={activeNoticeStyle}>Simulatsioon on aktiivne.</div>
        )}
      </SetupSection>
    </div>
  );
};

const TeacherSetup: React.FC<{
  simulation: Simulation;
  buildings: Building[];
  onSetSetupMode: (mode: SetupMode) => void;
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string, role?: OfficerRole) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
}> = ({ simulation, buildings, onSetSetupMode, onAddOfficer, onUpdateBuildingMinimum }) => {
  const firstBuilding = buildings.find((building) => !building.isResourcePool)?.id;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<OfficerGender>('male');
  const [officerRole, setOfficerRole] = useState<OfficerRole>('valvur');
  const [escort, setEscort] = useState(false);
  const [taser, setTaser] = useState(false);
  const [buildingId, setBuildingId] = useState(firstBuilding ?? '');

  const canEditMode = simulation.status === 'setup';

  return (
    <div style={{ padding: 8 }}>
      <div style={miniLabelStyle}>Seadistuse režiim</div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'teacher_assigned'} onClick={() => onSetSetupMode('teacher_assigned')}>
          A
        </SmallButton>
        <SmallButton disabled={!canEditMode} active={simulation.setupMode === 'student_places_officers'} onClick={() => onSetSetupMode('student_places_officers')}>
          B
        </SmallButton>
      </div>

      <div style={miniLabelStyle}>Lisa ametnik</div>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ametniku kood" style={smallInputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
        <select value={gender} onChange={(event) => setGender(event.target.value as OfficerGender)} style={smallInputStyle}>
          <option value="male">Mees</option>
          <option value="female">Naine</option>
        </select>
        <select value={officerRole} onChange={(event) => setOfficerRole(event.target.value as OfficerRole)} style={smallInputStyle}>
          <option value="valvur">Valvur</option>
          <option value="vanemvalvur">Vanemvalvur</option>
        </select>
      </div>
      <div style={{ marginTop: 5 }}>
        <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} style={smallInputStyle}>
          {buildings.filter((building) => !building.isResourcePool).map((building) => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
      </div>
      <label style={checkStyle}><input type="checkbox" checked={escort} onChange={(event) => setEscort(event.target.checked)} /> Saateõigus</label>
      <label style={checkStyle}><input type="checkbox" checked={taser} onChange={(event) => setTaser(event.target.checked)} /> EŠR õigus</label>
      <button
        style={wideSmallButtonStyle}
        onClick={() => {
          onAddOfficer(name, gender, escort, taser, buildingId, officerRole);
          setName('');
        }}
      >
        Lisa ametnik
      </button>

      <div style={{ ...miniLabelStyle, marginTop: 12 }}>Miinimumkoosseis</div>
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

function officerGroupId(officer: Officer) {
  return officer.homeBuildingId ?? officer.currentBuildingId ?? officer.currentBusId ?? 'other';
}

function buildingLabel(officer: Officer, buildings: Building[]) {
  const buildingId = officer.currentBuildingId ?? officer.homeBuildingId;
  return buildingId ? buildings.find((building) => building.id === buildingId)?.name : undefined;
}

function countOfficersInBuilding(buildingId: string, officers: Officer[]) {
  return officers.filter(
    (officer) =>
      officer.currentBuildingId === buildingId &&
      !officer.currentIncidentId &&
      !officer.currentBusId &&
      officer.status !== 'unavailable'
  ).length;
}

function dragOfficer(event: React.DragEvent, officerId: string) {
  event.dataTransfer.setData('text/plain', officerId);
  event.dataTransfer.effectAllowed = 'move';
}

const OfficerGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={officerGroupStyle}>
    <div style={groupTitleStyle}>{title}</div>
    {children}
  </section>
);

const RoleGroup: React.FC<{ title: string; officers: Officer[]; children: (officer: Officer) => React.ReactNode }> = ({ title, officers, children }) => {
  if (officers.length === 0) return null;
  return (
    <div style={roleGroupStyle}>
      <div style={roleTitleStyle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {officers.map((officer) => (
          <React.Fragment key={officer.id}>{children(officer)}</React.Fragment>
        ))}
      </div>
    </div>
  );
};

const OfficerRow: React.FC<{
  officer: Officer;
  selected: boolean;
  onSelect: () => void;
  buildingName?: string;
  incidentTitle?: string;
  busName?: string;
}> = ({ officer, selected, onSelect, buildingName, incidentTitle, busName }) => (
  <div draggable onDragStart={(event) => dragOfficer(event, officer.id)}>
    <OfficerCard
      officer={officer}
      selected={selected}
      onClick={onSelect}
      buildingName={buildingName}
      incidentTitle={incidentTitle}
      busName={busName}
    />
  </div>
);

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

const SetupSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={setupSectionStyle}>
    <div style={setupSectionTitleStyle}>{title}</div>
    {children}
  </section>
);

const sidebarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-panel)',
  borderRight: '1px solid var(--border)',
  overflow: 'hidden',
  flexShrink: 0,
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '12px 14px 10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-muted)',
  letterSpacing: 2,
  textTransform: 'uppercase',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const officerGroupStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.52)',
  padding: 8,
  boxShadow: 'var(--shadow-card)',
};

const groupTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-primary)',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 7,
};

const roleGroupStyle: React.CSSProperties = {
  marginTop: 5,
};

const roleTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  color: 'var(--text-muted)',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 4,
};

const detailStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  padding: 10,
  overflowY: 'auto',
  maxHeight: '45%',
};

const setupShellStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  maxHeight: '58%',
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

const setupContentStyle: React.CSSProperties = {
  padding: 8,
  display: 'grid',
  gap: 8,
};

const setupSectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.45)',
  padding: 8,
};

const setupSectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--amber)',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  marginBottom: 7,
};

const setupTableHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 72px',
  gap: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  color: 'var(--text-muted)',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginBottom: 5,
};

const minimumListStyle: React.CSSProperties = {
  maxHeight: 145,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const officerSetupListStyle: React.CSSProperties = {
  maxHeight: 245,
  overflowY: 'auto',
  display: 'grid',
  gap: 7,
  paddingRight: 2,
};

const officerSetupRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 5,
  padding: 7,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-card)',
};

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 3,
  color: 'var(--text-muted)',
  fontSize: 10,
};

const addOfficerBoxStyle: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid var(--border)',
};

const dangerSmallButtonStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid rgba(185,67,77,0.35)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  padding: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '5px 8px',
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const setupWarningStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 7,
  border: '1px solid rgba(185,67,77,0.28)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(185,67,77,0.09)',
  color: 'var(--red)',
  fontSize: 12,
};

const startButtonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 8,
  background: 'var(--cyan)',
  border: '1px solid var(--cyan)',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
  padding: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const activeNoticeStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  border: '1px solid var(--green)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
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
  gridTemplateColumns: '1fr 72px',
  gap: 6,
  alignItems: 'center',
  fontSize: 11,
  color: 'var(--text-secondary)',
};
