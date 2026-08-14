import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep('code');
    } catch {
      setError(t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await authService.resetPasswordWithOtp(email, otp, password);
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('auth.resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setOtp('');
    setPassword('');
    setConfirm('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'code' ? <KeyRound className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.resetPassword')}</h2>
          <p className="text-slate-500 text-sm">
            {step === 'done'
              ? t('auth.yourPasswordResetSuccess')
              : step === 'code'
                ? t('auth.resetSent')
                : t('auth.resetPrompt')}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.emailLabel')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.sending') : t('auth.sendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.otpLabel')}</label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center text-lg font-bold"
                placeholder={t('auth.otpPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.passwordLabel')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('auth.newPasswordPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('auth.resetting') : t('auth.resetPassword')}
            </button>
            <button
              type="button"
              onClick={backToEmail}
              className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              {t('auth.tryAnotherEmail')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <Link
            to="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {t('auth.goToLogin')}
          </Link>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
