import { useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SKILL_OPTIONS = [
  { value: "login", label: "🔐 Login & Account Issues" },
  { value: "payment", label: "💳 Payment & Billing Issues" },
  { value: "technical", label: "🛠️ Technical / App Issues" },
  { value: "order", label: "📦 Order & Delivery Issues" },
  { value: "refund", label: "↩️ Refund & Cancellation Issues" },
];

const AgentLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", skill: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!form.skill) {
          setError("Please select your skill category.");
          setLoading(false);
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          name: form.name,
          email: form.email,
          role: "agent",
          skill: form.skill,
          isAvailable: true,
          createdAt: new Date(),
        });
        navigate("/agent/dashboard");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        if (userDoc.exists() && userDoc.data().role === "agent") {
          navigate("/agent/dashboard");
        } else {
          setError("Access denied. Please use the customer login.");
          await auth.signOut();
        }
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth.*\)/, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-mesh" />
      <div className="auth-page">
        <div className="auth-container">

          {/* Brand */}
          <div className="brand">
            <div className="brand-icon" style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}>
              🎧
            </div>
            <h1 style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SupportDesk
            </h1>
            <p>Smart customer support platform</p>
          </div>

          {/* Card */}
          <div className="card">
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <span className="role-badge role-agent">🎧 Agent Portal</span>
            </div>

            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>
              {isRegister ? "Agent Registration" : "Agent Sign In"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
              {isRegister
                ? "Register as a support agent and set your skill"
                : "Sign in to access your agent dashboard"}
            </p>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    className="form-input" type="text" name="name"
                    placeholder="Agent full name"
                    value={form.name} onChange={handleChange} required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  className="form-input" type="email" name="email"
                  placeholder="agent@company.com"
                  value={form.email} onChange={handleChange} required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  className="form-input" type="password" name="password"
                  placeholder="••••••••"
                  value={form.password} onChange={handleChange} required
                />
              </div>

              {isRegister && (
                <div className="form-group">
                  <label>Your Skill Category</label>
                  <select
                    className="form-input" name="skill"
                    value={form.skill} onChange={handleChange}
                    required
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">-- Select your skill --</option>
                    {SKILL_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="btn btn-primary" type="submit" disabled={loading}
                style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
              >
                {loading && <span className="spinner" />}
                {loading ? "Please wait..." : isRegister ? "Register as Agent" : "Sign In"}
              </button>
            </form>

            <div className="divider">or</div>

            <button
              className="btn btn-outline"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
            >
              {isRegister ? "Already registered? Sign In" : "New agent? Register here"}
            </button>

            <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Are you a customer?{" "}
              <a href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>
                Customer Login →
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentLogin;