import { useState, useEffect, useRef } from "react";
import { auth, db, realtimeDb } from "../../firebase/firebaseConfig";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, push, onValue } from "firebase/database";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../../cloudinary/cloudinaryConfig";

const SKILL_LABELS = {
  login: "🔐 Login & Account",
  payment: "💳 Payment & Billing",
  technical: "🛠️ Technical / App",
  order: "📦 Order & Delivery",
  refund: "↩️ Refund & Cancellation",
};


const RULES = [
  
  {
    keywords: ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "howdy", "hii", "helo"],
    response: (name) => `👋 Hi ${name}! Welcome to SupportDesk. I am your AI support assistant. How can I help you today? Please describe your issue and I will do my best to assist you! 😊`,
    escalate: false,
  },
 
  {
    keywords: ["how are you", "how r u", "how are u", "what are you", "who are you"],
    response: () => `I am your AI support assistant at SupportDesk! I am here to help you with any issues you have. What can I help you with today? 😊`,
    escalate: false,
  },
 
  {
    keywords: ["thank you", "thanks", "thank u", "thankyou", "ty", "thx"],
    response: () => `You are welcome! 😊 I am glad I could help. Is there anything else you need help with?`,
    escalate: false,
  },
 
  {
    keywords: ["bye", "goodbye", "see you", "take care", "cya"],
    response: () => `Goodbye! 👋 Have a wonderful day! Feel free to come back anytime if you need help. 😊`,
    escalate: false,
  },
 
  {
    keywords: ["ok", "okay", "got it", "alright", "sure", "fine", "understood"],
    response: () => `Great! Is there anything else I can help you with? 😊`,
    escalate: false,
  },

  {
    keywords: ["yes", "yeah", "yep", "yup", "solved", "fixed", "resolved", "working", "works"],
    response: () => `✅ That is great to hear! I am glad your issue is resolved. Have a wonderful day! Feel free to come back anytime if you need more help. 😊`,
    escalate: false,
  },

  {
    keywords: ["password", "forgot password", "reset password", "change password"],
    response: () => `To reset your password:\n1. Click on 'Forgot Password' on the login page\n2. Enter your registered email address\n3. Check your email for the reset link\n4. Click the link and set a new password\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["login", "sign in", "cannot login", "cant login", "unable to login", "login problem", "login issue", "not able to login"],
    response: () => `Here are some steps to fix login issues:\n1. Make sure you are using the correct email and password\n2. Check if Caps Lock is turned on\n3. Try clearing your browser cache\n4. Try resetting your password\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["account", "locked", "blocked", "suspended", "deactivated"],
    response: () => `If your account is locked or suspended:\n1. Wait for 30 minutes and try again\n2. Make sure you have not violated any terms\n3. Check your email for any notifications\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  
  {
    keywords: ["payment", "pay", "paying", "paid", "transaction", "billing", "charge", "charged", "deducted"],
    response: () => `For payment related issues:\n1. Check if your bank account has sufficient balance\n2. Make sure your card details are correct\n3. Try a different payment method\n4. Check if your bank is blocking the transaction\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["refund", "money back", "return money", "cashback", "reimbursement"],
    response: () => `For refund requests:\n1. Refunds are processed within 5-7 business days\n2. Check your bank account after 7 days\n3. Make sure the refund request was submitted correctly\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["invoice", "receipt", "bill", "billing statement"],
    response: () => `To get your invoice or receipt:\n1. Go to My Account\n2. Click on Order History\n3. Find your order and click Download Invoice\n\nDid this solve your issue? ✅`,
    escalate: false,
  },

  {
    keywords: ["app", "crash", "crashing", "not working", "not opening", "stopped working"],
    response: () => `To fix app issues:\n1. Clear your browser cache and cookies\n2. Try refreshing the page\n3. Try using a different browser\n4. Reinstall the app if on mobile\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["slow", "loading", "not loading", "taking long", "speed", "lagging"],
    response: () => `To fix slow loading issues:\n1. Check your internet connection\n2. Try refreshing the page\n3. Clear your browser cache\n4. Try switching to a different network\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["error", "bug", "glitch", "problem", "issue", "not working properly"],
    response: () => `To fix errors:\n1. Try refreshing the page\n2. Clear your browser cache\n3. Try using a different browser\n4. Make sure your app is updated\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  
  {
    keywords: ["order", "track", "tracking", "delivery", "shipment", "where is my order", "parcel"],
    response: () => `To track your order:\n1. Go to My Account\n2. Click on Orders\n3. Click Track Order\n4. You will see real time tracking information\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["cancel", "cancellation", "cancel order", "stop order"],
    response: () => `To cancel your order:\n1. Go to My Account\n2. Click on Orders\n3. Find your order and click Cancel\n4. Orders can only be cancelled within 24 hours of placing\n\nDid this solve your issue? ✅`,
    escalate: false,
  },
  {
    keywords: ["wrong item", "wrong product", "incorrect item", "different item", "not what i ordered"],
    response: () => `If you received a wrong item:\n1. Take a clear photo of the item received\n2. Go to My Account → Orders → Report Issue\n3. Upload the photo and describe the issue\n4. Our team will process a replacement within 2-3 days\n\nDid this solve your issue? ✅`,
    escalate: false,
  },

  {
    keywords: ["no", "nope", "not solved", "not fixed", "still", "not working", "not helpful", "not useful", "doesnt work", "doesn't work", "did not work", "didnt work"],
    response: () => `I understand your issue is not resolved yet. Let me connect you to a human agent who can help you better. Please wait a moment... 🎧`,
    escalate: true,
  },

  {
    keywords: ["human", "agent", "person", "representative", "support agent", "real person", "talk to someone", "speak to agent"],
    response: () => `Sure! Let me connect you to a human support agent right away. Please wait a moment... 🎧`,
    escalate: true,
  },
];


const getRuleBasedResponse = (message, customerName) => {
  const lowerMessage = message.toLowerCase().trim();

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => lowerMessage.includes(keyword))) {
      return {
        response: rule.response(customerName),
        escalate: rule.escalate,
      };
    }
  }

  return null;
};

const CustomerChat = () => {
  const [customerData, setCustomerData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState("bot");
  const [botTyping, setBotTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [escalating, setEscalating] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen to customer profile
  useEffect(() => {
    if (!user) { navigate("/"); return; }
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomerData({ id: user.uid, ...data });
        if (data.status === "assigned") {
          setChatMode("human");
          setEscalating(false);
        }
      }
    });
    return () => unsub();
  }, []);

  // Listen to realtime messages
  useEffect(() => {
    if (!user) return;
    const chatRef = ref(realtimeDb, `chats/${user.uid}`);
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([key, val]) => ({
          id: key, ...val
        }));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
      } else {
        if (!welcomeSent) {
          setWelcomeSent(true);
          setTimeout(async () => {
            await addBotMessage("👋 Hi! I am your AI support assistant. I can help you with login, payment, technical, order and refund issues. Please describe your issue and I will help you right away! 😊");
          }, 500);
        }
      }
    });
    return () => unsub();
  }, []);

  const addBotMessage = async (text) => {
    const chatRef = ref(realtimeDb, `chats/${user.uid}`);
    await push(chatRef, {
      text,
      sender: "bot",
      senderName: "AI Assistant",
      timestamp: Date.now(),
    });
  };

  // Auto escalate to human agent with same skill
  const autoEscalateToHuman = async () => {
    if (escalating || chatMode === "human") return;
    setEscalating(true);
    try {
      await addBotMessage("🔄 Automatically connecting you to a human support agent who specializes in your issue. Please wait...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await addBotMessage(`🎧 Connecting you to a ${SKILL_LABELS[customerData?.skill]} specialist now. They will be with you shortly!`);
      await updateDoc(doc(db, "users", user.uid), {
        status: "waiting",
        escalatedToHuman: true,
        escalatedAt: new Date(),
        chatMode: "human",
      });
      setChatMode("human");
    } catch (err) {
      console.error(err);
      setEscalating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");

    // Send customer message
    const chatRef = ref(realtimeDb, `chats/${user.uid}`);
    await push(chatRef, {
      text: userMessage,
      sender: "customer",
      senderName: customerData?.name || "Customer",
      timestamp: Date.now(),
    });

    // If human mode just send message no bot processing
    if (chatMode === "human") return;

    // Process with rule based bot
    setBotTyping(true);

    setTimeout(async () => {
      const result = getRuleBasedResponse(
        userMessage,
        customerData?.name || "Customer"
      );

      setBotTyping(false);

      if (result) {
        // Rule matched
        await addBotMessage(result.response);
        setFailCount(0);

        if (result.escalate) {
          setTimeout(async () => {
            await autoEscalateToHuman();
          }, 1500);
        }
      } else {
        // No rule matched
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);

        if (newFailCount >= 2) {
          // Auto escalate after 2 failed attempts
          await addBotMessage("I was unable to find a solution for your issue after multiple attempts. Let me connect you to a human agent who can help you better. 🎧");
          setTimeout(async () => {
            await autoEscalateToHuman();
          }, 1500);
        } else {
          await addBotMessage(`I am sorry, I could not find an exact answer for that. Could you please describe your issue in more detail? For example:\n\n• What exactly is the problem?\n• When did it start?\n• What have you tried so far?\n\nI will try my best to help you! 😊`);
        }
      }
    }, 1500);
  };

  // Cloudinary file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Only images PDF TXT and DOC files are allowed");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const fileURL = response.secure_url;
          const isImage = file.type.startsWith("image/");

          const chatRef = ref(realtimeDb, `chats/${user.uid}`);
          await push(chatRef, {
            text: isImage ? "📷 Sent an image" : `📎 Sent a file: ${file.name}`,
            fileURL: fileURL,
            fileName: file.name,
            fileType: file.type,
            isImage: isImage,
            sender: "customer",
            senderName: customerData?.name || "Customer",
            timestamp: Date.now(),
          });

          setUploading(false);
          setUploadProgress(0);

          if (chatMode === "bot") {
            setBotTyping(true);
            setTimeout(async () => {
              setBotTyping(false);
              await addBotMessage("Thank you for sharing the file! This requires a human agent to review it properly. Let me connect you to a specialist right away.");
              await autoEscalateToHuman();
            }, 1000);
          }
        } else {
          console.error("Upload failed");
          setUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
        console.error("Upload error");
        setUploading(false);
      });

      xhr.open("POST", CLOUDINARY_UPLOAD_URL);
      xhr.send(formData);

    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit"
    });
  };

  const getPriorityStyle = (priority) => {
    if (priority === "High") return { badge: "priority-high", emoji: "🔴" };
    if (priority === "Medium") return { badge: "priority-medium", emoji: "🟡" };
    return { badge: "priority-low", emoji: "🟢" };
  };

  return (
    <>
      <div className="bg-mesh" />
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: chatMode === "bot"
                ? "linear-gradient(135deg, #34d399, #059669)"
                : "linear-gradient(135deg, var(--accent), var(--accent2))",
              borderRadius: "10px", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "1.1rem",
            }}>
              {chatMode === "bot" ? "🤖" : "💬"}
            </div>
            <div>
              <p style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700, fontSize: "0.95rem"
              }}>
                {chatMode === "bot" ? "AI Assistant" : "Support Chat"}
              </p>
              {chatMode === "bot" ? (
                <p style={{ fontSize: "0.7rem", color: "var(--success)" }}>
                  ● AI Chatbot Active
                </p>
              ) : customerData?.assignedAgent ? (
                <p style={{ fontSize: "0.7rem", color: "var(--success)" }}>
                  ● Connected with {customerData.assignedAgentName}
                </p>
              ) : (
                <p style={{ fontSize: "0.7rem", color: "var(--warning)" }}>
                  ⏳ Finding best agent for you...
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {customerData?.priority && (
              <span
                className={`role-badge ${getPriorityStyle(customerData.priority).badge}`}
                style={{ fontSize: "0.7rem" }}
              >
                {getPriorityStyle(customerData.priority).emoji} {customerData.priority} Priority
              </span>
            )}
            <span className="role-badge" style={{
              fontSize: "0.7rem",
              background: chatMode === "bot"
                ? "rgba(52,211,153,0.15)"
                : "rgba(56,189,248,0.15)",
              color: chatMode === "bot" ? "var(--success)" : "var(--accent)",
              border: `1px solid ${chatMode === "bot"
                ? "rgba(52,211,153,0.3)"
                : "rgba(56,189,248,0.3)"}`,
            }}>
              {chatMode === "bot" ? "🤖 AI Mode" : "🎧 Human Mode"}
            </span>
            <button onClick={handleLogout} style={{
              padding: "0.4rem 0.9rem", borderRadius: "8px",
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem",
              fontFamily: "'DM Sans', sans-serif",
            }}>Sign Out</button>
          </div>
        </nav>

        {/* Escalating Banner */}
        {escalating && !customerData?.assignedAgent && (
          <div style={{
            background: "rgba(129,140,248,0.08)",
            borderBottom: "1px solid rgba(129,140,248,0.2)",
            padding: "0.75rem 1.5rem",
            display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0,
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "var(--accent2)"
            }} />
            <p style={{ fontSize: "0.85rem", color: "var(--accent2)" }}>
              🔄 Finding a <strong>{SKILL_LABELS[customerData?.skill]}</strong> specialist for you...
            </p>
          </div>
        )}

        {/* Waiting for agent Banner */}
        {chatMode === "human" && !customerData?.assignedAgent && !escalating && (
          <div style={{
            background: "rgba(251,191,36,0.08)",
            borderBottom: "1px solid rgba(251,191,36,0.2)",
            padding: "0.75rem 1.5rem",
            display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0,
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "var(--warning)"
            }} />
            <p style={{ fontSize: "0.85rem", color: "var(--warning)" }}>
              ⏳ Waiting for a <strong>{SKILL_LABELS[customerData?.skill]}</strong> agent to accept...
            </p>
          </div>
        )}

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
              {chatMode === "bot"
                ? "🤖 AI Chatbot is handling your query"
                : "🎧 Transferred to Human Agent"}
            </span>
          </div>

          {messages.map((msg) => {
            const isCustomer = msg.sender === "customer";
            const isBot = msg.sender === "bot";
            return (
              <div key={msg.id} style={{
                display: "flex",
                justifyContent: isCustomer ? "flex-end" : "flex-start",
                animation: "fadeSlideUp 0.3s ease",
              }}>
                <div style={{ maxWidth: "72%" }}>
                  {!isCustomer && (
                    <p style={{
                      fontSize: "0.72rem",
                      color: isBot ? "var(--success)" : "var(--accent2)",
                      marginBottom: "0.3rem", paddingLeft: "0.5rem"
                    }}>
                      {isBot ? "🤖 AI Assistant" : `🎧 ${msg.senderName}`}
                    </p>
                  )}

                  {/* Image message */}
                  {msg.isImage && msg.fileURL ? (
                    <div style={{
                      borderRadius: isCustomer
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      maxWidth: "260px",
                    }}>
                      <img
                        src={msg.fileURL} alt="uploaded"
                        style={{ width: "100%", display: "block", cursor: "pointer" }}
                        onClick={() => window.open(msg.fileURL, "_blank")}
                      />
                      <div style={{
                        padding: "0.4rem 0.75rem",
                        background: isCustomer
                          ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                          : "rgba(30,41,59,0.9)",
                        fontSize: "0.75rem",
                        color: isCustomer ? "var(--primary)" : "var(--text-muted)",
                      }}>
                        📷 Click to view full image
                      </div>
                    </div>

                  ) : msg.fileURL ? (
                    <a
                      href={msg.fileURL}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <div style={{
                        padding: "0.75rem 1rem",
                        borderRadius: isCustomer
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: isCustomer
                          ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                          : "rgba(30,41,59,0.9)",
                        border: isCustomer ? "none" : "1px solid var(--border)",
                        color: isCustomer ? "var(--primary)" : "var(--text)",
                        display: "flex", alignItems: "center",
                        gap: "0.75rem", cursor: "pointer",
                      }}>
                        <span style={{ fontSize: "1.5rem" }}>📎</span>
                        <div>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {msg.fileName}
                          </p>
                          <p style={{ fontSize: "0.72rem", opacity: 0.7 }}>
                            Click to download
                          </p>
                        </div>
                      </div>
                    </a>

                  ) : (
                    <div style={{
                      padding: "0.75rem 1rem",
                      borderRadius: isCustomer
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      background: isCustomer
                        ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                        : isBot
                          ? "rgba(52,211,153,0.1)"
                          : "rgba(30,41,59,0.9)",
                      border: isCustomer ? "none" : isBot
                        ? "1px solid rgba(52,211,153,0.3)"
                        : "1px solid var(--border)",
                      color: isCustomer ? "var(--primary)" : "var(--text)",
                      fontSize: "0.9rem", lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.text}
                    </div>
                  )}

                  <p style={{
                    fontSize: "0.68rem", color: "var(--text-muted)",
                    marginTop: "0.25rem",
                    textAlign: isCustomer ? "right" : "left",
                  }}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Bot typing indicator */}
          {botTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "18px 18px 18px 4px",
                background: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.3)",
                display: "flex", gap: "0.3rem", alignItems: "center",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: "var(--success)",
                    animation: `spin 1s ease ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div style={{
            padding: "0.5rem 1.5rem",
            background: "rgba(15,23,42,0.9)",
            borderTop: "1px solid var(--border)", flexShrink: 0,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem"
            }}>
              <span>Uploading to Cloudinary...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{
              height: "4px", background: "var(--border)",
              borderRadius: "4px", overflow: "hidden"
            }}>
              <div style={{
                height: "100%", width: `${uploadProgress}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                borderRadius: "4px", transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: "1rem 1.5rem",
          background: "rgba(15,23,42,0.9)",
          borderTop: "1px solid var(--border)",
          backdropFilter: "blur(20px)", flexShrink: 0,
        }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.txt,.doc,.docx"
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              title="Upload image or file"
              style={{
                width: "46px", height: "46px", borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "rgba(30,41,59,0.8)",
                color: uploading ? "var(--text-muted)" : "var(--accent)",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "1.2rem", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, transition: "all 0.2s",
              }}
            >📎</button>

            {/* Text Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === "bot"
                  ? "Describe your issue or say hi..."
                  : "Type your message to the agent..."
              }
              rows={1}
              style={{
                flex: 1, background: "rgba(30,41,59,0.8)",
                border: "1px solid var(--border)", borderRadius: "14px",
                padding: "0.8rem 1rem", color: "var(--text)",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                outline: "none", resize: "none",
                maxHeight: "120px", lineHeight: "1.5",
              }}
              onFocus={e => e.target.style.borderColor = chatMode === "bot"
                ? "var(--success)" : "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || botTyping || uploading}
              style={{
                width: "46px", height: "46px", borderRadius: "12px",
                border: "none",
                background: input.trim() && !botTyping
                  ? chatMode === "bot"
                    ? "linear-gradient(135deg, #34d399, #059669)"
                    : "linear-gradient(135deg, var(--accent), var(--accent2))"
                  : "var(--border)",
                color: input.trim() && !botTyping ? "white" : "var(--text-muted)",
                cursor: input.trim() && !botTyping ? "pointer" : "not-allowed",
                fontSize: "1.2rem", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, transition: "all 0.2s",
              }}
            >➤</button>
          </div>

          <p style={{
            fontSize: "0.7rem", color: "var(--text-muted)",
            marginTop: "0.5rem", textAlign: "center"
          }}>
            {chatMode === "bot"
              ? "🤖 AI Chatbot • Say no if issue not solved → auto connects to human agent 🎧 • 📎 Upload files"
              : "🎧 Connected to human agent • Press Enter to send • 📎 Upload files"}
          </p>
        </div>
      </div>
    </>
  );
};

export default CustomerChat;