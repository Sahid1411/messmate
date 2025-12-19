import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
function App() {
  return (
    <>
      {/* This component renders the toast messages */}
      <Toaster position="top-center" reverseOrder={false} />
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}

export default App;