import { useState, useEffect } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SKILL_LABELS = {
  login: "🔐 Login & Account",
  payment: "💳 Payment & Billing",
  technical: "🛠️ Technical / App",
  order: "📦 Order & Delivery",
  refund: "↩️ Refund & Cancellation",
};

const AgentDashboard = () => {
  const [agentData, setAgentData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("waiting");
  const navigate = useNavigate();

  // Load agent profile
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate("/agent/login"); return; }
    const fetchAgent = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setAgentData({ id: user.uid, ...data });
      }
    };
    fetchAgent();
  }, []);

  // Load customers — only after agentData is ready and skill exists
  useEffect(() => {
    if (!agentData) return;
    if (!agentData.skill) {
      setLoading(false);
      return;
    }

    // Simple query — only filter by role and skill
    // We filter escalatedToHuman in frontend to avoid index error
    const q = query(
      collection(db, "users"),
      where("role", "==", "customer"),
      where("skill", "==", agentData.skill),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filter escalated customers in frontend
      const escalatedList = list.filter(
        (c) => c.escalatedToHuman === true || c.status === "waiting" || c.status === "assigned"
      );

      // Sort by priority High first then Medium then Low
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      escalatedList.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

      setCustomers(escalatedList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [agentData]);

  const handleAssign = async (customerId) => {
    try {
      await updateDoc(doc(db, "users", customerId), {
        assignedAgent: agentData.id,
        assignedAgentName: agentData.name,
        status: "assigned",
      });
      navigate(`/agent/chat/${customerId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/agent/login");
  };

  const waitingCustomers = customers.filter(
    (c) => c.status === "waiting" && c.escalatedToHuman === true
  );

  const assignedCustomers = customers.filter(
    (c) => c.assignedAgent === agentData?.id && c.status === "assigned"
  );

  const displayList = activeTab === "waiting" ? waitingCustomers : assignedCustomers;

  const getPriorityStyle = (priority) => {
    if (priority === "High") return { badge: "priority-high", emoji: "🔴" };
    if (priority === "Medium") return { badge: "priority-medium", emoji: "🟡" };
    return { badge: "priority-low", emoji: "🟢" };
  };

  return (
    <>
      <div className="bg-mesh" />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

        {/* Navbar */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 2rem",
          background: "rgba(15,23,42,0.8)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "linear-gradient(135deg, var(--accent2), #c084fc)",
              borderRadius: "10px", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "1.1rem",
            }}>🎧</div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>SupportDesk</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Agent Dashboard</p>
            </div>
          </div>

          {agentData && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>{agentData.name}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {SKILL_LABELS[agentData.skill] || "No skill assigned"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.4rem 0.9rem", borderRadius: "8px",
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >Sign Out</button>
            </div>
          )}
        </nav>

        {/* No skill warning */}
        {agentData && !agentData.skill && (
          <div style={{
            margin: "2rem", padding: "1.5rem",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "12px", textAlign: "center",
          }}>
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</p>
            <p style={{ color: "var(--danger)", fontWeight: 600 }}>No skill assigned to your account</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Please sign out and register again with a skill category selected.
            </p>
            <button
              onClick={handleLogout}
              className="btn btn-primary"
              style={{ width: "auto", padding: "0.5rem 1.5rem", marginTop: "1rem" }}
            >
              Sign Out & Re-register
            </button>
          </div>
        )}

        {/* Main Content */}
        {agentData && agentData.skill && (
          <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Waiting", value: waitingCustomers.length, color: "var(--accent)", icon: "⏳" },
                { label: "My Active", value: assignedCustomers.length, color: "var(--accent2)", icon: "💬" },
                { label: "High Priority", value: waitingCustomers.filter(c => c.priority === "High").length, color: "var(--danger)", icon: "🔴" },
              ].map((stat) => (
                <div key={stat.label} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>{stat.icon}</p>
                  <p style={{ fontSize: "2rem", fontFamily: "'Syne', sans-serif", fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {[
                { key: "waiting", label: `⏳ Waiting (${waitingCustomers.length})` },
                { key: "assigned", label: `💬 My Chats (${assignedCustomers.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "0.6rem 1.2rem", borderRadius: "10px", cursor: "pointer",
                    fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.85rem",
                    border: activeTab === tab.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: activeTab === tab.key ? "rgba(56,189,248,0.15)" : "transparent",
                    color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Customer List */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                <div className="spinner" style={{ width: "32px", height: "32px", borderTopColor: "var(--accent)", margin: "0 auto 1rem" }} />
                <p>Loading customers...</p>
              </div>
            ) : displayList.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  {activeTab === "waiting" ? "🎉" : "💤"}
                </p>
                <p style={{ color: "var(--text-muted)" }}>
                  {activeTab === "waiting"
                    ? "No customers waiting right now"
                    : "You have no active chats"}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  Customers will appear here after AI chatbot escalates their issue
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {displayList.map((customer, i) => {
                  const ps = getPriorityStyle(customer.priority);
                  return (
                    <div
                      key={customer.id}
                      className="card"
                      style={{
                        padding: "1.25rem 1.5rem",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        animation: `fadeSlideUp 0.4s ease ${i * 0.07}s both`,
                      }}
                    >
                      {/* Left */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                          width: "44px", height: "44px", borderRadius: "12px",
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1rem",
                          color: "var(--primary)", flexShrink: 0,
                        }}>
                          {(customer.name || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.3rem" }}>
                            {customer.name || "Customer"}
                          </p>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span className={`role-badge ${ps.badge}`} style={{ fontSize: "0.7rem" }}>
                              {ps.emoji} {customer.priority} Priority
                            </span>
                            <span className="role-badge role-customer" style={{ fontSize: "0.7rem" }}>
                              {SKILL_LABELS[customer.skill] || customer.skill}
                            </span>
                            <span style={{
                              fontSize: "0.7rem", padding: "0.3rem 0.75rem",
                              borderRadius: "20px", fontWeight: 600,
                              background: "rgba(129,140,248,0.15)",
                              color: "var(--accent2)",
                              border: "1px solid rgba(129,140,248,0.3)",
                            }}>
                              🤖 AI Escalated
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ textAlign: "right", marginRight: "0.5rem" }}>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Points</p>
                          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--text)" }}>
                            {customer.priorityPoints ?? "-"} / 3
                          </p>
                        </div>

                        {activeTab === "waiting" ? (
                          <button
                            onClick={() => handleAssign(customer.id)}
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.5rem 1.1rem", fontSize: "0.82rem", marginTop: 0 }}
                          >
                            Accept →
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/agent/chat/${customer.id}`)}
                            className="btn btn-primary"
                            style={{
                              width: "auto", padding: "0.5rem 1.1rem", fontSize: "0.82rem", marginTop: 0,
                              background: "linear-gradient(135deg, var(--accent2), #c084fc)",
                            }}
                          >
                            Open Chat →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AgentDashboard;