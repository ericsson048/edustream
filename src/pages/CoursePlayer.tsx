import { Play, Pause, Volume2, Settings, Maximize, ChevronRight, CheckCircle, Circle, Lock, MessageSquare, FileText, Download, Clock, Search, Bell, BookOpen, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const defaultCode = `function Timer() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);

    // Add your cleanup function here!
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-blue-50 text-blue-900 rounded-xl font-bold text-2xl text-center shadow-inner">
      Count: {count}
    </div>
  );
}`;

export default function CoursePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('AI Tutor ✨');
  const [chatInput, setChatInput] = useState('');
  const [ideCode, setIdeCode] = useState(defaultCode);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'user', text: 'Can you explain why we need the cleanup function here?' },
    { role: 'ai', text: 'At 08:24, the instructor is setting up an event listener. If we don\'t return a cleanup function to remove that listener, every time the component re-renders, a new listener is added, causing a memory leak!' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are an expert programming AI Tutor helping a student who is watching a video course about "Mastering useEffect" in React.
        The student is currently at timestamp 08:24 in the video.
        
        Student's question: "${userMessage}"
        
        Provide a concise, helpful, and encouraging answer. Use markdown for code snippets if necessary.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "I'm sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error("AI Tutor Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error connecting to the AI service. Please make sure the Gemini API key is configured correctly in the platform settings." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">EduStream LMS</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
            <Link to="/courses" className="text-blue-600 dark:text-blue-400 font-bold">My Courses</Link>
            <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Resources</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search lessons..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
            />
          </div>
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
             <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 max-w-5xl mx-auto w-full">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
              <Link to="/courses" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">React Development</Link>
              <ChevronRight className="w-4 h-4" />
              <span>Advanced Hooks</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold text-slate-900 dark:text-white">Mastering useEffect</span>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl relative group">
              <img 
                src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80" 
                alt="Video thumbnail" 
                className="w-full h-full object-cover opacity-60"
              />
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-20 h-20 bg-blue-600/90 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg backdrop-blur-sm"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
              </div>

              {/* Bottom Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full bg-white/20 h-1.5 rounded-full mb-4 cursor-pointer overflow-hidden">
                  <div className="bg-blue-500 h-full w-[35%] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-6">
                    <button onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <div className="flex items-center gap-2 group/vol">
                      <Volume2 className="w-5 h-5" />
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                        <div className="w-20 h-1 bg-white/30 rounded-full ml-2">
                          <div className="w-[70%] h-full bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium font-mono">08:24 / 24:15</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Settings className="w-5 h-5 cursor-pointer hover:rotate-45 transition-transform" />
                    <Maximize className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Info */}
            <div className="mt-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Understanding the useEffect Hook</h1>
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 24 mins</span>
                  <span className="flex items-center gap-1"><Settings className="w-4 h-4" /> Advanced</span>
                  <span>Updated Jan 2024</span>
                </div>
              </div>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Ask Instructor
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-10 border-b border-slate-200 dark:border-slate-800">
              <div className="flex gap-8 overflow-x-auto">
                {['Course Content', 'Notes', 'Discussion', 'Resources', 'AI Tutor ✨', 'Live IDE 💻'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab 
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-8">
              {activeTab === 'Course Content' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 dark:text-white">About this lesson</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                    In this lesson, we'll dive deep into the lifecycle of a component using the useEffect hook. 
                    We will explore how to manage side effects, clean up intervals and subscriptions, and optimize performance by correctly managing the dependency array.
                  </p>
                </div>
              )}

              {/* AI Tutor */}
              {activeTab === 'AI Tutor ✨' && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[500px]">
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <span className="text-xl">✨</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Contextual AI Tutor</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ask anything about the current video timestamp (08:24)</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'ai' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs ${msg.role === 'ai' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          {msg.role === 'ai' ? 'AI' : 'U'}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm ${
                          msg.role === 'ai' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none'
                        }`}>
                          {msg.role === 'ai' ? (
                            <div className="markdown-body">
                              <Markdown>{msg.text}</Markdown>
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-white text-xs">AI</div>
                        <div className="bg-blue-600 p-3 rounded-2xl rounded-tr-none text-sm text-white flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="relative shrink-0 mt-auto">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask your AI Tutor..." 
                      className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" 
                      disabled={isTyping}
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={isTyping || !chatInput.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Live IDE */}
              {activeTab === 'Live IDE 💻' && (
                <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-slate-800 h-[500px] flex flex-col">
                  <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-black shrink-0">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">App.jsx</span>
                    <button 
                      onClick={() => setIdeCode(defaultCode)}
                      className="text-xs bg-slate-700 text-white px-3 py-1 rounded hover:bg-slate-600 transition-colors"
                    >
                      Reset Code
                    </button>
                  </div>
                  <div className="flex-1 flex overflow-hidden">
                    <LiveProvider code={ideCode}>
                      <div className="w-1/2 h-full overflow-auto border-r border-black">
                        <LiveEditor 
                          onChange={setIdeCode}
                          className="font-mono text-sm min-h-full" 
                          style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: 14, backgroundColor: '#1e1e1e' }}
                        />
                      </div>
                      <div className="w-1/2 h-full overflow-auto bg-white dark:bg-slate-900 p-6 relative">
                        <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Preview</div>
                        <LiveError className="text-red-500 text-xs font-mono mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg" />
                        <LivePreview />
                      </div>
                    </LiveProvider>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Sidebar - Course Content */}
        <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden shrink-0 transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg dark:text-white">Course Content</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Module 1 */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Module 1</p>
                  <h4 className="font-bold text-slate-900 dark:text-white">Introduction to Hooks</h4>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800">
                {[
                  { title: 'Why Hooks?', duration: '05:12', completed: true },
                  { title: 'useState Fundamentals', duration: '12:45', completed: true },
                ].map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lesson.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 2 - Active */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden ring-2 ring-blue-600/20">
              <div className="p-4 flex items-center justify-between cursor-pointer bg-blue-50 dark:bg-blue-900/20">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Module 2</p>
                  <h4 className="font-bold text-slate-900 dark:text-white">Side Effects with useEffect</h4>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400 rotate-90" />
              </div>
              <div className="border-t border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start gap-3 p-4 bg-blue-100/50 dark:bg-blue-900/30 cursor-pointer border-l-4 border-blue-600 dark:border-blue-500">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Mastering useEffect</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">24:15</p>
                  </div>
                </div>
                {[
                  { title: 'Cleanup Functions', duration: '10:30' },
                  { title: 'Dependency Best Practices', duration: '18:20' },
                ].map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer border-b border-blue-100/50 dark:border-blue-900/30 last:border-0">
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{lesson.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lesson.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 3 - Locked */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden opacity-60">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Module 3</p>
                  <h4 className="font-bold text-slate-900 dark:text-white">Performance Hooks</h4>
                </div>
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>Course Progress</span>
              <span className="text-blue-600 dark:text-blue-400">45%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[45%] rounded-full"></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
