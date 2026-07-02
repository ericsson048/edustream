import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Radio, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { liveService, type LiveSessionItem } from '../../services/liveService';
import { useToast } from '../../contexts/ToastContext';

export default function StudentSchedule() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    liveService
      .listLiveSessions()
      .then(setSessions)
      .catch(() => showToast('Impossible de charger les sessions live.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Live Sessions</h1>
          <p className="text-slate-500 mb-6">Sessions en direct disponibles pour vos cours inscrits.</p>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{session.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(session.scheduled_at).toLocaleString()} - {session.duration_minutes} min - {session.course_title || 'Course'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                      session.status === 'LIVE' ? 'bg-red-50 text-red-600' : session.status === 'ENDED' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    {session.status}
                  </span>
                  <Link to={`/live/${session.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
                    {session.status === 'LIVE' ? 'Join now' : 'Open'}
                  </Link>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                No live sessions are scheduled for your current enrollments yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

