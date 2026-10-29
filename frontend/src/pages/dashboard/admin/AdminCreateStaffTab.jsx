import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, Button, FormField } from '../../../components/ui';

const AdminCreateStaffTab = ({
  newStaff,
  setNewStaff,
  creatingStaff,
  onSubmit,
  onCancel
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card className="max-w-2xl mx-auto space-y-6 p-6 sm:p-10 shadow-md border border-slate-200">
      <div className="space-y-1 pb-4 border-b border-slate-200">
        <h3 className="text-lg font-black text-royal flex items-center space-x-2">
          <UserPlus className="w-5 h-5 text-gold-500" />
          <span>Akkaawuntii Tajaajilaa Haaraa Banuu (Create Staff Account)</span>
        </h3>
        <p className="text-xs text-slate-600">
          Gaheen kun Super Admin qofaan banama. Akkaawuntiiwwan ADMIN, COLLECTOR, HR, fi SECRETARY uumuu dandeessu.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="Maqaa Guutuu"
          required
          value={newStaff.fullName}
          onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
          placeholder="fkn. Tasfaayee Geetahuun"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Lakkoofsa Bilbilaa (Login ID)"
            required
            value={newStaff.phone}
            onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
            placeholder="+2519..."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Jecha Darbii (Password) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                placeholder="Iccitii cimaa fayyadamaa"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal text-xs transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            as="select"
            label="Gahee Hojii (Role)"
            required
            value={newStaff.role}
            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
            options={[
              { value: 'ADMIN', label: 'ADMIN (Itti Gaafatamaa Sirnaa)' },
              { value: 'COLLECTOR', label: 'COLLECTOR (Funaanaa Buusii)' },
              { value: 'HR', label: 'HR (Hoggansa Qabeenya Namaa)' },
              { value: 'SECRETARY', label: 'SECRETARY (Barreessaa & Galmee)' }
            ]}
          />

          <FormField
            label="Kutaa Hojii (Department)"
            value={newStaff.department}
            onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
            placeholder="fkn. Secretariat & Records"
          />
        </div>

        <FormField
          label="Waldaa Irraa Dhufe (Filannoo / Optional)"
          value={newStaff.originChurch}
          onChange={(e) => setNewStaff({ ...newStaff, originChurch: e.target.value })}
          placeholder="fkn. Debre Tsiyoon Qulqulluu Giyoorgisii"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Magaalaa"
            required
            value={newStaff.city}
            onChange={(e) => setNewStaff({ ...newStaff, city: e.target.value })}
          />

          <FormField
            label="Ganda"
            required
            value={newStaff.kebele}
            onChange={(e) => setNewStaff({ ...newStaff, kebele: e.target.value })}
          />
        </div>

        <div className="pt-4 flex items-center justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Dhiisi
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={creatingStaff}
          >
            Uumi & Galmeessi
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AdminCreateStaffTab;
