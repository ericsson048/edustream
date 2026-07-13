import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import Welcome from "./app/page";
import Pricing from "./app/pricing/page";
import Login from "./app/login/page";
import Register from "./app/register/page";
import ForgotPassword from "./app/forgot-password/page";
const Dashboard = lazy(() => import("./app/dashboard/page"));
import Catalog from "./app/catalog/page";
import CourseDetails from "./app/course/_id/page";
import Checkout from "./app/checkout/_id/page";
import MyCourses from "./app/courses/page";
import CoursePlayer from "./app/player/_courseId/_lessonId/page";
import Quiz from "./app/quiz/_id/page";
import Assignments from "./app/assignments/page";
import SubmitAssignment from "./app/assignments/_id/submit/page";
import Grades from "./app/grades/page";
import Community from "./app/community/page";
import GroupDetail from "./app/community/groups/_id/page";
import Messages from "./app/messages/page";
import Profile from "./app/profile/page";
import Certificate from "./app/certificate/page";
import InstructorProfile from "./app/instructor/profile/_id/page";
import InstructorProfileSettings from "./app/instructor/profile/page";
import InstructorMessages from "./app/instructor/messages/page";
import AdminMessages from "./app/admin/messages/page";
import AdminProfile from "./app/admin/profile/page";
import Chatbot from "./components/Chatbot";
import FocusRoom from "./app/focus/page";
import SkillTree from "./app/skill-tree/page";
import Notifications from "./app/notifications/page";
import StudentSchedule from "./app/schedule/page";
import LiveMeeting from "./app/live/_id/page";

// Admin Pages
import AdminDashboard from "./app/admin/page";
import ManageUsers from "./app/admin/users/page";
import AdminCourses from "./app/admin/courses/page";
import AdminSettings from "./app/admin/settings/page";
import AdminReports from "./app/admin/reports/page";
import AdminSupport from "./app/admin/support/page";
import AdminTransactions from "./app/admin/transactions/page";

// Instructor Pages
import InstructorDashboard from "./app/instructor/page";
import ManageAssignments from "./app/instructor/assignments/page";
import InstructorCourses from "./app/instructor/courses/page";
import CourseDetail from "./app/instructor/courses/_id/page";
import LessonContentEditor from "./app/instructor/courses/_id/lessons/_lessonId/content/page";
import InstructorResources from "./app/instructor/resources/page";
import InstructorAnalytics from "./app/instructor/analytics/page";
import InstructorSchedule from "./app/instructor/schedule/page";
import ProtectedRoute, {
  getDefaultRoute,
} from "./components/guards/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

function DashboardFallback() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
      </aside>
      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse mb-8" />
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2 animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      <div className="relative">
        <Routes>
          {/* Public / Student Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/login"
            element={
              isAuthenticated && user ? (
                <Navigate to={getDefaultRoute(user.role)} replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated && user ? (
                <Navigate to={getDefaultRoute(user.role)} replace />
              ) : (
                <Register />
              )
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Suspense fallback={<DashboardFallback />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <Catalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/:id"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skill-tree"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <SkillTree />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/focus"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <FocusRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <StudentSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live/:id"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR"]}>
                <LiveMeeting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Assignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments/:id/submit"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <SubmitAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grades"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Grades />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/groups/:id"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <GroupDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["STUDENT", "INSTRUCTOR", "ADMIN"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/:courseId/:lessonId?"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <CoursePlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning/:courseId/:lessonId?"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <CoursePlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificate"
            element={
              <ProtectedRoute roles={["STUDENT"]}>
                <Certificate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/profile/:id"
            element={
              <ProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
                <InstructorProfile />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminSupport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          {/* Instructor Routes */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/profile"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/messages"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assignments"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <ManageAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:id"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/lessons/:lessonId/content"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <LessonContentEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/resources"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorResources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/analytics"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/schedule"
            element={
              <ProtectedRoute roles={["INSTRUCTOR"]}>
                <InstructorSchedule />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </div>
    </Router>
  );
}
