import { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { Save, Globe, Settings2, Scale, Share2 } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import type { PlatformSetting } from '../../../services/adminService';

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'platform', label: 'Platform', icon: Settings2 },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'social', label: 'Social', icon: Share2 },
] as const;

type TabId = typeof TABS[number]['id'];

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'number' | 'boolean' | 'select';
  tab: TabId;
  options?: { value: string; label: string }[];
}

const FIELDS: FieldDef[] = [
  { key: 'platform_name', label: 'Platform Name', type: 'text', tab: 'general' },
  { key: 'support_email', label: 'Support Email', type: 'email', tab: 'general' },
  { key: 'default_language', label: 'Default Language', type: 'select', tab: 'general', options: [{ value: 'en', label: 'English' }, { value: 'fr', label: 'French' }, { value: 'es', label: 'Spanish' }, { value: 'de', label: 'German' }, { value: 'ar', label: 'Arabic' }] },
  { key: 'timezone', label: 'Timezone', type: 'text', tab: 'general' },
  { key: 'allow_public_registration', label: 'Allow Public Registration', type: 'boolean', tab: 'general' },
  { key: 'email_verification_required', label: 'Email Verification Required', type: 'boolean', tab: 'general' },

  { key: 'platform_fee_percentage', label: 'Platform Fee (%)', type: 'number', tab: 'platform' },
  { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean', tab: 'platform' },
  { key: 'max_upload_size_mb', label: 'Max Upload Size (MB)', type: 'number', tab: 'platform' },
  { key: 'free_trial_days', label: 'Free Trial Days', type: 'number', tab: 'platform' },
  { key: 'max_ai_prompts_per_day', label: 'Max AI Prompts / Day (Free Tier)', type: 'number', tab: 'platform' },
  { key: 'min_payout_threshold', label: 'Min Payout Threshold ($)', type: 'number', tab: 'platform' },
  { key: 'instructor_application_required', label: 'Instructor Application Required', type: 'boolean', tab: 'platform' },

  { key: 'terms_url', label: 'Terms of Service URL', type: 'url', tab: 'legal' },
  { key: 'privacy_url', label: 'Privacy Policy URL', type: 'url', tab: 'legal' },
  { key: 'cookie_consent_enabled', label: 'Cookie Consent Enabled', type: 'boolean', tab: 'legal' },

  { key: 'facebook_url', label: 'Facebook URL', type: 'url', tab: 'social' },
  { key: 'twitter_url', label: 'Twitter / X URL', type: 'url', tab: 'social' },
  { key: 'instagram_url', label: 'Instagram URL', type: 'url', tab: 'social' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url', tab: 'social' },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('general');

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

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  const visibleFields = FIELDS.filter((f) => f.tab === activeTab);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
        <AdminSidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="grid place-items-center h-64 text-slate-500 dark:text-slate-400">Loading settings...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Platform Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Configure global application preferences.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {visibleFields.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">No settings in this section.</p>
              )}

              {visibleFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                  {field.type === 'boolean' ? (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.key}
                          checked={settings[field.key] !== 'false'}
                          onChange={() => update(field.key, 'true')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.key}
                          checked={settings[field.key] === 'false'}
                          onChange={() => update(field.key, 'false')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">No</span>
                      </label>
                    </div>
                  ) : field.type === 'select' ? (
                    <select
                      value={settings[field.key] || ''}
                      onChange={(e) => update(field.key, e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Not set</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={settings[field.key] || ''}
                      onChange={(e) => update(field.key, e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {success && (
                  <span className={`text-sm font-medium ${success.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
