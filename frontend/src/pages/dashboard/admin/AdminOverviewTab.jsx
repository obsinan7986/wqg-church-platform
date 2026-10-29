import React from 'react';
import { Users, Coins, Radio, Image as ImageIcon, Activity } from 'lucide-react';
import { Card, StatCard } from '../../../components/ui';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER'];

const AdminOverviewTab = ({ overview, bannersCount = 0, mediaCount = 0 }) => {
  return (
    <div className="space-y-8">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={Users}
          label="Miseensota Waliigalaa"
          value={overview ? overview.totalUsers : 0}
          subtext={`${overview?.onlineUsers || 0} Online`}
          badge={
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping inline-block" />
          }
        />

        <StatCard
          icon={Coins}
          label="Galii Faayinaansii"
          value={
            overview?.financials?.totalAmount
              ? `${overview.financials.totalAmount.toLocaleString()} ETB`
              : '0 ETB'
          }
          goldValue
          subtext={`${overview?.financials?.totalCount || 0} Nagahee kaffaltii`}
        />

        <StatCard
          icon={Radio}
          label="Tajaajila Live"
          value={
            overview?.liveMeeting?.active ? (
              <span className="text-red-400 animate-pulse">🔴 LIVE AMMA</span>
            ) : (
              'Qophii Irra'
            )
          }
          subtext={`${overview?.liveMeeting?.total || 0} Sagantaalee Live`}
        />

        <StatCard
          icon={ImageIcon}
          label="Beeksisoota & Media"
          value={bannersCount + mediaCount}
          goldValue
          subtext={`${bannersCount} Banners • ${mediaCount} YouTube`}
        />
      </div>

      {/* Role Distribution Card */}
      <Card className="space-y-4 border border-slate-200">
        <h3 className="text-base font-black text-royal flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gold-500" />
          <span>Qoodama Gahee Hojii (Role Distribution)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
          {ROLES.map((role) => {
            const count =
              overview?.usersByRole?.find((r) => r._id === role)?.count || 0;
            return (
              <div
                key={role}
                className="p-4 rounded-xl bg-royal-tint border border-slate-200 text-center space-y-1"
              >
                <span className="text-[10px] uppercase font-bold text-royal block tracking-wider">
                  {role}
                </span>
                <span className="text-2xl font-black text-royal">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default AdminOverviewTab;
