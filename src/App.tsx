import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import CourseDetails from './pages/CourseDetails';
import Checkout from './pages/Checkout';
import MyCourses from './pages/MyCourses';
import CoursePlayer from './pages/CoursePlayer';
import Quiz from './pages/Quiz';
import Assignments from './pages/Assignments';
import SubmitAssignment from './pages/SubmitAssignment';
import Grades from './pages/Grades';
import Community from './pages/Community';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Certificate from './pages/Certificate';
import InstructorProfile from './pages/InstructorProfile';
import Chatbot from './components/Chatbot';
import FocusRoom from './pages/FocusRoom';
import SkillTree from './pages/SkillTree';
import StudentSchedule from './pages/StudentSchedule';
import LiveMeeting from './pages/LiveMeeting';

// Admin Pages
import AdminDashboard from './pages/adminpages/AdminDashboard';
import ManageUsers from './pages/adminpages/ManageUsers';
import AdminCourses from './pages/adminpages/AdminCourses';
import AdminSettings from './pages/adminpages/AdminSettings';
import AdminReports from './pages/adminpages/AdminReports';
import AdminSupport from './pages/adminpages/AdminSupport';
import AdminTransactions from './pages/adminpages/AdminTransactions';

// Instructor Pages
import InstructorDashboard from './pages/instructorpages/InstructorDashboard';
import ManageAssignments from './pages/instructorpages/ManageAssignments';
import InstructorCourses from './pages/instructorpages/InstructorCourses';
import InstructorAnalytics from './pages/instructorpages/InstructorAnalytics';
import CourseEditor from './pages/instructorpages/CourseEditor';
import InstructorSchedule from './pages/instructorpages/InstructorSchedule';
import ProtectedRoute, { getDefaultRoute } from './components/guards/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      <div className="relative">
        <Routes>
          {/* Public / Student Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={isAuthenticated && user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated && user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['STUDENT']}><Dashboard /></ProtectedRoute>} />
          <Route path="/catalog" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR', 'ADMIN']}><Catalog /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR', 'ADMIN']}><CourseDetails /></ProtectedRoute>} />
          <Route path="/checkout/:id" element={<ProtectedRoute roles={['STUDENT']}><Checkout /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute roles={['STUDENT']}><MyCourses /></ProtectedRoute>} />
          <Route path="/skill-tree" element={<ProtectedRoute roles={['STUDENT']}><SkillTree /></ProtectedRoute>} />
          <Route path="/focus" element={<ProtectedRoute roles={['STUDENT']}><FocusRoom /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute roles={['STUDENT']}><StudentSchedule /></ProtectedRoute>} />
          <Route path="/live/:id" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR']}><LiveMeeting /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute roles={['STUDENT']}><Assignments /></ProtectedRoute>} />
          <Route path="/assignments/:id/submit" element={<ProtectedRoute roles={['STUDENT']}><SubmitAssignment /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute roles={['STUDENT']}><Grades /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR', 'ADMIN']}><Community /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR', 'ADMIN']}><Messages /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute roles={['STUDENT', 'INSTRUCTOR', 'ADMIN']}><Profile /></ProtectedRoute>} />
          <Route path="/player" element={<ProtectedRoute roles={['STUDENT']}><CoursePlayer /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute roles={['STUDENT']}><CoursePlayer /></ProtectedRoute>} />
          <Route path="/quiz/:id" element={<ProtectedRoute roles={['STUDENT']}><Quiz /></ProtectedRoute>} />
          <Route path="/certificate" element={<ProtectedRoute roles={['STUDENT']}><Certificate /></ProtectedRoute>} />
          <Route path="/instructor/profile/:id" element={<ProtectedRoute roles={['INSTRUCTOR', 'ADMIN']}><InstructorProfile /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><ManageUsers /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute roles={['ADMIN']}><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['ADMIN']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['ADMIN']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute roles={['ADMIN']}><AdminSupport /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute roles={['ADMIN']}><AdminTransactions /></ProtectedRoute>} />
          
          {/* Instructor Routes */}
          <Route path="/instructor" element={<ProtectedRoute roles={['INSTRUCTOR']}><InstructorDashboard /></ProtectedRoute>} />
          <Route path="/instructor/assignments" element={<ProtectedRoute roles={['INSTRUCTOR']}><ManageAssignments /></ProtectedRoute>} />
          <Route path="/instructor/courses" element={<ProtectedRoute roles={['INSTRUCTOR']}><InstructorCourses /></ProtectedRoute>} />
          <Route path="/instructor/courses/edit" element={<ProtectedRoute roles={['INSTRUCTOR']}><CourseEditor /></ProtectedRoute>} />
          <Route path="/instructor/analytics" element={<ProtectedRoute roles={['INSTRUCTOR']}><InstructorAnalytics /></ProtectedRoute>} />
          <Route path="/instructor/schedule" element={<ProtectedRoute roles={['INSTRUCTOR']}><InstructorSchedule /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </div>
    </Router>
  );
}
