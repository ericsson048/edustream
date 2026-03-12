import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { CheckCircle, Circle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const questions = [
  {
    id: 1,
    question: "What is the primary purpose of the `useEffect` hook in React?",
    options: [
      "To manage local component state",
      "To perform side effects in function components",
      "To create context providers",
      "To handle form submissions"
    ],
    correct: 1
  },
  {
    id: 2,
    question: "Which hook should you use to memoize a computationally expensive function?",
    options: [
      "useCallback",
      "useMemo",
      "useRef",
      "useEffect"
    ],
    correct: 1
  },
  {
    id: 3,
    question: "What does the empty dependency array `[]` mean in `useEffect`?",
    options: [
      "The effect runs on every render",
      "The effect never runs",
      "The effect runs only once after the initial render",
      "The effect runs when any state changes"
    ],
    correct: 2
  }
];

export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: optionIndex });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct) score++;
    });
    return Math.round((score / questions.length) * 100);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Module 2 Quiz</h1>
              <p className="text-slate-500 mt-1">Advanced React Patterns</p>
            </div>
            {!isSubmitted && (
              <div className="text-right">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Time Remaining</p>
                <p className="text-2xl font-bold text-blue-600">14:59</p>
              </div>
            )}
          </div>

          {!isSubmitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Question {currentQuestion + 1} of {questions.length}</span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-8 h-2 rounded-full ${i === currentQuestion ? 'bg-blue-600' : selectedAnswers[i] !== undefined ? 'bg-blue-200' : 'bg-slate-100'}`}></div>
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3 mb-8">
                {questions[currentQuestion].options.map((option, index) => (
                  <div 
                    key={index}
                    onClick={() => handleSelect(index)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedAnswers[currentQuestion] === index 
                        ? 'border-blue-600 bg-blue-50/50' 
                        : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    {selectedAnswers[currentQuestion] === index ? (
                      <CheckCircle className="w-6 h-6 text-blue-600 shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 shrink-0" />
                    )}
                    <span className={`font-medium ${selectedAnswers[currentQuestion] === index ? 'text-blue-900' : 'text-slate-700'}`}>
                      {option}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button 
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                
                {currentQuestion === questions.length - 1 ? (
                  <button 
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedAnswers).length < questions.length}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button 
                    onClick={handleNext}
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
              <p className="text-slate-500 mb-8">You have successfully finished the Module 2 Quiz.</p>
              
              <div className="inline-block bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Your Score</p>
                <p className={`text-5xl font-bold ${calculateScore() >= 70 ? 'text-green-600' : 'text-amber-500'}`}>
                  {calculateScore()}%
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/learning')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Continue Course
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
