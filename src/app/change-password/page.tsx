import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRoute } from '../../components/guards/ProtectedRoute';

export default function ChangeTemporaryPassword() {
  const { user, changePassword, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmation) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      await refreshMe();
      if (user) navigate(getDefaultRoute(user.role), { replace: true });
    } catch (cause) {
      const responseError = cause as { response?: { data?: { detail?: string } } };
      setError(responseError.response?.data?.detail || 'Impossible de modifier le mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 grid place-items-center mb-5">
          <LockKeyhole className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Changez votre mot de passe</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
          Pour sécuriser votre compte, remplacez le mot de passe temporaire avant de continuer.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Mot de passe temporaire
            <input required autoComplete="current-password" type="password" value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nouveau mot de passe
            <input required minLength={8} autoComplete="new-password" type="password" value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirmer le nouveau mot de passe
            <input required minLength={8} autoComplete="new-password" type="password" value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </section>
    </main>
  );
}