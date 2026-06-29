import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Save } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { PlatformSetting } from '../../services/adminService';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    adminService.getPlatformSettings()
      .then((list) => {
        const map: Record<string, string> = {};
        list.forEach((s) => { map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await adminService.bulkUpdatePlatformSettings(settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setSuccess('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <AdminSidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="grid place-items-center h-64 text-slate-500">Loading settings...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
            <p className="text-slate-500 mt-1">Configure global application preferences.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button className="px-6 py-4 text-sm font-bold border-b-2 border-blue-600 text-blue-600">General</button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Platform Name</label>
                <input
                  type="text"
                  value={settings.platform_name || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, platform_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, support_email: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Allow Public Registration</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="registration"
                      checked={settings.allow_public_registration !== 'false'}
                      onChange={() => setSettings((s) => ({ ...s, allow_public_registration: 'true' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="registration"
                      checked={settings.allow_public_registration === 'false'}
                      onChange={() => setSettings((s) => ({ ...s, allow_public_registration: 'false' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">No (Invite Only)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {success && (
                  <span className={`text-sm font-medium ${success.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {success}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 ml-auto"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
