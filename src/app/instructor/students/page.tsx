import { useEffect, useState } from 'react';
import { Plus, Users, BookOpen, X, Save, Search, UserCheck, Trash2 } from 'lucide-react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';
import { institutionService, type CourseAccessStudent } from '../../../services/institutionService';
import { courseService } from '../../../services/courseService';
import type { AuthUser } from '../../../types/auth';
import type { Course } from '../../../types/lms';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type Tab = 'students' | 'access';

export default function InstructorStudentsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('students');

  // Students
  const [students, setStudents] = useState<AuthUser[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [queryStudents, setQueryStudents] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', full_name: '' });
  const [creating, setCreating] = useState(false);

  // Courses & access
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [accessStudents, setAccessStudents] = useState<CourseAccessStudent[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [granting, setGranting] = useState(false);

  const loadStudents = () => {
    setLoadingStudents(true);
    institutionService.listMyStudents()
      .then(setStudents)
      .catch(() => showToast('Erreur de chargement des étudiants', 'error'))
      .finally(() => setLoadingStudents(false));
  };

  const loadCourses = () => {
    courseService.listCourses()
      .then(cs => { setCourses(cs); if (cs.length > 0) setSelectedCourse(cs[0].id); })
      .catch(() => {});
  };

  useEffect(() => {
    loadStudents();
    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoadingAccess(true);
    institutionService.listCourseAccessStudents(selectedCourse)
      .then(setAccessStudents)
      .catch(() => {})
      .finally(() => setLoadingAccess(false));
  }, [selectedCourse]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await institutionService.createStudent(createForm);
      showToast('Étudiant créé — mot de passe : password123', 'success');
      setShowCreateModal(false);
      setCreateForm({ email: '', full_name: '' });
      loadStudents();
    } catch (err: any) {
      showToast(err?.response?.data?.email?.[0] || 'Erreur lors de la création.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedCourse || selectedStudentIds.length === 0) return;
    setGranting(true);
    try {
      const result = await institutionService.grantCourseAccess(selectedCourse, selectedStudentIds);
      showToast(`Accès accordé à ${result.granted.length} étudiant(s).`, 'success');
      setShowGrantModal(false);
      setSelectedStudentIds([]);
      institutionService.listCourseAccessStudents(selectedCourse).then(setAccessStudents);
    } catch {
      showToast('Erreur lors de l\'attribution d\'accès.', 'error');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    if (!selectedCourse) return;
    if (!window.confirm('Révoquer l\'accès de cet étudiant ?')) return;
    try {
      await institutionService.revokeCourseAccess(selectedCourse, studentId);
      showToast('Accès révoqué.', 'success');
      setAccessStudents(prev => prev.filter(a => a.student_id !== studentId));
    } catch {
      showToast('Erreur lors de la révocation.', 'error');
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.full_name} ${s.email}`.toLowerCase().includes(queryStudents.toLowerCase())
  );

  // Students not yet having access to selected course
  const accessStudentIds = new Set(accessStudents.map(a => a.student_id));
  const studentsWithoutAccess = students.filter(s => !accessStudentIds.has(s.id));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Gestion des étudiants</h1>
            <p className="text-slate-500 mt-1">Créez des étudiants et gérez leur accès à vos cours.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-fit">
            {([
              { key: 'students', label: 'Mes étudiants', icon: Users },
              { key: 'access', label: 'Accès aux cours', icon: BookOpen },
            ] as { key: Tab; label: string; icon: typeof Users }[]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  tab === key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {/* ── Tab: Students ── */}
          {tab === 'students' && (
            <>
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input value={queryStudents} onChange={e => setQueryStudents(e.target.value)} placeholder="Rechercher un étudiant..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Créer un étudiant
                </button>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Aucun étudiant créé</p>
                  <p className="text-sm mt-1">Créez des étudiants pour leur donner accès à vos cours.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Créé le</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredStudents.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                                {s.full_name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{s.full_name}</p>
                                <p className="text-xs text-slate-500">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {s.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {(s as any).must_change_password
                              ? <span className="text-xs text-amber-600 font-semibold">À changer</span>
                              : <span className="text-xs text-emerald-600 font-semibold">Changé ✓</span>
                            }
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {s.date_joined ? new Date(s.date_joined).toLocaleDateString('fr-FR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tab: Course Access ── */}
          {tab === 'access' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {courses.length === 0
                    ? <option value="">Aucun cours disponible</option>
                    : courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                  }
                </select>
                <button onClick={() => setShowGrantModal(true)} disabled={!selectedCourse || students.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40 whitespace-nowrap">
                  <UserCheck className="w-4 h-4" /> Attribuer l'accès
                </button>
              </div>

              {loadingAccess ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : accessStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Aucun étudiant n'a accès à ce cours</p>
                  <p className="text-sm mt-1">Attribuez l'accès à vos étudiants créés.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Étudiant</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Accès accordé le</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {accessStudents.map(a => (
                        <tr key={a.access_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0 overflow-hidden">
                                {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : a.student_name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{a.student_name}</p>
                                <p className="text-xs text-slate-500">{a.student_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(a.granted_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleRevokeAccess(a.student_id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Révoquer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create student modal */}
      {showCreateModal && (
        <Modal title="Créer un étudiant" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nom complet *</label>
              <input required value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Alice Dupont"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Email *</label>
              <input required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="alice@exemple.com"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                🔑 Mot de passe par défaut : <code className="font-mono">password123</code>
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">L'étudiant devra le changer à sa première connexion.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Grant access modal */}
      {showGrantModal && (
        <Modal title="Attribuer l'accès au cours" onClose={() => { setShowGrantModal(false); setSelectedStudentIds([]); }}>
          <div className="space-y-4">
            {studentsWithoutAccess.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Tous vos étudiants ont déjà accès à ce cours.</p>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sélectionnez les étudiants à qui accorder l'accès :</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {studentsWithoutAccess.map(s => (
                    <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                      <input type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={e => setSelectedStudentIds(prev =>
                          e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                        )}
                        className="rounded" />
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                        {s.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowGrantModal(false); setSelectedStudentIds([]); }}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                  <button onClick={handleGrantAccess} disabled={granting || selectedStudentIds.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {granting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {granting ? 'Attribution...' : `Accorder l'accès (${selectedStudentIds.length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
