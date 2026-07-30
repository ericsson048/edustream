import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { Calendar as CalendarIcon, Plus, Save, Video, X, Hourglass } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import { billingService } from '../../../services/billingService';
import { liveService, type LiveSessionItem } from '../../../services/liveService';
import type { Course } from '../../../types/lms';
import type { UserSubscriptionInfo } from '../../../services/billingService';

type SessionForm = {
  course: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  requires_permission: boolean;
};

const emptyForm: SessionForm = {
  course: '',
  title: '',
  scheduled_at: '',
  duration_minutes: 60,
  requires_permission: false,
};

function toDateTimeInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

export default function InstructorSchedule() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscriptionInfo | null>(null);

  const refresh = async () => {
    if (!user?.id) return;
    const [courseList, sessionList, subResult] = await Promise.all([
      courseService.listCourses({ instructor: user.id }),
      liveService.listLiveSessions(),
      billingService.getMySubscription().catch(() => null),
    ]);
    setCourses(courseList);
    setSessions(sessionList);
    setSubscription(subResult);
    setForm((current) => ({
      ...current,
      course: current.course || courseList[0]?.id || '',
    }));
  };

  useEffect(() => {
    refresh().catch(() => showToast('Impossible de charger les sessions live.', 'error'));
  }, [showToast, user?.id]);

  const orderedSessions = useMemo(
    () => [...sessions].sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime()),
    [sessions],
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, course: courses[0]?.id || '' });
    setIsModalOpen(true);
  };

  const openEditModal = (session: LiveSessionItem) => {
    setEditingId(session.id);
    setForm({
      course: session.course,
      title: session.title,
      scheduled_at: toDateTimeInput(session.scheduled_at),
      duration_minutes: session.duration_minutes,
      requires_permission: session.requires_permission || false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, course: courses[0]?.id || '' });
  };

  const submit = async () => {
    if (!form.course || !form.title.trim() || !form.scheduled_at) {
      showToast('Course, title and schedule are required.', 'error');
      return;
    }

    try {
      if (editingId) {
        await liveService.updateLiveSession(editingId, {
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_minutes: form.duration_minutes,
          requires_permission: form.requires_permission,
        });
        showToast('Live session updated.', 'success');
      } else {
        await liveService.createLiveSession({
          course: form.course,
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_minutes: form.duration_minutes,
          requires_permission: form.requires_permission,
        });
        showToast('Live session scheduled.', 'success');
      }
      closeModal();
      await refresh();
    } catch {
      showToast('Impossible de sauvegarder la session live.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Schedule & Live Sessions</h1>
              <p className="text-slate-500 mt-1">Create, update and launch your live teaching sessions from real backend data.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>

          {orderedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Video size={22} className="text-blue-500" />
              </div>
              <p className="text-slate-700 font-medium">No live sessions yet</p>
              <p className="text-slate-400 text-sm mt-1 mb-5">Schedule your first session to get started.</p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm font-medium"
              >
                <Plus size={16} /> New Session
              </button>
            </div>
          ) : (
            <div className=" rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {subscription && (
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-sm text-slate-600">
                  <Hourglass className="w-4 h-4 text-blue-500" />
                  <span>Streaming: <strong>{subscription.stream_minutes_remaining !== null ? `${subscription.stream_minutes_remaining} min` : 'Unlimited'}</strong> left this month</span>
                </div>
              )}
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSessions.map((session) => (
                    <tr key={session.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{session.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{session.course_title || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          {new Date(session.scheduled_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{session.duration_minutes} min</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.status === 'LIVE' ? 'bg-red-100 text-red-700' :
                          session.status === 'ENDED' ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            session.status === 'LIVE' ? 'bg-red-500' :
                            session.status === 'ENDED' ? 'bg-slate-400' :
                            'bg-blue-500'
                          }`} />
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(session.status === 'LIVE' || session.status === 'SCHEDULED') && (
                            <Link to={`/live/${session.id}`} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                              Enter Room
                            </Link>
                          )}
                          <button
                            onClick={() => openEditModal(session)}
                            className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  {editingId ? <Save className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{editingId ? 'Edit Session' : 'Schedule New Session'}</h2>
                  <p className="text-sm text-slate-500">Connect the session to one of your courses.</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="text-sm font-semibold text-slate-700">Course</label>
            <select
              value={form.course}
              onChange={(e) => setForm((current) => ({ ...current, course: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Session title"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />

            <label className="text-sm font-semibold text-slate-700">Schedule</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((current) => ({ ...current, scheduled_at: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />

            <label className="text-sm font-semibold text-slate-700">Duration (minutes)</label>
            <input
              type="number"
              min="15"
              step="15"
              value={form.duration_minutes}
              onChange={(e) => setForm((current) => ({ ...current, duration_minutes: Number(e.target.value) || 60 }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Require permission to enter</p>
                <p className="text-xs text-slate-500">Students must be admitted by the host</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.requires_permission}
                  onChange={(e) => setForm((current) => ({ ...current, requires_permission: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>

            {subscription && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                <span>Streaming minutes remaining this month: <strong>{subscription.stream_minutes_remaining !== null ? `${subscription.stream_minutes_remaining}` : 'Unlimited'}</strong></span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={submit} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                {editingId ? 'Save Session' : 'Schedule Session'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}