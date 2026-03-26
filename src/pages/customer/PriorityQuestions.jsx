import { useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const QUESTIONS = [
  { id: 1, text: "Is your issue preventing you from using the system completely?", icon: "🚫" },
  { id: 2, text: "Have you been waiting for a resolution for more than 24 hours?", icon: "⏳" },
  { id: 3, text: "Is your issue related to payment or financial loss?", icon: "💳" },
];

const SKILL_OPTIONS = [
  { value: "login", label: "🔐 Login / Account" },
  { value: "payment", label: "💳 Payment / Billing" },
  { value: "technical", label: "🛠️ Technical / App" },
  { value: "order", label: "📦 Order / Delivery" },
  { value: "refund", label: "↩️ Refund / Cancellation" },
];

const PriorityQuestions = () => {
  const [answers, setAnswers] = useState({});
  const [skillAnswer, setSkillAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const calculatePriority = () => {
    const points = Object.values(answers).filter((a) => a === "yes").length;
    if (points > 2) return { level: "High", badge: "priority-high", emoji: "🔴", points };
    if (points === 2) return { level: "Medium", badge: "priority-medium", emoji: "🟡", points };
    return { level: "Low", badge: "priority-low", emoji: "🟢", points };
  };

  const allAnswered = Object.keys(answers).length === QUESTIONS.length && skillAnswer !== "";

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setLoading(true);
    const priority = calculatePriority();
    const user = auth.currentUser;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        priority: priority.level,
        skill: skillAnswer,
        priorityPoints: priority.points,
        answers: answers,
        status: "waiting",
        assignedAgent: null,
        updatedAt: new Date(),
      });
      setResult(priority);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    return (
      <>
        <div className="bg-mesh" />
        <div className="auth-page">
          <div className="auth-container" style={{ maxWidth: "480px" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{result.emoji}</div>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Priority Assigned!</h2>
              <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                Based on your answers, you have been assigned:
              </p>
              <div style={{ marginBottom: "1.5rem" }}>
                <span className={`role-badge ${result.badge}`} style={{ fontSize: "1rem", padding: "0.5rem 1.5rem" }}>
                  {result.emoji} {result.level} Priority
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
                Score: <strong style={{ color: "var(--text)" }}>{result.points} / 3 points</strong>
                <br />You will be connected to the best available agent for your issue.
              </p>
              <button className="btn btn-primary" onClick={() => navigate("/customer/chat")}>
                Start Chat Session →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-mesh" />
      <div className="auth-page" style={{ alignItems: "flex-start", paddingTop: "3rem" }}>
        <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto", animation: "fadeSlideUp 0.5s ease" }}>

          <div className="brand" style={{ marginBottom: "1.5rem" }}>
            <div className="brand-icon">📋</div>
            <h1>Priority Assessment</h1>
            <p>Answer a few questions so we can help you faster</p>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              <span>Progress</span>
              <span>{Object.keys(answers).length + (skillAnswer ? 1 : 0)} / {QUESTIONS.length + 1} answered</span>
            </div>
            <div style={{ height: "4px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${((Object.keys(answers).length + (skillAnswer ? 1 : 0)) / (QUESTIONS.length + 1)) * 100}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          {/* Yes/No Questions */}
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="card" style={{ marginBottom: "1rem", padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{q.icon}</span>
                <div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                    Question {i + 1}
                  </p>
                  <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>{q.text}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["yes", "no"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(q.id, opt)}
                    style={{
                      flex: 1, padding: "0.65rem",
                      border: `1px solid ${answers[q.id] === opt ? opt === "yes" ? "var(--accent)" : "rgba(148,163,184,0.4)" : "var(--border)"}`,
                      borderRadius: "10px",
                      background: answers[q.id] === opt ? opt === "yes" ? "rgba(56,189,248,0.15)" : "rgba(148,163,184,0.1)" : "transparent",
                      color: answers[q.id] === opt ? opt === "yes" ? "var(--accent)" : "var(--text-muted)" : "var(--text-muted)",
                      cursor: "pointer",
                      fontFamily: "'Syne', sans-serif", fontWeight: "700", fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {opt === "yes" ? "✓ Yes" : "✗ No"}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Skill Question */}
          <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🛠️</span>
              <div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                  Issue Type
                </p>
                <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>What type of issue are you facing?</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              {SKILL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSkillAnswer(opt.value)}
                  style={{
                    padding: "0.65rem 0.5rem",
                    border: `1px solid ${skillAnswer === opt.value ? "var(--accent2)" : "var(--border)"}`,
                    borderRadius: "10px",
                    background: skillAnswer === opt.value ? "rgba(129,140,248,0.15)" : "transparent",
                    color: skillAnswer === opt.value ? "var(--accent2)" : "var(--text-muted)",
                    cursor: "pointer", fontSize: "0.82rem",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s ease", textAlign: "center",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            style={{ opacity: allAnswered ? 1 : 0.5, cursor: allAnswered ? "pointer" : "not-allowed" }}
          >
            {loading && <span className="spinner" />}
            {loading ? "Assigning priority..." : "Submit & Get Priority →"}
          </button>
        </div>
      </div>
    </>
  );
};

export default PriorityQuestions;