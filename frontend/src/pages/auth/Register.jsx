import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  Church,
  User,
  Phone,
  MapPin,
  Building,
  Lock,
  Globe,
  UserPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Button,
  Toast,
  FormField
} from '../../components/ui';

const branchSuggestions = [
  'Damee Hora (Hora)',
  'Damee Tulluu Kormaa (Tulluu Kormaa)',
  'Damee Andoodee (Andoodee)',
  'Damee Kimooyyee (Kimooyyee)',
  'Damee Jimmaa (Jimma)',
  'Damee Amarroo (Amarroo)',
  'Debre Tsiyoon Qulqulluu Giyoorgisii',
  'Waldaa Amantoota Qulqulluu Giyoorgisii'
];

const Register = () => {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    originChurch: '',
    city: '',
    kebele: '',
    phone: '',
    password: '',
    confirmPassword: '',
    languagePref: i18n.language || 'om'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    if (!formData.city.trim() || !formData.kebele.trim() || !formData.phone.trim()) {
      setErrorMsg('Complete address (City, Kebele, Phone Number) is required.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      fullName: formData.fullName.trim(),
      originChurch: (formData.originChurch || '').trim(),
      address: {
        city: formData.city.trim(),
        kebele: formData.kebele.trim(),
        phone: formData.phone.trim()
      },
      password: formData.password,
      languagePref: formData.languagePref
    };

    const result = await register(payload);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-slate-900">
      <div className="max-w-xl w-full space-y-6">
        {/* Header with Church Logo */}
        <div className="text-center space-y-2">
          <div className="inline-block relative">
            <img
              src="/logo-walda.jpg"
              alt="Logo"
              className="w-16 h-16 rounded-full border-2 border-gold-500 shadow-md object-cover mx-auto"
            />
          </div>
          <h2 className="text-2xl font-black text-royal tracking-tight">
            {t('auth.registerTitle')}
          </h2>
          <p className="text-xs text-slate-500">
            {t('auth.registerSubtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <Toast
            type="error"
            message={errorMsg}
            onClose={() => setErrorMsg('')}
          />
        )}

        {/* Register Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <FormField
              label={t('auth.fullName')}
              icon={User}
              required
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={t('auth.fullNamePlaceholder')}
            />

            {/* Origin Church */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t('auth.originChurch')} <span className="text-slate-400 font-normal text-[11px]">(Filannoo / Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Church className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="originChurch"
                  list="branch-list"
                  value={formData.originChurch}
                  onChange={handleChange}
                  placeholder={t('auth.originChurchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal text-xs transition-all"
                />
                <datalist id="branch-list">
                  {branchSuggestions.map((b, i) => (
                    <option key={i} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Address Row: City & Kebele */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label={t('auth.city')}
                icon={Building}
                required
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder={t('auth.cityPlaceholder')}
              />

              <FormField
                label={t('auth.kebele')}
                icon={MapPin}
                required
                type="text"
                name="kebele"
                value={formData.kebele}
                onChange={handleChange}
                placeholder={t('auth.kebelePlaceholder')}
              />
            </div>

            {/* Phone Number */}
            <FormField
              label={t('auth.phone')}
              icon={Phone}
              required
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('auth.phonePlaceholder')}
            />

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('auth.password')} <span className="text-gold-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 chars"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal text-xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('auth.confirmPassword')} <span className="text-gold-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal text-xs transition-all"
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

            {/* Language Preference */}
            <FormField
              as="select"
              label={t('auth.languagePref')}
              icon={Globe}
              name="languagePref"
              value={formData.languagePref}
              onChange={handleChange}
            >
              <option value="om">Afaan Oromoo (Oromo)</option>
              <option value="am">አማርኛ (Amharic)</option>
              <option value="en">English</option>
            </FormField>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>{isSubmitting ? 'Galmeessaa jira...' : t('auth.registerBtn')}</span>
            </Button>
          </form>

          {/* Already have account */}
          <div className="mt-5 text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
            <span>{t('auth.haveAccount')} </span>
            <Link to="/login" className="text-royal font-bold hover:underline ml-1">
              {t('auth.loginLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;