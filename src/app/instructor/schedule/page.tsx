import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { Calendar as CalendarIcon, Clock, Plus, Save, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import { liveService, type LiveSessionItem } from '../../../services/liveService';
import type { Course } from '../../../types/lms';

type SessionForm = {
  course: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: LiveSessionItem['status'];
};

const emptyForm: SessionForm = {
  course: '',
  title: '',
  scheduled_at: '',
  duration_minutes: 60,
  status: 'SCHEDULED',
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

  const refresh = async () => {
    if (!user?.id) return;
    const [courseList, sessionList] = await Promise.all([
      courseService.listCourses({ instructor: user.id }),
      liveService.listLiveSessions(),
    ]);
    setCourses(courseList);
    setSessions(sessionList);
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
      status: session.status,
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
          status: form.status,
        });
        showToast('Live session updated.', 'success');
      } else {
        await liveService.createLiveSession({
          course: form.course,
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_minutes: form.duration_minutes,
          status: form.status,
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

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold">Your Sessions</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {orderedSessions.length === 0 && (
                <div className="p-6 text-sm text-slate-500">No live sessions yet.</div>
              )}

              {orderedSessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${session.status === 'LIVE' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-slate-900">{session.title}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${session.status === 'LIVE' ? 'bg-red-100 text-red-700' : session.status === 'ENDED' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{session.course_title || 'Course'}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{new Date(session.scheduled_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">
                            {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ÔÇó {session.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:ml-auto">
                    {session.status === 'LIVE' && (
                      <Link to={`/live/${session.id}`} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">
                        Enter Room
                      </Link>
                    )}
                    <button
                      onClick={() => openEditModal(session)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
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

            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Session title"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />

            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((current) => ({ ...current, scheduled_at: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={(e) => setForm((current) => ({ ...current, duration_minutes: Number(e.target.value) || 60 }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as LiveSessionItem['status'] }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="LIVE">Live</option>
                <option value="ENDED">Ended</option>
              </select>
            </div>

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