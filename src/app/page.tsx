import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Video,
  Code2,
  BrainCircuit,
  GraduationCap,
  Users,
  BookOpen,
  DollarSign,
  Route,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import PublicNavbar from "../components/PublicNavbar";
import { authService } from "../services/authService";
import { courseService } from "../services/courseService";
import type { LearningPath } from "../types/lms";

function CountUp({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const duration = 1500;
    const start = performance.now();
    setDisplay(0);
    const frame = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased * 10 ** decimals) / 10 ** decimals);
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value, decimals]);

  const formatted = (() => {
    if (decimals > 0) {
      const factor = 10 ** decimals;
      return (Math.floor(display * factor) / factor).toFixed(decimals);
    }
    return Math.floor(display).toLocaleString();
  })();

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

export default function Welcome() {
  const [stats, setStats] = useState({
    total_courses: 0,
    total_instructors: 0,
    total_students: 0,
    total_payouts: 0,
  });
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    authService
      .getPublicStats()
      .then(setStats)
      .catch(() =>
        setStats({
          total_courses: 48,
          total_instructors: 24,
          total_students: 12400,
          total_payouts: 86000,
        }),
      );
    courseService
      .listLearningPaths({ is_active: true })
      .then(setLearningPaths)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30">
      <PublicNavbar />

      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium text-sm mb-8 border border-blue-100 dark:border-blue-800/50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Now with Unlimited AI Tutor & Live Streams</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            Master any skill with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              AI-Powered Learning
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            EduStream is the next-generation LMS. Get personalized help from our
            AI Tutor, write code in our Live IDE, and join interactive WebRTC
            live classes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 hover:scale-105"
            >
              Start Learning for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              View Plans
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {[
              {
                icon: Users,
                color: "text-blue-500",
                value: stats.total_students,
                suffix: "+",
                label: "Learners",
              },
              {
                icon: BookOpen,
                color: "text-indigo-500",
                value: stats.total_courses,
                suffix: "+",
                label: "Courses",
              },
              {
                icon: GraduationCap,
                color: "text-emerald-500",
                value: stats.total_instructors,
                suffix: "+",
                label: "Instructors",
              },
              {
                icon: DollarSign,
                color: "text-amber-500",
                value: stats.total_payouts / 1000,
                suffix: "K+",
                decimals: 1,
                label: "Paid to Instructors",
                prefix: "$",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.15, duration: 0.5 }}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800"
                >
                  <Icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold">
                    {item.prefix}
                    <CountUp
                      value={item.value as number}
                      suffix={item.suffix}
                      decimals={item.decimals as number | undefined}
                    />
                  </p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
        className="py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
            }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We've combined the best tools into one seamless platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BrainCircuit,
                color: "blue",
                title: "Contextual AI Tutor",
                desc: "Stuck on a concept? Our Gemini-powered AI knows exactly which video and timestamp you're watching to give you perfect, contextual answers.",
              },
              {
                icon: Video,
                color: "indigo",
                title: "WebRTC Live Streams",
                desc: "Join interactive, ultra-low latency live classes. Ask questions in real-time, share your screen, and collaborate with peers seamlessly.",
              },
              {
                icon: Code2,
                color: "emerald",
                title: "Live IDE Integration",
                desc: "Practice coding directly in the browser while watching lessons. Real-time execution and error highlighting without leaving the platform.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              const borderColor =
                feature.color === "blue"
                  ? "hover:border-blue-500/50"
                  : feature.color === "indigo"
                    ? "hover:border-indigo-500/50"
                    : "hover:border-emerald-500/50";
              const bgColor =
                feature.color === "blue"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : feature.color === "indigo"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
              return (
                <motion.div
                  key={feature.title}
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6 },
                    },
                  }}
                  className={`bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 ${borderColor} transition-colors group`}
                >
                  <div
                    className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {learningPaths.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="py-24 px-6 bg-white dark:bg-slate-900"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
              className="flex items-center justify-between mb-12"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                  Parcours
                </p>
                <h2 className="text-3xl md:text-4xl font-black mt-2">
                  Learning Paths
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  Des parcours guides pour atteindre vos objectifs.
                </p>
              </div>
              <Route className="w-12 h-12 text-blue-600/20 dark:text-blue-400/10" />
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {learningPaths.slice(0, 3).map((path) => (
                <motion.div
                  key={path.id}
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5 },
                    },
                  }}
                >
                  <Link
                    to="/catalog"
                    className="group block rounded-[28px] border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/40"
                  >
                    <img
                      src={
                        path.thumbnail_url ||
                        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={path.title}
                      className="h-40 w-full rounded-2xl object-cover mb-5"
                    />
                    <h3 className="text-xl font-black">{path.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {path.description}
                    </p>
                    <p className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                      {path.courses.length} courses
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <motion.section
        id="instructors"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="py-24 px-6"
      >
        <div className="max-w-5xl mx-auto bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 md:p-16 text-center text-white relative overflow-hidden border border-slate-800">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
            className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="relative z-10"
          >
            <Users className="w-16 h-16 mx-auto mb-6 text-blue-400" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Become an Instructor
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
              Share your knowledge with the world. Our marketplace model lets
              you keep 70% of every sale, while we handle the hosting, AI costs,
              and payments.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-transform hover:scale-105"
            >
              See Instructor Plans
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight">EduStream</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            ┬® 2026 EduStream LMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
