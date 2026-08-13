import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Radio, Video, Plus, X, Loader2, Share2, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { liveService, type LiveSessionItem } from '../../services/liveService';
import { courseService } from '../../services/courseService';
import type { Enrollment } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import { LoadingState, EmptyState } from '../../components/states';

const statusStyles: Record<string, string> = {
  LIVE: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  ENDED: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  SCHEDULED: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

const statusLabels: Record<string, string> = {
  LIVE: 'Live Now',
  ENDED: 'Ended',
  SCHEDULED: 'Scheduled',
};

export default function StudentSchedule() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [duration, setDuration] = useState(60);
  const [isPublic, setIsPublic] = useState(true);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'ENDED'>('LIVE');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadSessions = () => {
    liveService
      .listLiveSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        showToast('Impossible de charger les sessions live.', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSessions();
    courseService
      .listEnrollments()
      .then(setEnrollments)
      .catch(() => {});
  }, [showToast]);

  const copyShareLink = async (session: LiveSessionItem) => {
    const url = `${window.location.origin}/live/${session.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Stream link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy the link.', 'error');
    }
  };

  const startStream = async (goLive: boolean) => {
    if (!title.trim()) {
      showToast('A title is required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await liveService.createLiveSession({
        title: title.trim(),
        course: course || null,
        scheduled_at: new Date().toISOString(),
        duration_minutes: duration,
        status: goLive ? 'LIVE' : 'SCHEDULED',
        is_public: isPublic,
      });
      setModalOpen(false);
      setTitle('');
      showToast(goLive ? 'You are now live!' : 'Stream scheduled.', 'success');
      navigate(`/live/${created.id}`);
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(message || 'Could not start the stream.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 dark:text-white">Live Sessions</h1>
              <p className="text-slate-500 dark:text-slate-400">Join scheduled sessions or start your own stream and share it with anyone.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Start a Stream
            </button>
          </div>

          {loading ? (
            <LoadingState rows={3} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No live sessions yet"
              description="Start your own stream to get going!"
            />
          ) : (
            <div className="rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">Range</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date('2026-07-27T22:41:00').toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('LIVE')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'LIVE' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    En cours ({sessions.filter(s => s.status === 'LIVE').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('ENDED')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'ENDED' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    Terminés ({sessions.filter(s => s.status === 'ENDED').length})
                  </button>
                </div>
              </div>

              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.filter(s => s.status === activeTab).map((session) => (
                    <tr key={session.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">{session.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{session.course_title || 'Public stream'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          {new Date(session.scheduled_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{session.duration_minutes} min</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.status === 'LIVE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          session.status === 'ENDED' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            session.status === 'LIVE' ? 'bg-red-500' :
                            session.status === 'ENDED' ? 'bg-slate-400 dark:bg-slate-500' :
                            'bg-blue-500'
                          }`} />
                          {statusLabels[session.status] || session.status}
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
                            onClick={() => copyShareLink(session)}
                            title="Copy stream link"
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Share
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold dark:text-white">Start a Stream</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My live stream"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Linked course <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None - public stream</option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.course}>
                      {enrollment.course_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDuration(minutes)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                        duration === minutes
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Public - anyone with the link can join
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => startStream(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  Schedule
                </button>
                <button
                  onClick={() => startStream(true)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                  Go Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
