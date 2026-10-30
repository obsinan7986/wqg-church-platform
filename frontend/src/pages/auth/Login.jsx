import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  Church
} from 'lucide-react';
import {
  Card,
  Toast,
  FormField
} from '../../components/ui';

const Login = () => {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from || '/dashboard';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // If the user is already logged in, redirect to intended target or /dashboard
  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim() || !password) {
      setErrorMsg('Lakkoofsa bilbilaa fi jecha icciitii galchaa / Please enter phone & password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(phone.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(redirectTarget, { replace: true });
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-slate-900">
      <div className="max-w-md w-full space-y-6">
        {/* Error Alert */}
        {errorMsg && (
          <Toast
            type="error"
            message={errorMsg}
            onClose={() => setErrorMsg('')}
          />
        )}

        {/* Main Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xl space-y-6">
          <div className="text-center mb-6 space-y-3">
            {/* 96px Round Logo with Gold Border */}
            {!logoFailed ? (
              <img
                src="/logo-walda.jpg"
                alt="Waldaa Qulqulluu Giyoorgisii Logo"
                onError={() => setLogoFailed(true)}
                className="w-24 h-24 rounded-full border-2 border-gold-500 object-cover shadow-md mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-gold-500 bg-royal-tint flex items-center justify-center mx-auto shadow-md">
                <Church className="w-12 h-12 text-gold-600" />
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-xl font-black text-royal tracking-tight">
                Seensa Akkaawuntii (Login)
              </h2>
              <p className="text-xs text-slate-500 leading-snug">
                Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Phone Number Input */}
            <div data-tour="login-phone">
              <FormField
                label="Lakkoofsa Bilbilaa (Phone Number)"
                icon={Phone}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Fkn: +251911000001"
                required
              />
            </div>

            {/* Password Input */}
            <div data-tour="login-password" className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Jecha Icciitii (Password) <span className="text-gold-600 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Jecha icciitii keessan galchaa"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal text-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Jecha icciitii dhoksi (Hide password)' : 'Jecha icciitii agarsiisi (Show password)'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              data-tour="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-royal hover:bg-royal-dark active:scale-[0.98] text-white font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed select-none text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Seenaa jira... (Logging in...)</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Seeni (Login)</span>
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
            <span>Akkaawuntii hin qabdanii? </span>
            <Link to="/register" className="text-royal font-bold hover:underline ml-1">
              Amma Galmaa'aa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;