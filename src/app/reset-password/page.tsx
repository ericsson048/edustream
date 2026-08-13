import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';

export default function ResetPassword() {
  const { t } = useTranslation();
  const { userId, token } = useParams<{ userId: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!userId || !token) {
      setError(t('auth.invalidResetLink'));
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(userId, token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('auth.resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.chooseNewPassword')}</h2>
          <p className="text-slate-500 text-sm">
            {success
              ? t('auth.yourPasswordResetSuccess')
              : t('auth.enterNewPassword')}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
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
          </form>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {t('auth.goToLogin')}
          </button>
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
