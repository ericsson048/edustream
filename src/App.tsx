import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Router>
      <div className="relative">
        <Routes>
          {/* Public / Student Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/course/:id" element={<CourseDetails />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/courses" element={<MyCourses />} />
          <Route path="/skill-tree" element={<SkillTree />} />
          <Route path="/focus" element={<FocusRoom />} />
          <Route path="/schedule" element={<StudentSchedule />} />
          <Route path="/live/:id" element={<LiveMeeting />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:id/submit" element={<SubmitAssignment />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/community" element={<Community />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/player" element={<CoursePlayer />} />
          <Route path="/learning" element={<CoursePlayer />} />
          <Route path="/quiz/:id" element={<Quiz />} />
          <Route path="/certificate" element={<Certificate />} />
          <Route path="/instructor/profile/:id" element={<InstructorProfile />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          
          {/* Instructor Routes */}
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/assignments" element={<ManageAssignments />} />
          <Route path="/instructor/courses" element={<InstructorCourses />} />
          <Route path="/instructor/courses/edit" element={<CourseEditor />} />
          <Route path="/instructor/analytics" element={<InstructorAnalytics />} />
          <Route path="/instructor/schedule" element={<InstructorSchedule />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </div>
    </Router>
  );
}
