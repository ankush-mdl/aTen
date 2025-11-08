import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InterioHome from "./pages/InterioHome";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Details from "./pages/Details";
import Enquiry from "./pages/Enquiry";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PhoneLoginModal from "./components/PhoneLogin";
import { Toaster } from "react-hot-toast";
import DashboardLayout from "./pages/admin/DashboardLayout";


// 👉 Import new Realty pages
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetails";
import ProjectsAdmin from "./pages/admin/ProjectsAdmin";
import ProjectForm from "./pages/admin/ProjectForm";
import ImportProjects from "./pages/admin/ImportProjects";

export default function App() {
  return (
    <Router>
      <div style={{"background": "#F2E8E4"}}>
        <Toaster position="top-center" />
        <Header />

        <Routes>
          {/* --- Public routes --- */}
          <Route path="/" element={<Home />} />
          <Route path="/interio" element={<InterioHome />} />
          <Route path="/catalog/:type" element={<Catalog />} />
          <Route path="/details/:type/:themeId" element={<Details />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/login" element={<PhoneLoginModal />} />

          {/* --- Realty / Projects section --- */}
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />

          {/* --- Admin routes --- */}
          <Route path="/admin" element={<DashboardLayout />}>
            <Route path="dashboard" element={<h2>Welcome Admin</h2>} />
            <Route path="import" element={<ImportProjects />} />
            <Route path="projects" element={<ProjectsAdmin />} />
            <Route path="projects/new" element={<ProjectForm />} />
            <Route path="projects/:id" element={<ProjectForm />} />
            {/* other admin nested routes here */}
          </Route>
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}
