import { Link } from "react-router-dom";
import "../assets/pages/Home.css";

const homeTypes = [
  { name: "INTERIO", path: "/interio", background: "/interiohome.jpg", description:"Beautiful, functional spaces crafted with modern design and comfort in mind."},
  { name: "REALTY", path: "/projects", background: "/realtorhome.jpg", description:"Providing reliable property solutions and expert guidance for every home buyer and seller." },
  { name: "ENGINEERING", path: "/catalog/3bhk", background: "/engineeringhome.jpg", description:"Delivering strong, sustainable, and efficient construction and structural solutions."},

];

export default function InterioHome() {
   return (
    <div className="home">
      {/* <header className="home-header">
        <h1>Welcome to Aten Interiors</h1>
      </header> */}

      <section className="home-grid">
        {homeTypes.map((h) => (
          <Link
            
            key={h.name}
            to={h.path}
            style={{ backgroundImage: `url(${h.background})` }}
            className="home-card"
          >
            <div className="overlay"></div>
            <span className="segment-name">{h.name}</span>
            <p className="description">{h.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );

}
