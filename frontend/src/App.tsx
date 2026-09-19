import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AdminDisputes from "./pages/AdminDisputes";
import AdminVendors from "./pages/AdminVendors";
import CreateProject from "./pages/CreateProject";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MyContributions from "./pages/MyContributions";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectList from "./pages/ProjectList";
import Register from "./pages/Register";
import TrackByUin from "./pages/TrackByUin";

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route path="/track" element={<TrackByUin />} />
        <Route
          path="/my-contributions"
          element={
            <ProtectedRoute>
              <MyContributions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminVendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <ProtectedRoute>
              <AdminDisputes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
