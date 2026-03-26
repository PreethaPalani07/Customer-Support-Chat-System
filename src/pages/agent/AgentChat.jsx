import { useState, useEffect, useRef } from "react";
import { auth, db, realtimeDb } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, push, onValue } from "firebase/database";
import { useNavigate, useParams } from "react-router-dom";

const SKILL_LABELS = {
  login: "🔐 Login & Account",
  payment: "💳 Payment & Billing",
  technical: "🛠️ Technical / App",
  order: "📦 Order & Delivery",
  refund: "↩️ Refund & Cancellation",
};

const AgentChat = () => {
  const { customerId } = useParams();
  const [agentData, setAgentData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [resolved, setResolved] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user) { navigate("/agent/login"); return; }
    const loadData = async () => {
      const [agentSnap, customerSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "users", customerId)),
      ]);
      if (agentSnap.exists()) setAgentData({ id: user.uid, ...agentSnap.data() });
      if (customerSnap.exists()) setCustomerData({ id: customerId, ...customerSnap.data() });
    };
    loadData();
  }, []);

  useEffect(() => {
    const chatRef = ref(realtimeDb, `chats/${customerId}`);
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [customerId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const chatRef = ref(realtimeDb, `chats/${customerId}`);
    await push(chatRef, {
      text: input.trim(),
      sender: "agent",
      senderName: agentData?.name || "Agent",
      timestamp: Date.now(),
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleResolve = async () => {
    try {
      await updateDoc(doc(db, "users", customerId), {
        status: "resolved",
        assignedAgent: null,
        assignedAgentName: null,
        resolvedAt: new Date(),
      });
      setResolved(true);
      setTimeout(() => navigate("/agent/dashboard"), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getPriorityStyle = (priority) => {
    if (priority === "High") return { badge: "priority-high", emoji: "🔴" };
    if (priority === "Medium") return { badge: "priority-medium", emoji: "🟡" };
    return { badge: "priority-low", emoji: "🟢" };
  };

  if (resolved) {
    return (
      <>
        <div className="bg-mesh" />
        <div className="auth-page">
          <div className="card" style={{ textAlign: "center", maxWidth: "400px" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</p>
            <h2>Issue Resolved!</h2>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-mesh" />

      {/* Image Modal */}
      {imageModal && (
        <div
          onClick={() => setImageModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "2rem", cursor: "pointer",
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={imageModal}
              alt="full view"
              style={{
                maxWidth: "100%", maxHeight: "85vh",
                borderRadius: "12px", display: "block",
              }}
            />
            <button
              onClick={() => setImageModal(null)}
              style={{
                position: "absolute", top: "-12px", right: "-12px",
                width: "32px", height: "32px", borderRadius: "50%",
                border: "none", background: "var(--danger)",
                color: "white", cursor: "pointer", fontSize: "1rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            <a
              href={imageModal}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", bottom: "-44px", left: "50%",
                transform: "translateX(-50%)",
                padding: "0.5rem 1.5rem", borderRadius: "10px",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: "var(--primary)", textDecoration: "none",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              ⬇️ Download Image
            </a>
          </div>
        </div>
      )}

      <div style={{
        position: "relative", zIndex: 1,
        height: "100vh", display: "flex", flexDirection: "column"
      }}>

        {/* Navbar */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "rgba(15,23,42,0.9)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(20px)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => navigate("/agent/dashboard")}
              style={{
                padding: "0.4rem 0.8rem", borderRadius: "8px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >← Back</button>

            {customerData && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Syne', sans-serif", fontWeight: 800,
                  color: "var(--primary)", fontSize: "1rem",
                }}>
                  {(customerData.name || "C")[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {customerData.name}
                  </p>
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem" }}>
                    <span
                      className={`role-badge ${getPriorityStyle(customerData.priority).badge}`}
                      style={{ fontSize: "0.65rem" }}
                    >
                      {getPriorityStyle(customerData.priority).emoji} {customerData.priority} Priority
                    </span>
                    <span className="role-badge role-customer" style={{ fontSize: "0.65rem" }}>
                      {SKILL_LABELS[customerData.skill]}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleResolve}
            style={{
              padding: "0.5rem 1.1rem", borderRadius: "10px",
              border: "1px solid rgba(52,211,153,0.4)",
              background: "rgba(52,211,153,0.1)",
              color: "var(--success)", cursor: "pointer",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "0.82rem", transition: "all 0.2s",
            }}
          >
            ✓ Mark Resolved
          </button>
        </nav>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "1.5rem",
          display: "flex", flexDirection: "column", gap: "0.75rem"
        }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <span style={{
              fontSize: "0.75rem", color: "var(--text-muted)",
              background: "rgba(148,163,184,0.08)",
              padding: "0.3rem 0.9rem", borderRadius: "20px",
              border: "1px solid var(--border)",
            }}>
              Chatting with {customerData?.name} • {customerData?.priority} Priority
            </span>
          </div>

          {messages.length === 0 && (
            <div style={{
              textAlign: "center", marginTop: "3rem",
              color: "var(--text-muted)"
            }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</p>
              <p>No messages yet. Send a greeting to start!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isAgent = msg.sender === "agent";
            const isBot = msg.sender === "bot";

            return (
              <div key={msg.id} style={{
                display: "flex",
                justifyContent: isAgent ? "flex-end" : "flex-start",
                animation: "fadeSlideUp 0.3s ease",
              }}>
                <div style={{ maxWidth: "70%" }}>
                  {!isAgent && (
                    <p style={{
                      fontSize: "0.72rem",
                      color: isBot ? "var(--success)" : "var(--text-muted)",
                      marginBottom: "0.3rem", paddingLeft: "0.5rem"
                    }}>
                      {isBot ? "🤖 AI Assistant" : `👤 ${msg.senderName}`}
                    </p>
                  )}

                  {/* Image message */}
                  {msg.isImage && msg.fileURL ? (
                    <div style={{
                      borderRadius: isAgent
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      maxWidth: "280px",
                      cursor: "pointer",
                    }}
                      onClick={() => setImageModal(msg.fileURL)}
                    >
                      <img
                        src={msg.fileURL}
                        alt="uploaded"
                        style={{ width: "100%", display: "block" }}
                      />
                      <div style={{
                        padding: "0.5rem 0.75rem",
                        background: isAgent
                          ? "linear-gradient(135deg, var(--accent2), #c084fc)"
                          : "rgba(30,41,59,0.9)",
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span style={{
                          fontSize: "0.75rem",
                          color: isAgent ? "white" : "var(--text-muted)",
                        }}>
                          📷 Click to view full image
                        </span>
                        <a
                          href={msg.fileURL}
                          download
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: "0.72rem",
                            color: isAgent ? "white" : "var(--accent)",
                            textDecoration: "none",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.15)",
                          }}
                        >
                          ⬇️ Save
                        </a>
                      </div>
                    </div>

                  ) : msg.fileURL ? (
                    /* File message */
                    <a
                      href={msg.fileURL}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <div style={{
                        padding: "0.75rem 1rem",
                        borderRadius: isAgent
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: isAgent
                          ? "linear-gradient(135deg, var(--accent2), #c084fc)"
                          : "rgba(30,41,59,0.9)",
                        border: isAgent ? "none" : "1px solid var(--border)",
                        color: isAgent ? "white" : "var(--text)",
                        display: "flex", alignItems: "center",
                        gap: "0.75rem", cursor: "pointer",
                      }}>
                        <span style={{ fontSize: "1.8rem" }}>📎</span>
                        <div>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {msg.fileName}
                          </p>
                          <p style={{ fontSize: "0.72rem", opacity: 0.7 }}>
                            Click to view / download
                          </p>
                        </div>
                        <span style={{
                          marginLeft: "auto", fontSize: "1.2rem",
                          opacity: 0.8,
                        }}>⬇️</span>
                      </div>
                    </a>

                  ) : (
                    /* Text message */
                    <div style={{
                      padding: "0.75rem 1rem",
                      borderRadius: isAgent
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      background: isAgent
                        ? "linear-gradient(135deg, var(--accent2), #c084fc)"
                        : isBot
                          ? "rgba(52,211,153,0.1)"
                          : "rgba(30,41,59,0.9)",
                      border: isAgent ? "none" : isBot
                        ? "1px solid rgba(52,211,153,0.3)"
                        : "1px solid var(--border)",
                      color: isAgent ? "white" : "var(--text)",
                      fontSize: "0.9rem", lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.text}
                    </div>
                  )}

                  <p style={{
                    fontSize: "0.68rem", color: "var(--text-muted)",
                    marginTop: "0.25rem",
                    textAlign: isAgent ? "right" : "left",
                  }}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "1rem 1.5rem",
          background: "rgba(15,23,42,0.9)",
          borderTop: "1px solid var(--border)",
          backdropFilter: "blur(20px)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={1}
              style={{
                flex: 1, background: "rgba(30,41,59,0.8)",
                border: "1px solid var(--border)", borderRadius: "14px",
                padding: "0.8rem 1rem", color: "var(--text)",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                outline: "none", resize: "none",
                maxHeight: "120px", lineHeight: "1.5",
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent2)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: "46px", height: "46px", borderRadius: "12px",
                border: "none",
                background: input.trim()
                  ? "linear-gradient(135deg, var(--accent2), #c084fc)"
                  : "var(--border)",
                color: input.trim() ? "white" : "var(--text-muted)",
                cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: "1.2rem", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, transition: "all 0.2s",
              }}
            >➤</button>
          </div>
          <p style={{
            fontSize: "0.7rem", color: "var(--text-muted)",
            marginTop: "0.5rem", textAlign: "center"
          }}>
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
};

export default AgentChat;