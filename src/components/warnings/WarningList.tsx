import React from 'react';
import { Warning, WarningType } from '../../models';

interface Props {
  warnings: Warning[];
}

const warningGroups: Array<{ title: string; types: WarningType[]; color: string }> = [
  { title: 'Building staffing', types: ['building_below_minimum'], color: 'var(--amber)' },
  { title: 'Incident resources', types: ['incident_unassigned', 'incident_understaffed'], color: 'var(--red)' },
  { title: 'Missing permissions', types: ['missing_escort_permission', 'missing_taser_permission'], color: 'var(--amber)' },
  { title: 'Escort buses', types: ['bus_understaffed'], color: '#ff99cc' },
  { title: 'Assignment conflicts', types: ['officer_already_assigned'], color: 'var(--red)' },
];

export const WarningList: React.FC<Props> = ({ warnings }) => {
  if (warnings.length === 0) {
    return <div style={okStyle}>All staffing and incident requirements are currently met</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={summaryStyle}>{warnings.length} active warning{warnings.length === 1 ? '' : 's'}</div>
      {warningGroups.map((group) => {
        const groupWarnings = warnings.filter((warning) => group.types.includes(warning.type));
        if (groupWarnings.length === 0) return null;

        return (
          <section key={group.title} style={groupStyle(group.color)}>
            <div style={{ ...groupTitleStyle, color: group.color }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {groupWarnings.map((warning) => (
                <div key={warning.id} style={warningStyle}>
                  <span style={{ color: group.color, marginRight: 6 }}>!</span>
                  {warning.message}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const okStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(0,255,136,0.04)',
  border: '1px solid rgba(0,255,136,0.15)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--green)',
  letterSpacing: 0.5,
};

const summaryStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'rgba(255,51,85,0.08)',
  border: '1px solid rgba(255,51,85,0.35)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--red)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
};

const groupStyle = (color: string): React.CSSProperties => ({
  border: `1px solid ${color}55`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 'var(--radius-sm)',
  padding: '7px 8px',
  background: 'var(--bg-card)',
});

const groupTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 5,
};

const warningStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-primary)',
  lineHeight: 1.4,
};
