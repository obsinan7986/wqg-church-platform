import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Card, DataTable, Badge, FormField } from '../../../components/ui';
import { useDateSettings } from '../../../context/DateSettingsContext';

const AdminAuditTab = ({
  auditLogs = [],
  auditActions = [],
  auditSearch = '',
  onSearchChange,
  onSearchSubmit,
  actionFilter = 'ALL',
  onFilterChange,
  loadingAudit = false
}) => {
  const { formatDual, formatRelative, formatDateTime } = useDateSettings();

  const auditColumns = [
    {
      key: 'timestamp',
      header: 'Yeroo (Timestamp)',
      render: (val) => (
        <span className="text-slate-600 whitespace-nowrap text-xs font-mono" title={formatDateTime(val, { showDeviceNote: true })}>
          {formatDual(val, { includeTime: true })}
          <span className="text-slate-400 text-[10px] block font-sans">
            {formatRelative(val)}
          </span>
        </span>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (val) => (
        <Badge
          variant={
            val.includes('DELETE')
              ? 'danger'
              : val.includes('CREATE') || val.includes('ADD')
              ? 'gold'
              : 'muted'
          }
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'userName',
      header: 'Actor (User)',
      render: (val) => <span className="font-bold text-slate-900">{val}</span>
    },
    {
      key: 'userRole',
      header: 'Gahee',
      render: (val) => <span className="text-royal font-bold">{val}</span>
    },
    {
      key: 'details',
      header: 'Ibsa (Details)',
      className: 'max-w-md',
      render: (val) => <span className="text-slate-700 font-sans">{val}</span>
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (val) => <span className="text-slate-500 font-mono text-xs">{val}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 sm:p-6 shadow-sm border border-slate-200">
        <form onSubmit={onSearchSubmit} className="relative w-full md:w-80">
          <FormField
            icon={Search}
            value={auditSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Maqaa, Action, IP address..."
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gold-500 flex-shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
          >
            <option value="ALL">Action Hundumaa (All)</option>
            {auditActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <DataTable
        title={`Audit Logs History (${auditLogs.length})`}
        subtitle="Strictly Super Admin View"
        columns={auditColumns}
        data={auditLogs}
        loading={loadingAudit}
        emptyTitle="Audit log tokkollee hin argamne"
        emptyDescription="Galmeen audit log barbaaddan hin jiru."
      />
    </div>
  );
};

export default AdminAuditTab;
