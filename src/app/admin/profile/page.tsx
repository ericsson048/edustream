import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { User, Mail, Camera, Save, Shield, MapPin, Globe, Briefcase, BookOpen, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { authService } from '../../../services/authService';

type TabId = 'personal' | 'security';

export default function AdminProfile() {
  const { user, updateMe } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setEmail(user.email || '');
    setTitle(user.title || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
    setAvatarUrl(user.avatar_url || '');
  }, [user]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMe({ full_name: fullName, email, title, bio, location, website, avatar_url: avatarUrl });
      showToast('Profile updated.', 'success');
    } catch {
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Both fields are required.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast('Password changed.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      showToast('Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your administrator account settings.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button onClick={() => setActiveTab('personal')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Personal Info</button>
              <button onClick={() => setActiveTab('security')} className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'security' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Security</button>
            </div>

            {activeTab === 'personal' && (
              <div className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-900 shadow-md">
                      <img src={avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors border-2 border-white dark:border-slate-900 cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { courseService } = await import('../../../services/courseService');
                          const url = await courseService.uploadImage(file);
                          setAvatarUrl(url);
                        } catch {
                          showToast('Failed to upload image.', 'error');
                        }
                      }} />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Profile Picture</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">JPG, GIF or PNG. Max size of 2MB.</p>
                    <button onClick={() => setAvatarUrl('')} className="text-sm font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">Remove picture</button>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSavePersonal}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Professional Title</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Admin" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York, USA" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                      <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bio</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-3 text-slate-400 dark:text-slate-500 w-5 h-5" />
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell us about yourself..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors resize-none" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-lg font-bold dark:text-white">Change Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password.</p>
                  </div>
                </div>

                <form className="space-y-6 max-w-md" onSubmit={handleChangePassword}>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Minimum 8 characters.</p>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={changingPassword} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                      {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
