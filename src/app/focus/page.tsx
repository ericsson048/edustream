import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Play, Pause, RotateCcw, Coffee, CloudRain, Flame, Headphones, BarChart3 } from 'lucide-react';
import { focusService } from '../../services/focusService';

const AMBIENT_SOUNDS: Record<string, { url: string; label: string }> = {
  rain: { url: 'https://cdn.freesound.org/previews/531/531946_1648170-lq.mp3', label: 'Rain' },
  fire: { url: 'https://cdn.freesound.org/previews/423/423291_10975223-lq.mp3', label: 'Campfire' },
  cafe: { url: 'https://cdn.freesound.org/previews/434/434895_12799143-lq.mp3', label: 'Cafe' },
  lofi: { url: 'https://cdn.freesound.org/previews/527/527400_11542807-lq.mp3', label: 'Lo-Fi Beats' },
};

function useAmbientAudio() {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.4);

  const play = (id: string) => {
    const existing = audioRefs.current.get(id);
    if (existing) {
      existing.volume = volume;
      existing.play().catch(() => {});
      return existing;
    }
    const sound = AMBIENT_SOUNDS[id];
    if (!sound) return null;
    const audio = new Audio(sound.url);
    audio.loop = true;
    audio.volume = volume;
    audioRefs.current.set(id, audio);
    audio.play().catch(() => {});
    return audio;
  };

  const stop = (id: string) => {
    const audio = audioRefs.current.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const stopAll = () => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume]);

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  const toggleSound = (id: string) => {
    if (activeSound === id) {
      stop(id);
      setActiveSound(null);
    } else {
      if (activeSound) stop(activeSound);
      play(id);
      setActiveSound(id);
    }
  };

  return { activeSound, toggleSound, volume, setVolume };
}

export default function FocusRoom() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [stats, setStats] = useState({ total_focus_minutes: 0, total_sessions: 0 });
  const [saving, setSaving] = useState(false);
  const { activeSound, toggleSound, volume, setVolume } = useAmbientAudio();

  useEffect(() => {
    focusService.getStats().then(setStats).catch(() => {});
  }, []);

  const saveSession = useCallback(async () => {
    setSaving(true);
    try {
      await focusService.createSession(
        mode === 'work' ? 25 * 60 - timeLeft : 5 * 60 - timeLeft,
        mode === 'work' ? 'WORK' : 'BREAK',
      );
      const fresh = await focusService.getStats();
      setStats(fresh);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [mode, timeLeft]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      saveSession();
      if (mode === 'work') {
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, saveSession]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sounds = [
    { id: 'rain', name: 'Rain', icon: CloudRain },
    { id: 'fire', name: 'Campfire', icon: Flame },
    { id: 'cafe', name: 'Cafe', icon: Coffee },
    { id: 'lofi', name: 'Lo-Fi Beats', icon: Headphones },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 font-sans text-slate-100">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col">
        <div className="p-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className={`w-[500px] h-[500px] rounded-full blur-[100px] transition-colors duration-1000 ${mode === 'work' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
          </div>

          <div className="z-10 w-full max-w-md">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-2">Focus Room</h1>
              <p className="text-slate-400">Deep work environment to maximize your learning.</p>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl mb-12">
              <button
                onClick={() => switchMode('work')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'work' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Deep Work
              </button>
              <button
                onClick={() => switchMode('break')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'break' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Short Break
              </button>
            </div>

            <div className="text-center mb-12">
              <div className="text-8xl font-bold font-mono tracking-tighter mb-8 text-white drop-shadow-lg">
                {formatTime(timeLeft)}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleTimer}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-lg ${isRunning ? 'bg-slate-700 text-white' : mode === 'work' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}
                >
                  {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                <button
                  onClick={resetTimer}
                  className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-4 text-center">
                <BarChart3 className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{Math.floor(stats.total_focus_minutes / 60)}h {stats.total_focus_minutes % 60}m</p>
                <p className="text-xs text-slate-400">Total focus time</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-4 text-center">
                <BarChart3 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{stats.total_sessions}</p>
                <p className="text-xs text-slate-400">Sessions completed</p>
              </div>
            </div>

            {saving && <p className="text-xs text-center text-slate-500 mb-2">Saving session...</p>}

            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Ambient Sounds</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {sounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => toggleSound(sound.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${activeSound === sound.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-transparent'}`}
                  >
                    <sound.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{sound.name}</span>
                  </button>
                ))}
              </div>
              {activeSound && (
                <div className="flex items-center gap-3 px-2">
                  <span className="text-xs text-slate-500">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-blue-500"
                  />
                  <span className="text-xs text-slate-500 w-8 text-right">{Math.round(volume * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
