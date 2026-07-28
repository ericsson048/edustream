import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { User, Mail, Camera, Save, Lock, Bell, Eye, EyeOff, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../services/apiClient';

type ProfileTab = 'personal' | 'security' | 'notifications';

export default function Profile() {
  const { user, updateMe, changePassword, refreshMe } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<ProfileTab>('personal');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setEmail(user.email || '');
  }, [user]);

  const firstName = fullName.split(' ').slice(0, -1).join(' ') || fullName;
  const lastName = fullName.split(' ').slice(-1).join(' ');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMe({ full_name: `${firstName} ${lastName}`.trim(), email });
      showToast('Profil mis a jour.', 'success');
    } catch {
      showToast('Erreur de mise a jour.', 'error');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast('L\'image doit faire moins de 2 Mo.', 'error');
      return;
    }
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<{ url: string }>('/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await updateMe({ avatar_url: data.url });
      await refreshMe();
      showToast('Avatar mis a jour.', 'success');
    } catch {
      showToast('Erreur lors de l\'upload.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Le mot de passe doit faire au moins 8 caracteres.', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Mot de passe modifie.', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erreur lors du changement de mot de passe.';
      showToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifNewCourse, setNotifNewCourse] = useState(true);
  const [notifAssignments, setNotifAssignments] = useState(true);
  const [notifGrades, setNotifGrades] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);

  const handleSaveNotifications = () => {
    showToast('Preferences de notification sauvegardees.', 'success');
  };

  const tabs: { key: ProfileTab; label: string; icon: typeof Shield }[] = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile Settings</h1>
            <p className="text-slate-500 mt-1">Manage your personal information and preferences.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {tab === 'personal' && (
                <>
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
                        <img src={user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors border-2 border-white disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Profile Picture</h3>
                      <p className="text-sm text-slate-500 mb-2">JPG, GIF or PNG. Max size of 2MB.</p>
                      <button
                        onClick={() => {
                          if (user?.avatar_url) {
                            updateMe({ avatar_url: '' }).then(() => refreshMe());
                          }
                        }}
                        className="text-sm font-bold text-red-500 hover:text-red-600"
                      >
                        Remove picture
                      </button>
                    </div>
                  </div>

                  <form className="space-y-6" onSubmit={handleSaveProfile}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input type="text" value={firstName} onChange={(e) => setFullName(`${e.target.value} ${lastName}`.trim())} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input type="text" value={lastName} onChange={(e) => setFullName(`${firstName} ${e.target.value}`.trim())} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                </>
              )}

              {tab === 'security' && (
                <form className="space-y-6 max-w-lg" onSubmit={handleChangePassword}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Lock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                      <p className="text-sm text-slate-500">Update your password regularly to keep your account secure.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button type="submit" disabled={passwordLoading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                      <Lock className="w-4 h-4" />
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              {tab === 'notifications' && (
                <div className="space-y-6 max-w-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Notification Preferences</h3>
                      <p className="text-sm text-slate-500">Choose how and when you want to be notified.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Channels</h4>
                    {[
                      { label: 'Email notifications', value: notifEmail, setter: setNotifEmail },
                      { label: 'Push notifications', value: notifPush, setter: setNotifPush },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-700">{label}</span>
                        <button
                          type="button"
                          onClick={() => setter(!value)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
                        </button>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Events</h4>
                    {[
                      { label: 'New courses published', value: notifNewCourse, setter: setNotifNewCourse },
                      { label: 'Assignment updates', value: notifAssignments, setter: setNotifAssignments },
                      { label: 'Grade posted', value: notifGrades, setter: setNotifGrades },
                      { label: 'New messages', value: notifMessages, setter: setNotifMessages },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-700">{label}</span>
                        <button
                          type="button"
                          onClick={() => setter(!value)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
                        </button>
                      </label>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button onClick={handleSaveNotifications} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
