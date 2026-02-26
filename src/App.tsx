import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyCourses from './pages/MyCourses';
import CoursePlayer from './pages/CoursePlayer';
import Assignments from './pages/Assignments';
import Grades from './pages/Grades';
import Community from './pages/Community';
import Certificate from './pages/Certificate';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<MyCourses />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/community" element={<Community />} />
        <Route path="/player" element={<CoursePlayer />} />
        <Route path="/learning" element={<CoursePlayer />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
