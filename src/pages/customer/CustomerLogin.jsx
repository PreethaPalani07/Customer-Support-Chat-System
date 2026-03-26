import { useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const CustomerLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
        const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          name: form.name,
          email: form.email,
          role: "customer",
          createdAt: new Date(),
        });
        navigate("/customer/questions");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
        const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
        if (userDoc.exists() && userDoc.data().role === "customer") {
          navigate("/customer/questions");
        } else {
          setError("Access denied. Please use the agent login.");
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
          <div className="brand">
            <div className="brand-icon">💬</div>
            <h1>SupportDesk</h1>
            <p>Smart customer support platform</p>
          </div>

          <div className="card">
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <span className="role-badge role-customer">👤 Customer Portal</span>
            </div>

            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>
              {isRegister ? "Create Account" : "Welcome Back"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
              {isRegister ? "Register to get support from our team" : "Sign in to continue to your support session"}
            </p>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    className="form-input" type="text" name="name"
                    placeholder="Enter your full name"
                    value={form.name} onChange={handleChange} required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input
                  className="form-input" type="email" name="email"
                  placeholder="you@example.com"
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
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="divider">or</div>

            <button
              className="btn btn-outline"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
            >
              {isRegister ? "Already have an account? Sign In" : "New here? Create an account"}
            </button>

            <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Are you a support agent?{" "}
              <a href="/agent/login" style={{ color: "var(--accent2)", textDecoration: "none" }}>
                Agent Login →
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerLogin;