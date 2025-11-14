import React from "react";
import { Link } from "react-router-dom";
import "../assets/pages/Home.css";

const homeTypes = [
  {
    name: "INTERIO",
    path: "/interio",
    background: "/interiohome.jpg",
    description:
      "Beautiful, functional spaces crafted with modern design and comfort in mind.",
  },
  {
    name: "REALTY",
    path: "/projects",
    background: "/realtorhome.jpg",
    description:
      "Providing reliable property solutions and expert guidance for every home buyer and seller.",
  },
  {
    name: "ENGINEERING",
    path: "/catalog/3bhk",
    background: "/engineeringhome.jpg",
    description:
      "Delivering strong, sustainable, and efficient construction and structural solutions.",
  },
];

const testimonials = [
  {
    name: "Riya Sharma",
    role: "Buyer, Kolkata",
    text:
      "Aten made our home redesign effortless — the team understood our needs and delivered a stunning result on schedule.",
  },
  {
    name: "Sourav Banerjee",
    role: "Developer Partner",
    text:
      "Reliable, professional and detail-oriented. Their project delivery and communication are excellent.",
  },
  {
    name: "Meera Patel",
    role: "Home-owner",
    text:
      "From design to execution, every step was handled with care. Highly recommended for modern interiors.",
  },
];

export default function InterioHome() {
  return (
    <div className="home-page">
      <header className="home-hero">
        <div className="hero-inner">
          <h1 className="hero-title">Design. Build. Thrive.</h1>
          <p className="hero-sub">
            Integrated solutions across Interiors, Realty and Engineering —
            crafted for modern living and lasting value.
          </p>
        </div>
      </header>

      <section className="service-grid-section">
        <div className="service-grid">
          {homeTypes.map((h) => (
            <Link
              key={h.name}
              to={h.path}
              className="service-card"
              style={{ backgroundImage: `url(${h.background})` }}
            >
              <div className="service-overlay" />
              <div className="service-content">
                <div className="service-title">{h.name}</div>
                <div className="service-desc">{h.description}</div>
                <div className="service-cta">Explore {h.name.toLowerCase()}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="about-section panel-card">
        <div className="about-inner">
          <img src="/atenlogo.png" className="about-media" />
          <div className="about-content">
            <h2>About Aten</h2>
            <p>
              We bring together design, property expertise and engineering rigor to
              deliver spaces people love. From conceptual design to final handover,
              our integrated approach ensures aesthetics, performance and value.
            </p>
            <ul className="about-list">
              <li><strong>Design-led:</strong> Human-centred interiors that fit your lifestyle.</li>
              <li><strong>Market-smart:</strong> Realty solutions tailored to local markets.</li>
              <li><strong>Built to last:</strong> Engineering practices focused on durability.</li>
            </ul>
            <Link to="/about" className="btn-primary small">Learn more</Link>
          </div>
        </div>
      </section>

      <section className="testimonials-section panel-card">
        <h2>What our clients say</h2>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <figure className="testimonial-card" key={i}>
              <blockquote>{t.text}</blockquote>
              <figcaption>
                <strong>{t.name}</strong>
                <span className="muted"> — {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

    </div>
  );
}
