import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

const Navbar = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
    };
    fetchUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    if (userData?.role === "agent") {
      navigate("/agent/login");
    } else {
      navigate("/");
    }
  };

  const isAgent = userData?.role === "agent";
  const isCustomer = userData?.role === "customer";

  const getPriorityStyle = (priority) => {
    if (priority === "High") return { badge: "priority-high", emoji: "🔴" };
    if (priority === "Medium") return { badge: "priority-medium", emoji: "🟡" };
    return { badge: "priority-low", emoji: "🟢" };
  };

  const SKILL_LABELS = {
    login: "🔐 Login & Account",
    payment: "💳 Payment & Billing",
    technical: "🛠️ Technical / App",
    order: "📦 Order & Delivery",
    refund: "↩️ Refund & Cancellation",
  };

  if (!userData) return null;

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1rem 2rem",
      background: "rgba(15,23,42,0.85)",
      borderBottom: "1px solid var(--border)",
      backdropFilter: "blur(20px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Left - Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
        onClick={() => navigate(isAgent ? "/agent/dashboard" : "/customer/chat")}
      >
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: isAgent
            ? "linear-gradient(135deg, #818cf8, #c084fc)"
            : "linear-gradient(135deg, var(--accent), var(--accent2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem",
        }}>
          {isAgent ? "🎧" : "💬"}
        </div>
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
            SupportDesk
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {isAgent ? "Agent Dashboard" : "Customer Support"}
          </p>
        </div>
      </div>

      {/* Middle - Navigation Links (Agent only) */}
      {isAgent && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { path: "/agent/dashboard", label: "📋 Dashboard" },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                padding: "0.4rem 0.9rem", borderRadius: "8px", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                border: location.pathname === link.path
                  ? "1px solid var(--accent2)"
                  : "1px solid var(--border)",
                background: location.pathname === link.path
                  ? "rgba(129,140,248,0.15)"
                  : "transparent",
                color: location.pathname === link.path
                  ? "var(--accent2)"
                  : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {/* Right - User Info + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

        {/* Role Badge */}
        <span className={`role-badge ${isAgent ? "role-agent" : "role-customer"}`} style={{ fontSize: "0.7rem" }}>
          {isAgent ? "🎧 Agent" : "👤 Customer"}
        </span>

        {/* Priority Badge (customer only) */}
        {isCustomer && userData.priority && (
          <span
            className={`role-badge ${getPriorityStyle(userData.priority).badge}`}
            style={{ fontSize: "0.7rem" }}
          >
            {getPriorityStyle(userData.priority).emoji} {userData.priority} Priority
          </span>
        )}

        {/* Skill Badge (agent only) */}
        {isAgent && userData.skill && (
          <span style={{
            fontSize: "0.7rem", color: "var(--text-muted)",
            display: "none",
          }}>
            {SKILL_LABELS[userData.skill]}
          </span>
        )}

        {/* User Name */}
        <div style={{
          padding: "0.35rem 0.8rem",
          borderRadius: "8px",
          background: "rgba(148,163,184,0.08)",
          border: "1px solid var(--border)",
        }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 500 }}>{userData.name}</p>
          {isAgent && (
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {SKILL_LABELS[userData.skill]}
            </p>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            padding: "0.4rem 0.9rem", borderRadius: "8px",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = "var(--danger)";
            e.target.style.color = "var(--danger)";
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.color = "var(--text-muted)";
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;