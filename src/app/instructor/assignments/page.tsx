import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import { learningService, type AssignmentItem, type SubmissionItem } from '../../../services/learningService';
import type { Course } from '../../../types/lms';

type SubmissionDraft = {
  grade: string;
  feedback: string;
};

export default function ManageAssignments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [drafts, setDrafts] = useState<Record<string, SubmissionDraft>>({});

  const refresh = async () => {
    if (!user?.id) return;
    const [courseList, assignmentList, submissionList] = await Promise.all([
      courseService.listCourses({ instructor: user.id }),
      learningService.listAssignments(),
      learningService.listSubmissions(),
    ]);
    setCourses(courseList);
    setAssignments(assignmentList);
    setSubmissions(submissionList);
    setCourseId((current) => current || courseList[0]?.id || '');
    setDrafts(
      Object.fromEntries(
        submissionList.map((submission) => [
          submission.id,
          { grade: submission.grade || '', feedback: submission.feedback || '' },
        ]),
      ),
    );
  };

  useEffect(() => {
    refresh().catch(() => showToast('Impossible de charger les assignments instructeur.', 'error'));
  }, [showToast, user?.id]);

  const filteredAssignments = useMemo(
    () => assignments.filter((assignment) => !courseId || assignment.course === courseId),
    [assignments, courseId],
  );
  const filteredSubmissions = useMemo(
    () => submissions.filter((submission) => !courseId || submission.course_id === courseId),
    [courseId, submissions],
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Grading & Assignments</h1>

          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] mb-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-lg">Create an assignment</h2>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm">
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Assignment brief" rows={4} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              <button
                className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                onClick={async () => {
                  if (!courseId || !title.trim() || !dueDate) {
                    showToast('Course, title and due date are required.', 'error');
                    return;
                  }
                  try {
                    await learningService.createAssignment({
                      course: courseId,
                      title: title.trim(),
                      description,
                      due_date: new Date(dueDate).toISOString(),
                      points: 100,
                      type: 'PROJECT',
                    });
                    setTitle('');
                    setDescription('');
                    setDueDate('');
                    await refresh();
                    showToast('Assignment ajoute.', 'success');
                  } catch {
                    showToast('Creation assignment impossible.', 'error');
                  }
                }}
              >
                Add assignment
              </button>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-4">Existing assignments</h2>
              <div className="space-y-3">
                {filteredAssignments.length === 0 && <p className="text-sm text-slate-500">No assignment for this scope yet.</p>}
                {filteredAssignments.map((assignment) => (
                  <div key={assignment.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{assignment.title}</p>
                        <p className="text-sm text-slate-500">{assignment.course_title || assignment.course}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{assignment.type}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{assignment.description || 'No description.'}</p>
                    <p className="mt-2 text-xs text-slate-500">Due {new Date(assignment.due_date).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-lg">Submissions</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 && <div className="px-6 py-5 text-sm text-slate-500">No submissions found.</div>}
              {filteredSubmissions.map((submission) => (
                <div key={submission.id} className="px-6 py-5 grid gap-4 lg:grid-cols-[1fr,0.7fr,0.5fr,1fr,auto] items-start">
                  <div>
                    <p className="font-semibold text-slate-900">{submission.assignment_title || submission.assignment}</p>
                    <p className="text-sm text-slate-500">{submission.student_name || submission.student}</p>
                    <p className="text-xs text-slate-400 mt-1">{submission.course_title || 'Course'} ÔÇó {new Date(submission.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-700">Status</p>
                    <p className="text-slate-500">{submission.status}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={drafts[submission.id]?.grade || ''}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [submission.id]: { ...(current[submission.id] || { grade: '', feedback: '' }), grade: e.target.value },
                      }))
                    }
                    placeholder="Grade"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                  <textarea
                    value={drafts[submission.id]?.feedback || ''}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [submission.id]: { ...(current[submission.id] || { grade: '', feedback: '' }), feedback: e.target.value },
                      }))
                    }
                    placeholder="Feedback for the learner"
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />
                  <button
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                    onClick={async () => {
                      const draft = drafts[submission.id];
                      if (!draft?.grade) {
                        showToast('Ajoute une note avant de sauvegarder.', 'error');
                        return;
                      }
                      try {
                        await learningService.gradeSubmission(submission.id, {
                          grade: draft.grade,
                          feedback: draft.feedback,
                          status: 'GRADED',
                        });
                        await refresh();
                        showToast('Submission graded.', 'success');
                      } catch {
                        showToast('Notation impossible.', 'error');
                      }
                    }}
                  >
                    Save grade
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

