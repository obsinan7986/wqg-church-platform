import React from 'react';
import { DataTable, Badge, Button, Avatar } from '../../../components/ui';

const AdminStaffTab = ({ staffList, loading, isSuperAdmin, onEditRole }) => {
  const staffColumns = [
    {
      key: 'fullName',
      header: 'Maqaa Tajaajilaa',
      render: (val, st) => (
        <div className="flex items-center space-x-3">
          <Avatar user={st} size="sm" />
          <div>
            <div className="font-bold text-white text-sm">{st.fullName}</div>
            <span className="text-[10px] text-slate-400">{st.address?.city || st.originChurch}</span>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Gahee Hojii (Role)',
      render: (val) => <Badge variant="gold">{val}</Badge>
    },
    {
      key: 'originChurch',
      header: 'Waldaa Irraa Dhufe',
      render: (val) => <span className="text-gold-400 font-medium">{val}</span>
    },
    {
      key: 'department',
      header: 'Kutaa Hojii',
      render: (val) => val || 'General Council'
    },
    {
      key: 'phone',
      header: 'Bilbila',
      render: (val, st) => st.address?.phone || 'N/A'
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'actions',
            header: 'Gocha',
            align: 'right',
            render: (_, st) => (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditRole(st)}
              >
                Gahee Jijjiiri
              </Button>
            )
          }
        ]
      : [])
  ];

  return (
    <DataTable
      title={`Akkaawuntiiwwan Tajaajiltootaa & Hooggansaa (${staffList.length})`}
      subtitle="Executive Staff Members"
      columns={staffColumns}
      data={staffList}
      loading={loading}
      emptyTitle="Tajaajiltoota hin argamne"
      emptyDescription="Tarree tajaajiltootaa keessa akkaawuntiin tokkollee hin jiru."
    />
  );
};

export default AdminStaffTab;
