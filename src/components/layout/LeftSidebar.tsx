import React, { useEffect, useMemo, useState } from 'react';
import { AppRole, Building, EscortBus, Incident, Officer, OfficerGender, OfficerRole, SetupMode, Simulation } from '../../models';
import { OfficerDetailPanel } from '../officers/OfficerDetailPanel';
import { officerGenderLabels, officerStatusLabels } from '../officers/OfficerMarker';

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

type OfficerFilter = 'all' | 'senior' | 'guard' | 'escort' | 'taser';

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
  onUpdateBuildingMinimums: (minimums: Record<string, number>) => void;
  onSetSetupMode: (mode: SetupMode) => void;
  onStartSimulation: () => void;
}

interface OfficerDraft {
  name: string;
  role: OfficerRole;
  gender: OfficerGender;
  escort: boolean;
  taser: boolean;
  homeBuildingId: string;
  currentBuildingId: string;
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
  onUpdateBuildingMinimums,
  onSetSetupMode,
  onStartSimulation,
}) => {
  const selectedOfficer = officers.find((officer) => officer.id === selectedOfficerId);

  if (role !== 'facilitator') {
    return (
      <StudentOfficerPanel
        selectedOfficer={selectedOfficer}
        buildings={buildings}
        incidents={incidents}
        buses={buses}
        onMoveToBuilding={(buildingId) => selectedOfficer && onMoveToBuilding(selectedOfficer.id, buildingId)}
        onAssignToIncident={(incidentId) => selectedOfficer && onAssignToIncident(selectedOfficer.id, incidentId)}
        onAssignToBus={(busId) => selectedOfficer && onAssignToBus(selectedOfficer.id, busId)}
        onRelease={() => selectedOfficer && onRelease(selectedOfficer.id)}
        onClose={() => onSelectOfficer(null)}
      />
    );
  }

  return (
    <TeacherOfficerManagementPanel
      simulation={simulation}
      officers={officers}
      buildings={buildings}
      selectedOfficer={selectedOfficer}
      selectedOfficerId={selectedOfficerId}
      onSelectOfficer={onSelectOfficer}
      onAddOfficer={onAddOfficer}
      onUpdateOfficer={onUpdateOfficer}
      onRemoveOfficer={onRemoveOfficer}
      onUpdateBuildingMinimum={onUpdateBuildingMinimum}
      onUpdateBuildingMinimums={onUpdateBuildingMinimums}
      onSetSetupMode={onSetSetupMode}
      onStartSimulation={onStartSimulation}
    />
  );
};

const StudentOfficerPanel: React.FC<{
  selectedOfficer?: Officer;
  buildings: Building[];
  incidents: Incident[];
  buses: EscortBus[];
  onMoveToBuilding: (buildingId: string) => void;
  onAssignToIncident: (incidentId: string) => void;
  onAssignToBus: (busId: string) => void;
  onRelease: () => void;
  onClose: () => void;
}> = ({ selectedOfficer, buildings, incidents, buses, onMoveToBuilding, onAssignToIncident, onAssignToBus, onRelease, onClose }) => (
  <aside style={sidebarStyle}>
    <SectionHeader title="Ametniku info" />
    <div style={studentPanelBodyStyle}>
      {selectedOfficer ? (
        <OfficerDetailPanel
          officer={selectedOfficer}
          buildings={buildings}
          incidents={incidents}
          buses={buses}
          onMoveToBuilding={onMoveToBuilding}
          onAssignToIncident={onAssignToIncident}
          onAssignToBus={onAssignToBus}
          onRelease={onRelease}
          onClose={onClose}
        />
      ) : (
        <div style={studentHintStyle}>
          Vali kaardilt ametnik, et näha tema infot ja suunamise võimalusi. Operatiivne pilt on kaardil.
        </div>
      )}
    </div>
  </aside>
);

const TeacherOfficerManagementPanel: React.FC<{
  simulation: Simulation;
  officers: Officer[];
  buildings: Building[];
  selectedOfficer?: Officer;
  selectedOfficerId: string | null;
  onSelectOfficer: (id: string | null) => void;
  onAddOfficer: (name: string, gender: OfficerGender, escort: boolean, taser: boolean, buildingId?: string, role?: OfficerRole) => void;
  onUpdateOfficer: (officerId: string, patch: OfficerSetupPatch) => void;
  onRemoveOfficer: (officerId: string) => void;
  onUpdateBuildingMinimum: (buildingId: string, minimum: number) => void;
  onUpdateBuildingMinimums: (minimums: Record<string, number>) => void;
  onSetSetupMode: (mode: SetupMode) => void;
  onStartSimulation: () => void;
}> = ({
  simulation,
  officers,
  buildings,
  selectedOfficer,
  selectedOfficerId,
  onSelectOfficer,
  onAddOfficer,
  onUpdateOfficer,
  onRemoveOfficer,
  onUpdateBuildingMinimum,
  onUpdateBuildingMinimums,
  onSetSetupMode,
  onStartSimulation,
}) => {
  const regularBuildings = buildings.filter((building) => !building.isResourcePool);
  const resourcePool = buildings.find((building) => building.isResourcePool);
  const placementOptions = resourcePool ? [...regularBuildings, resourcePool] : regularBuildings;
  const setupEditable = simulation.status === 'setup';
  const classroomMode = Boolean(simulation.classroomExerciseId || simulation.classroomGroupName);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OfficerFilter>('all');
  const [addName, setAddName] = useState('');
  const [addGender, setAddGender] = useState<OfficerGender>('male');
  const [addRole, setAddRole] = useState<OfficerRole>('valvur');
  const [addEscort, setAddEscort] = useState(false);
  const [addTaser, setAddTaser] = useState(false);
  const [addBuildingId, setAddBuildingId] = useState(placementOptions[0]?.id ?? '');
  const [draft, setDraft] = useState<OfficerDraft | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [minimumDrafts, setMinimumDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedOfficer) {
      setDraft(null);
      return;
    }
    setDraft({
      name: selectedOfficer.name,
      role: selectedOfficer.role,
      gender: selectedOfficer.gender,
      escort: selectedOfficer.hasEscortPermission,
      taser: selectedOfficer.hasTaserPermission,
      homeBuildingId: selectedOfficer.homeBuildingId ?? resourcePool?.id ?? '',
      currentBuildingId: selectedOfficer.currentBuildingId ?? resourcePool?.id ?? '',
    });
  }, [resourcePool?.id, selectedOfficer]);

  useEffect(() => {
    const drafts = regularBuildings.reduce<Record<string, number>>((next, building) => {
      next[building.id] = building.minimumStaff;
      return next;
    }, {});
    setMinimumDrafts(drafts);
  }, [buildings]);

  const filteredOfficers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return officers.filter((officer) => {
      if (filter === 'senior' && officer.role !== 'vanemvalvur') return false;
      if (filter === 'guard' && officer.role !== 'valvur') return false;
      if (filter === 'escort' && !officer.hasEscortPermission) return false;
      if (filter === 'taser' && !officer.hasTaserPermission) return false;
      if (!normalizedQuery) return true;
      const homeUnit = unitName(officer.homeBuildingId ?? officer.currentBuildingId, buildings);
      const haystack = [
        officer.name,
        officer.role === 'vanemvalvur' ? 'vanemvalvur' : 'valvur',
        officerGenderLabels[officer.gender],
        homeUnit,
        officer.hasEscortPermission ? 'saateõigus saade' : '',
        officer.hasTaserPermission ? 'ešr elektrišokirelv' : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [buildings, filter, officers, query]);

  const addOfficer = () => {
    if (!setupEditable) {
      window.alert('Aktiivse simulatsiooni ajal ametnike põhiseadistuse muutmine võib mõjutada harjutust.');
      return;
    }
    onAddOfficer(addName, addGender, addEscort, addTaser, addBuildingId, addRole);
    setAddName('');
  };

  const saveSelectedOfficer = () => {
    if (!selectedOfficer || !draft) return;
    if (!setupEditable) {
      window.alert('Aktiivse simulatsiooni ajal ametnike põhiseadistuse muutmine võib mõjutada harjutust.');
      return;
    }
    const homeBuilding = buildings.find((building) => building.id === draft.homeBuildingId);
    const currentBuilding = buildings.find((building) => building.id === draft.currentBuildingId);
    onUpdateOfficer(selectedOfficer.id, {
      name: draft.name,
      role: draft.role,
      gender: draft.gender,
      hasEscortPermission: draft.escort,
      hasTaserPermission: draft.taser,
      homeBuildingId: homeBuilding?.isResourcePool ? null : draft.homeBuildingId || null,
      currentBuildingId: draft.currentBuildingId || null,
      currentIncidentId: null,
      currentBusId: null,
      status: currentBuilding?.isResourcePool ? 'available' : 'in_building',
    });
  };

  const removeSelectedOfficer = () => {
    if (!selectedOfficer) return;
    if (!setupEditable) {
      window.alert('Aktiivse simulatsiooni ajal ametnike põhiseadistuse muutmine võib mõjutada harjutust.');
      return;
    }
    if (window.confirm(`Eemalda ametnik ${selectedOfficer.name}?`)) {
      onRemoveOfficer(selectedOfficer.id);
      onSelectOfficer(null);
    }
  };

  const saveMinimums = () => {
    const nextMinimums = regularBuildings.reduce<Record<string, number>>((next, building) => {
      const value = minimumDrafts[building.id];
      next[building.id] = Number.isFinite(value) ? value : building.minimumStaff;
      return next;
    }, {});
    onUpdateBuildingMinimums(nextMinimums);
  };

  return (
    <aside style={sidebarStyle}>
      <SectionHeader title="Ametnike haldus" count={officers.length} />
      <div style={managementBodyStyle}>
        {classroomMode && (
          <InfoNotice>
            <strong>Ühine algseis kõigile gruppidele</strong>
            <span>Enne simulatsiooni alustamist tehtud muudatused rakenduvad kõigile gruppidele. Pärast alustamist lahendavad grupid olukorda eraldi.</span>
          </InfoNotice>
        )}
        {!setupEditable && (
          <InfoNotice tone="warning">
            Aktiivse simulatsiooni ajal ametnike põhiseadistuse muutmine võib mõjutada harjutust.
          </InfoNotice>
        )}

        <PanelSection title="Ametnike otsing">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Otsi ametnikku..."
            style={inputStyle}
          />
          <div style={filterGridStyle}>
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Kõik</FilterButton>
            <FilterButton active={filter === 'senior'} onClick={() => setFilter('senior')}>Vanemvalvurid</FilterButton>
            <FilterButton active={filter === 'guard'} onClick={() => setFilter('guard')}>Valvurid</FilterButton>
            <FilterButton active={filter === 'escort'} onClick={() => setFilter('escort')}>Saateõigusega</FilterButton>
            <FilterButton active={filter === 'taser'} onClick={() => setFilter('taser')}>EŠR õigusega</FilterButton>
          </div>
        </PanelSection>

        <PanelSection title="Lisa ametnik">
          <div style={addGridStyle}>
            <input
              disabled={!setupEditable}
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              placeholder="Ametniku kood"
              style={inputStyle}
            />
            <select disabled={!setupEditable} value={addRole} onChange={(event) => setAddRole(event.target.value as OfficerRole)} style={inputStyle}>
              <option value="valvur">Valvur</option>
              <option value="vanemvalvur">Vanemvalvur</option>
            </select>
            <select disabled={!setupEditable} value={addGender} onChange={(event) => setAddGender(event.target.value as OfficerGender)} style={inputStyle}>
              <option value="male">Mees</option>
              <option value="female">Naine</option>
            </select>
            <select disabled={!setupEditable} value={addBuildingId} onChange={(event) => setAddBuildingId(event.target.value)} style={inputStyle}>
              {placementOptions.map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </div>
          <div style={checkRowStyle}>
            <label style={checkStyle}><input type="checkbox" disabled={!setupEditable} checked={addEscort} onChange={(event) => setAddEscort(event.target.checked)} /> Saateõigus</label>
            <label style={checkStyle}><input type="checkbox" disabled={!setupEditable} checked={addTaser} onChange={(event) => setAddTaser(event.target.checked)} /> Elektrišokirelva õigus</label>
          </div>
          <button disabled={!setupEditable} onClick={addOfficer} style={primaryButtonStyle}>
            Lisa ametnik
          </button>
        </PanelSection>

        <PanelSection title="Ametnike nimekiri" meta={`${filteredOfficers.length}/${officers.length}`}>
          <div style={officerListStyle}>
            {filteredOfficers.length === 0 ? (
              <div style={emptyTextStyle}>Sobivaid ametnikke ei leitud.</div>
            ) : (
              filteredOfficers.map((officer) => (
                <OfficerManagementRow
                  key={officer.id}
                  officer={officer}
                  selected={officer.id === selectedOfficerId}
                  homeUnit={unitName(officer.homeBuildingId ?? officer.currentBuildingId, buildings)}
                  onClick={() => onSelectOfficer(officer.id === selectedOfficerId ? null : officer.id)}
                />
              ))
            )}
          </div>
        </PanelSection>

        <PanelSection title="Valitud ametniku andmed">
          {selectedOfficer && draft ? (
            <div style={editPanelStyle}>
              <Field label="Ametnik / kood">
                <input disabled={!setupEditable} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={inputStyle} />
              </Field>
              <div style={twoColumnStyle}>
                <Field label="Roll">
                  <select disabled={!setupEditable} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as OfficerRole })} style={inputStyle}>
                    <option value="valvur">Valvur</option>
                    <option value="vanemvalvur">Vanemvalvur</option>
                  </select>
                </Field>
                <Field label="Sugu">
                  <select disabled={!setupEditable} value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as OfficerGender })} style={inputStyle}>
                    <option value="male">Mees</option>
                    <option value="female">Naine</option>
                  </select>
                </Field>
              </div>
              <div style={checkColumnStyle}>
                <label style={checkStyle}><input type="checkbox" disabled={!setupEditable} checked={draft.escort} onChange={(event) => setDraft({ ...draft, escort: event.target.checked })} /> Saateõigus</label>
                <label style={checkStyle}><input type="checkbox" disabled={!setupEditable} checked={draft.taser} onChange={(event) => setDraft({ ...draft, taser: event.target.checked })} /> Elektrišokirelva õigus</label>
              </div>
              <Field label="Määratud üksus">
                <select disabled={!setupEditable} value={draft.homeBuildingId} onChange={(event) => setDraft({ ...draft, homeBuildingId: event.target.value })} style={inputStyle}>
                  {resourcePool && <option value={resourcePool.id}>Valves olevad ametnikud</option>}
                  {regularBuildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Algne asukoht">
                <select
                  disabled={!setupEditable || simulation.setupMode === 'student_places_officers'}
                  value={draft.currentBuildingId}
                  onChange={(event) => setDraft({ ...draft, currentBuildingId: event.target.value })}
                  style={inputStyle}
                >
                  {placementOptions.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </Field>
              <div style={buttonRowStyle}>
                <button disabled={!setupEditable} onClick={saveSelectedOfficer} style={primaryButtonStyle}>
                  Salvesta muudatused
                </button>
                <button onClick={() => onSelectOfficer(null)} style={secondaryButtonStyle}>
                  Tühista
                </button>
              </div>
              <button disabled={!setupEditable} onClick={removeSelectedOfficer} style={dangerButtonStyle}>
                Eemalda ametnik
              </button>
            </div>
          ) : (
            <div style={emptyTextStyle}>Vali nimekirjast ametnik.</div>
          )}
        </PanelSection>

        <button onClick={() => setSetupOpen((value) => !value)} style={setupToggleStyle}>
          Algseadistus ja miinimumid {setupOpen ? '-' : '+'}
        </button>
        {setupOpen && (
          <PanelSection title="Algseadistus">
            <div style={twoColumnStyle}>
              <SmallButton disabled={!setupEditable} active={simulation.setupMode === 'teacher_assigned'} onClick={() => onSetSetupMode('teacher_assigned')}>
                Režiim A
              </SmallButton>
              <SmallButton disabled={!setupEditable} active={simulation.setupMode === 'student_places_officers'} onClick={() => onSetSetupMode('student_places_officers')}>
                Režiim B
              </SmallButton>
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
                    style={{ ...inputStyle, padding: '4px 6px' }}
                  />
                </label>
              ))}
            </div>
            <button disabled={!setupEditable} onClick={saveMinimums} style={secondaryButtonStyle}>
              Salvesta miinimumid
            </button>
            {simulation.status === 'setup' ? (
              <button onClick={onStartSimulation} style={startButtonStyle}>Alusta simulatsiooni</button>
            ) : (
              <div style={activeNoticeStyle}>Simulatsioon on aktiivne.</div>
            )}
            <div style={smallMutedStyle}>Õpilaste töö algab pärast simulatsiooni alustamist.</div>
          </PanelSection>
        )}
      </div>
    </aside>
  );
};

const OfficerManagementRow: React.FC<{
  officer: Officer;
  selected: boolean;
  homeUnit?: string;
  onClick: () => void;
}> = ({ officer, selected, homeUnit, onClick }) => (
  <button onClick={onClick} style={officerRowStyle(selected)}>
    <div style={officerTopRowStyle}>
      <strong>{officer.name}</strong>
      <span style={statusBadgeStyle(officer.status)}>{officerStatusLabels[officer.status]}</span>
    </div>
    <div style={badgeRowStyle}>
      <Badge tone={officer.role === 'vanemvalvur' ? 'dark' : 'plain'}>{officer.role === 'vanemvalvur' ? 'VV' : 'V'}</Badge>
      <Badge tone={officer.gender === 'female' ? 'rose' : 'blue'}>{officer.gender === 'female' ? 'N' : 'M'}</Badge>
      {officer.hasEscortPermission && <Badge tone="green">Saade</Badge>}
      {officer.hasTaserPermission && <Badge tone="amber">EŠR</Badge>}
    </div>
    <div style={homeUnitStyle}>{homeUnit ?? 'Määramata üksus'}</div>
  </button>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={fieldStyle}>
    <span>{label}</span>
    {children}
  </label>
);

const PanelSection: React.FC<{ title: string; meta?: string; children: React.ReactNode }> = ({ title, meta, children }) => (
  <section style={panelSectionStyle}>
    <div style={sectionTitleRowStyle}>
      <span>{title}</span>
      {meta && <strong>{meta}</strong>}
    </div>
    {children}
  </section>
);

const InfoNotice: React.FC<{ children: React.ReactNode; tone?: 'info' | 'warning' }> = ({ children, tone = 'info' }) => (
  <div style={noticeStyle(tone)}>{children}</div>
);

const FilterButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} style={filterButtonStyle(active)}>{children}</button>
);

const SmallButton: React.FC<{ active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button disabled={disabled} onClick={onClick} style={{ ...smallButtonStyle, borderColor: active ? 'var(--cyan)' : 'var(--border)', color: active ? 'var(--cyan)' : 'var(--text-secondary)', opacity: disabled ? 0.45 : 1 }}>
    {children}
  </button>
);

const Badge: React.FC<{ tone: 'dark' | 'plain' | 'rose' | 'blue' | 'green' | 'amber'; children: React.ReactNode }> = ({ tone, children }) => (
  <span style={badgeStyle(tone)}>{children}</span>
);

const SectionHeader: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
  <div style={sectionHeaderStyle}>
    <span>{title}</span>
    {count !== undefined && <span style={{ color: 'var(--cyan)' }}>{count}</span>}
  </div>
);

function unitName(buildingId: string | null | undefined, buildings: Building[]) {
  if (!buildingId) return undefined;
  return buildings.find((building) => building.id === buildingId)?.name;
}

const sidebarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#eef3f8',
  borderRight: '1px solid var(--border-bright)',
  overflow: 'hidden',
  flexShrink: 0,
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '12px 14px 10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#f8fafc',
  borderBottom: '1px solid var(--border-bright)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--text-primary)',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const managementBodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const studentPanelBodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 10,
};

const studentHintStyle: React.CSSProperties = {
  padding: 12,
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  lineHeight: 1.4,
};

const panelSectionStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: '#ffffff',
  padding: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  boxShadow: 'var(--shadow-card)',
};

const sectionTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const noticeStyle = (tone: 'info' | 'warning'): React.CSSProperties => ({
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  background: tone === 'warning' ? 'rgba(166,111,31,0.08)' : 'rgba(34,121,157,0.08)',
  border: `1px solid ${tone === 'warning' ? 'var(--amber-dim)' : 'var(--cyan-dim)'}`,
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 11.5,
  lineHeight: 1.35,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '6px 8px',
  fontSize: 12,
  minWidth: 0,
};

const filterGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
};

const filterButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 24,
  padding: '4px 7px',
  background: active ? 'rgba(34,121,157,0.10)' : 'transparent',
  border: `1px solid ${active ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-sm)',
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
});

const addGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
};

const checkRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const checkColumnStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
};

const checkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  color: 'var(--text-secondary)',
  fontSize: 11.5,
};

const officerListStyle: React.CSSProperties = {
  maxHeight: 220,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  paddingRight: 2,
};

const officerRowStyle = (selected: boolean): React.CSSProperties => ({
  width: '100%',
  padding: 8,
  background: selected ? 'rgba(34,121,157,0.08)' : 'var(--bg-card)',
  border: `1px solid ${selected ? 'var(--cyan-dim)' : 'var(--border)'}`,
  borderLeft: `3px solid ${selected ? 'var(--cyan)' : 'var(--border-bright)'}`,
  borderRadius: 'var(--radius-sm)',
  textAlign: 'left',
  display: 'grid',
  gap: 5,
});

const officerTopRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'center',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const badgeStyle = (tone: 'dark' | 'plain' | 'rose' | 'blue' | 'green' | 'amber'): React.CSSProperties => {
  const colors = {
    dark: ['var(--text-primary)', '#ffffff', 'var(--text-primary)'],
    plain: ['var(--text-secondary)', 'transparent', 'var(--border-bright)'],
    rose: ['#9b4f84', 'rgba(155,79,132,0.10)', '#9b4f84'],
    blue: ['var(--cyan)', 'rgba(34,121,157,0.10)', 'var(--cyan-dim)'],
    green: ['var(--green)', 'rgba(39,122,87,0.10)', 'var(--green-dim)'],
    amber: ['var(--amber)', 'rgba(166,111,31,0.10)', 'var(--amber-dim)'],
  }[tone];
  return {
    minHeight: 17,
    padding: '2px 5px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${colors[2]}`,
    background: colors[1],
    color: colors[0],
    fontFamily: 'var(--font-mono)',
    fontSize: 8,
    fontWeight: 800,
    textTransform: 'uppercase',
  };
};

const statusBadgeStyle = (status: Officer['status']): React.CSSProperties => ({
  color: status === 'unavailable' ? 'var(--red)' : status === 'on_incident' || status === 'busy' ? 'var(--amber)' : status === 'on_escort' ? '#73558a' : 'var(--green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

const homeUnitStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 10.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const emptyTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const editPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
};

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};

const twoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 6,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--cyan)',
  border: '1px solid var(--cyan)',
  borderRadius: 'var(--radius-sm)',
  color: '#ffffff',
  padding: '5px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  padding: '5px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const dangerButtonStyle: React.CSSProperties = {
  minHeight: 28,
  background: 'rgba(185,67,77,0.08)',
  border: '1px solid var(--red-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  padding: '5px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const setupToggleStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 30,
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  fontWeight: 800,
};

const smallButtonStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
};

const minimumListStyle: React.CSSProperties = {
  maxHeight: 135,
  overflowY: 'auto',
  display: 'grid',
  gap: 5,
};

const minRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 58px',
  gap: 6,
  alignItems: 'center',
  fontSize: 11,
  color: 'var(--text-secondary)',
};

const startButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 30,
  background: 'var(--green)',
  border: '1px solid var(--green)',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
  padding: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const activeNoticeStyle: React.CSSProperties = {
  padding: 7,
  border: '1px solid var(--green-dim)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--green)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const smallMutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 10.5,
  lineHeight: 1.3,
};
