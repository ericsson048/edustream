import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/auth';
import { getDefaultRoute } from '../../components/guards/ProtectedRoute';
import { useToast } from '../../contexts/ToastContext';

export default function Register() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<UserRole>(() => (searchParams.get('role') === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await register({
        email,
        full_name: `${firstName} ${lastName}`.trim(),
        role,
        password,
      });
      showToast(t('auth.registerSuccess'), 'success');
      navigate(getDefaultRoute(user.role), { replace: true });
    } catch {
      showToast(t('auth.registerFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1471&q=80"
          alt={t('auth.studentsLearningAlt')}
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />

        <div className="relative z-20 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">{t('auth.edustreamLms')}</h1>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">{t('auth.createAccountCardTitle')}</h2>
          <p className="text-lg text-blue-100 mb-8">{t('auth.createAccountCardDesc')}</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{t('auth.createAccount2')}</h2>
            <p className="text-slate-500">{t('auth.signUpDesc')}</p>
          </div>

          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.firstName')}</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('auth.firstNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.lastName')}</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('auth.lastNamePlaceholder')} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.emailLabel')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('auth.emailPlaceholder')} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.passwordLabel')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-3 pr-10 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.iWantTo')}</label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input type="radio" name="role" value="STUDENT" checked={role === 'STUDENT'} onChange={() => setRole('STUDENT')} className="text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700">{t('auth.learn')}</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input type="radio" name="role" value="INSTRUCTOR" checked={role === 'INSTRUCTOR'} onChange={() => setRole('INSTRUCTOR')} className="text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700">{t('auth.teach')}</span>
                </label>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70">
              {isSubmitting ? t('auth.creating') : t('auth.createAccountBtn')}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            {t('auth.hasAccount')} <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500">{t('auth.signInLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

