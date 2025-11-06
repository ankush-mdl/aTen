import { Link, useNavigate } from "react-router-dom";
import "../assets/pages/InterioHome.css";
import toast from "react-hot-toast";

export default function InterioHome() {
  const navigate = useNavigate();

  // function to handle click and check login
  const handleProtectedNavigation = (path) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      toast.error("Please login to continue!")
      navigate("/login");
      return;
    }
    navigate(path);
  };

  return (
    <div className="interio-page">
      {/* Home Interiors Section */}
      <div className="interio-section home-section">
        <div className="section-content">
          <h2>HOME</h2>
          <div className="hover-menu">
            <button onClick={() => handleProtectedNavigation("/catalog/1bhk")}>1 BHK</button>
            <button onClick={() => handleProtectedNavigation("/catalog/2bhk")}>2 BHK</button>
            <button onClick={() => handleProtectedNavigation("/catalog/3bhk")}>3 BHK</button>
            <button onClick={() => handleProtectedNavigation("/catalog/3+BHK")}>3+ BHK</button>
            <button onClick={() => handleProtectedNavigation("/catalog/kitchen")}>Kitchen</button>
            <button onClick={() => handleProtectedNavigation("/catalog/bathroom")}>Bathroom</button>
          </div>
        </div>
      </div>

      {/* Commercial Interiors Section */}
      <div className="interio-section commercial-section">
        <div className="section-content">
          <h2>COMMERCIAL</h2>
          <div className="hover-menu">
            <button onClick={() => handleProtectedNavigation("/catalog/offices")}>Offices</button>
            <button onClick={() => handleProtectedNavigation("/catalog/cafes")}>Cafes</button>
            <button onClick={() => handleProtectedNavigation("/catalog/showrooms")}>Showrooms</button>
            <button onClick={() => handleProtectedNavigation("/catalog/banquets")}>Banquets</button>
            <button onClick={() => handleProtectedNavigation("/catalog/clinics")}>Restaurants</button>
            <button onClick={() => handleProtectedNavigation("/catalog/other")}>Others</button>
          </div>
        </div>
      </div>
    </div>
  );
}
