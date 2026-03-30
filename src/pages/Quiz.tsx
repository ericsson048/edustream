import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { CheckCircle, Circle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { learningService, type QuizItem } from '../services/learningService';
import { useToast } from '../contexts/ToastContext';

export default function Quiz() {
  const { id = '' } = useParams();
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    learningService
      .getQuiz(id)
      .then(setQuiz)
      .catch(() => showToast('Quiz introuvable.', 'error'));
  }, [id, showToast]);

  const questions = quiz?.questions || [];
  const current = questions[currentQuestion];

  const handleSelect = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setIsSaving(true);
    try {
      const result = await learningService.submitQuizAttempt({
        quiz: quiz.id,
        answers: selectedAnswers,
      });
      setScore(Number(result.score));
      setPassed(result.passed);
      setIsSubmitted(true);
    } catch {
      showToast('Soumission du quiz impossible.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const answeredCount = useMemo(
    () => questions.filter((question) => selectedAnswers[question.id] !== undefined).length,
    [questions, selectedAnswers],
  );

  if (!quiz || !current) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="p-8 max-w-3xl mx-auto text-slate-500">Loading quiz...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{quiz.title}</h1>
              <p className="text-slate-500 mt-1">Passing score: {quiz.passing_score}%</p>
            </div>
            {!isSubmitted && (
              <div className="text-right">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Questions</p>
                <p className="text-2xl font-bold text-blue-600">{answeredCount}/{questions.length}</p>
              </div>
            )}
          </div>

          {!isSubmitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Question {currentQuestion + 1} of {questions.length}</span>
                <div className="flex gap-1">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`w-8 h-2 rounded-full ${index === currentQuestion ? 'bg-blue-600' : selectedAnswers[question.id] !== undefined ? 'bg-blue-200' : 'bg-slate-100'}`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">{current.prompt}</h2>

              <div className="space-y-3 mb-8">
                {current.options.map((option, index) => (
                  <div
                    key={`${current.id}-${index}`}
                    onClick={() => handleSelect(current.id, index)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedAnswers[current.id] === index ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    {selectedAnswers[current.id] === index ? (
                      <CheckCircle className="w-6 h-6 text-blue-600 shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 shrink-0" />
                    )}
                    <span className={`font-medium ${selectedAnswers[current.id] === index ? 'text-blue-900' : 'text-slate-700'}`}>{option}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                {currentQuestion === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || answeredCount < questions.length}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isSaving ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestion((value) => Math.min(questions.length - 1, value + 1))}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
              <p className="text-slate-500 mb-8">{passed ? 'You passed this quiz.' : 'You can review the lesson and try again later.'}</p>

              <div className="inline-block bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Your Score</p>
                <p className={`text-5xl font-bold ${passed ? 'text-green-600' : 'text-amber-500'}`}>{score ?? 0}%</p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Continue Course
                </button>
                <Link to="/assignments" className="px-8 py-3 bg-slate-100 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                  View Assignments
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
