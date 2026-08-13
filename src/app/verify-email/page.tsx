import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { LoadingState, SuccessState, ErrorState } from '../../components/states';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const { userId, token } = useParams<{ userId: string; token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');

  const verify = async () => {
    if (!userId || !token) {
      setState('error');
      setError(t('auth.invalidVerificationLink'));
      return;
    }
    try {
      await authService.verifyEmail(userId, token);
      setState('done');
    } catch (err: any) {
      setState('error');
      setError(err?.response?.data?.detail || t('auth.emailVerificationExpired'));
    }
  };

  React.useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.emailVerification')}</h2>
        </div>

        {state === 'loading' && <LoadingState mode="spinner" label={t('auth.verifyingEmail')} className="py-8" />}

        {state === 'done' && (
          <SuccessState
            title={t('auth.emailVerified')}
            description={t('auth.emailVerifiedDesc')}
            action={
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {t('auth.goToLogin')}
              </button>
            }
          />
        )}

        {state === 'error' && (
          <ErrorState
            title={t('auth.emailVerificationFailed')}
            description={error}
            action={
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                {t('auth.backToLogin')}
              </button>
            }
          />
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
