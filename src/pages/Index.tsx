import { Navigate } from "react-router-dom";

// Index redirects to dashboard (auth handled by ProtectedRoute) or to /auth
const Index = () => <Navigate to="/dashboard" replace />;

export default Index;
