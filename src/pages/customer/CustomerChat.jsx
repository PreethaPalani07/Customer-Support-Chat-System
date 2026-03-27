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

// Rule based responses
const RULES = [
  {
    keywords: ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "howdy", "hii"],
    response: (name) => `Hi ${name}! Welcome to SupportDesk. I am Jarvis your AI support assistant. How can I help you today?`,
    escalate: false,
  },
  {
    keywords: ["how are you", "how r u", "what are you", "who are you"],
    response: () => `I am Jarvis, your AI support assistant at SupportDesk! I am here to help you with any issues you have. What can I help you with today?`,
    escalate: false,
  },
  {
    keywords: ["thank you", "thanks", "thank u", "thankyou", "ty", "thx"],
    response: () => `You are welcome! I am glad I could help. Is there anything else you need help with?`,
    escalate: false,
  },
  {
    keywords: ["bye", "goodbye", "see you", "take care"],
    response: () => `Goodbye! Have a wonderful day! Feel free to come back anytime if you need help.`,
    escalate: false,
  },
  {
    keywords: ["ok", "okay", "got it", "alright", "sure", "fine"],
    response: () => `Great! Is there anything else I can help you with?`,
    escalate: false,
  },
  {
    keywords: ["yes", "yeah", "yep", "yup", "solved", "fixed", "resolved", "working"],
    response: () => `That is great to hear! I am glad your issue is resolved. Have a wonderful day! Feel free to come back anytime.`,
    escalate: false,
  },
  {
    keywords: ["password", "forgot password", "reset password", "change password"],
    response: () => `To reset your password. First click on Forgot Password on the login page. Second enter your registered email address. Third check your email for the reset link. Fourth click the link and set a new password. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["login", "sign in", "cannot login", "cant login", "unable to login", "login problem"],
    response: () => `Here are some steps to fix login issues. First make sure you are using the correct email and password. Second check if Caps Lock is turned on. Third try clearing your browser cache. Fourth try resetting your password. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["account", "locked", "blocked", "suspended", "deactivated"],
    response: () => `If your account is locked or suspended. First wait for 30 minutes and try again. Second make sure you have not violated any terms. Third check your email for any notifications. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["payment", "pay", "paying", "paid", "transaction", "billing", "charge", "charged"],
    response: () => `For payment related issues. First check if your bank account has sufficient balance. Second make sure your card details are correct. Third try a different payment method. Fourth check if your bank is blocking the transaction. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["refund", "money back", "return money", "cashback"],
    response: () => `For refund requests. Refunds are processed within 5 to 7 business days. Please check your bank account after 7 days. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["invoice", "receipt", "bill"],
    response: () => `To get your invoice or receipt. Go to My Account. Click on Order History. Find your order and click Download Invoice. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["app", "crash", "crashing", "not working", "not opening", "stopped working"],
    response: () => `To fix app issues. First clear your browser cache and cookies. Second try refreshing the page. Third try using a different browser. Fourth reinstall the app if on mobile. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["slow", "loading", "not loading", "taking long", "speed", "lagging"],
    response: () => `To fix slow loading issues. First check your internet connection. Second try refreshing the page. Third clear your browser cache. Fourth try switching to a different network. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["order", "track", "tracking", "delivery", "shipment", "where is my order"],
    response: () => `To track your order. Go to My Account. Click on Orders. Click Track Order. You will see real time tracking information. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["cancel", "cancellation", "cancel order"],
    response: () => `To cancel your order. Go to My Account. Click on Orders. Find your order and click Cancel. Orders can only be cancelled within 24 hours of placing. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["wrong item", "wrong product", "incorrect item", "different item"],
    response: () => `If you received a wrong item. Take a clear photo of the item received. Go to My Account then Orders then Report Issue. Upload the photo and describe the issue. Our team will process a replacement within 2 to 3 days. Did this solve your issue?`,
    escalate: false,
  },
  {
    keywords: ["no", "nope", "not solved", "not fixed", "still", "not helpful", "doesnt work", "did not work"],
    response: () => `I understand your issue is not resolved yet. Let me connect you to a human agent who can help you better. Please wait a moment.`,
    escalate: true,
  },
  {
    keywords: ["human", "agent", "person", "representative", "real person", "talk to someone"],
    response: () => `Sure! Let me connect you to a human support agent right away. Please wait a moment.`,
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          setInput(transcriptText);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text to Speech function
  const speak = (text) => {
    if (!voiceMode) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.lang === "en-US"
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Start listening
  // const startListening = () => {
  //   if (recognitionRef.current && !isListening) {
  //     setVoiceMode(true);
  //     recognitionRef.current.start();
  //   }
  // };
  const startListening = () => {
  if (recognitionRef.current && !isListening) {
    setVoiceMode(true);
    try {
      recognitionRef.current.abort(); // ✅ Stop any existing session first
      setTimeout(() => {
        recognitionRef.current.start(); // ✅ Then start fresh
      }, 100);
    } catch (e) {
      console.error("Recognition start error:", e);
      setIsListening(false);
    }
  }
};

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

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
            const welcomeMsg = "Hello! I am Jarvis your AI voice support assistant at SupportDesk. You can type or use the microphone button to speak your issue. How can I help you today?";
            await addBotMessage(welcomeMsg);
            speak(welcomeMsg);
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
      senderName: "Jarvis AI",
      timestamp: Date.now(),
    });
  };

  const autoEscalateToHuman = async () => {
    if (escalating || chatMode === "human") return;
    setEscalating(true);
    try {
      const msg1 = "Automatically connecting you to a human support agent who specializes in your issue. Please wait.";
      await addBotMessage("🔄 " + msg1);
      speak(msg1);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const msg2 = `Connecting you to a ${SKILL_LABELS[customerData?.skill]} specialist now. They will be with you shortly!`;
      await addBotMessage("🎧 " + msg2);
      speak(msg2);

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

  const handleSend = async (messageToSend) => {
    const userMessage = messageToSend || input.trim();
    if (!userMessage) return;
    setInput("");
    setTranscript("");

    const chatRef = ref(realtimeDb, `chats/${user.uid}`);
    await push(chatRef, {
      text: userMessage,
      sender: "customer",
      senderName: customerData?.name || "Customer",
      timestamp: Date.now(),
      isVoice: voiceMode,
    });

    if (chatMode === "human") return;

    setBotTyping(true);

    setTimeout(async () => {
      const result = getRuleBasedResponse(
        userMessage,
        customerData?.name || "Customer"
      );

      setBotTyping(false);

      if (result) {
        await addBotMessage(result.response);
        speak(result.response);
        setFailCount(0);

        if (result.escalate) {
          setTimeout(async () => {
            await autoEscalateToHuman();
          }, 2000);
        }
      } else {
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);

        if (newFailCount >= 2) {
          const msg = "I was unable to find a solution for your issue. Let me connect you to a human agent who can help you better.";
          await addBotMessage(msg);
          speak(msg);
          setTimeout(async () => {
            await autoEscalateToHuman();
          }, 2000);
        } else {
          const msg = "I am sorry I could not find an exact answer for that. Could you please describe your issue in more detail? I will try my best to help you!";
          await addBotMessage(msg);
          speak(msg);
        }
      }
    }, 1500);
  };

  // Auto send when voice transcript is final
  useEffect(() => {
    if (input && voiceMode && !isListening) {
      setTimeout(() => {
        handleSend(input);
      }, 500);
    }
  }, [isListening]);

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
              const msg = "Thank you for sharing the file! This requires a human agent to review it properly. Let me connect you to a specialist right away.";
              await addBotMessage(msg);
              speak(msg);
              await autoEscalateToHuman();
            }, 1000);
          }
        } else {
          setUploading(false);
        }
      });

      xhr.addEventListener("error", () => {
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
    window.speechSynthesis.cancel();
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
              animation: isSpeaking ? "pulse-glow 1s infinite" : "none",
            }}>
              {chatMode === "bot" ? "🤖" : "💬"}
            </div>
            <div>
              <p style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700, fontSize: "0.95rem"
              }}>
                {chatMode === "bot" ? "Jarvis AI Assistant" : "Support Chat"}
              </p>
              {chatMode === "bot" ? (
                <p style={{ fontSize: "0.7rem", color: isSpeaking ? "var(--warning)" : "var(--success)" }}>
                  {isSpeaking ? "🔊 Jarvis is speaking..." : isListening ? "🎤 Listening..." : "● Jarvis AI Active"}
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
              {chatMode === "bot" ? "🤖 Jarvis AI" : "🎧 Human Mode"}
            </span>
            <button onClick={handleLogout} style={{
              padding: "0.4rem 0.9rem", borderRadius: "8px",
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem",
              fontFamily: "'DM Sans', sans-serif",
            }}>Sign Out</button>
          </div>
        </nav>

        {/* Voice Mode Banner */}
        {isListening && (
          <div style={{
            background: "rgba(248,113,113,0.08)",
            borderBottom: "1px solid rgba(248,113,113,0.2)",
            padding: "0.75rem 1.5rem",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: "var(--danger)",
                animation: "pulse-glow 0.8s infinite",
              }} />
              <p style={{ fontSize: "0.85rem", color: "var(--danger)", fontWeight: 600 }}>
                🎤 Jarvis is listening... {transcript && `"${transcript}"`}
              </p>
            </div>
            <button
              onClick={stopListening}
              style={{
                padding: "0.3rem 0.8rem", borderRadius: "8px",
                border: "1px solid rgba(248,113,113,0.4)",
                background: "rgba(248,113,113,0.1)",
                color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem",
              }}
            >Stop</button>
          </div>
        )}

        {/* Speaking Banner */}
        {isSpeaking && (
          <div style={{
            background: "rgba(251,191,36,0.08)",
            borderBottom: "1px solid rgba(251,191,36,0.2)",
            padding: "0.75rem 1.5rem",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{
                    width: "3px",
                    height: `${8 + i * 4}px`,
                    background: "var(--warning)",
                    borderRadius: "2px",
                    animation: `spin 0.${i}s ease infinite`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--warning)", fontWeight: 600 }}>
                🔊 Jarvis is speaking...
              </p>
            </div>
            <button
              onClick={stopSpeaking}
              style={{
                padding: "0.3rem 0.8rem", borderRadius: "8px",
                border: "1px solid rgba(251,191,36,0.4)",
                background: "rgba(251,191,36,0.1)",
                color: "var(--warning)", cursor: "pointer", fontSize: "0.8rem",
              }}
            >Stop</button>
          </div>
        )}

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
                ? "🤖 Jarvis AI Voice Assistant is handling your query"
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
                      {isBot ? "🤖 Jarvis AI" : `🎧 ${msg.senderName}`}
                    </p>
                  )}

                  {/* Voice indicator */}
                  {isCustomer && msg.isVoice && (
                    <p style={{
                      fontSize: "0.68rem", color: "var(--text-muted)",
                      marginBottom: "0.2rem", textAlign: "right"
                    }}>
                      🎤 Voice message
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
                isListening
                  ? "🎤 Listening... speak now"
                  : chatMode === "bot"
                    ? "Type or use 🎤 to speak your issue..."
                    : "Type your message to the agent..."
              }
              rows={1}
              style={{
                flex: 1, background: "rgba(30,41,59,0.8)",
                border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`,
                borderRadius: "14px",
                padding: "0.8rem 1rem", color: "var(--text)",
                fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                outline: "none", resize: "none",
                maxHeight: "120px", lineHeight: "1.5",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = chatMode === "bot"
                ? "var(--success)" : "var(--accent)"}
              onBlur={e => e.target.style.borderColor = isListening
                ? "var(--danger)" : "var(--border)"}
            />

            {/* Microphone Button */}
            {chatMode === "bot" && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking}
                title={isListening ? "Stop listening" : "Click to speak"}
                style={{
                  width: "46px", height: "46px", borderRadius: "12px",
                  border: "none",
                  background: isListening
                    ? "linear-gradient(135deg, var(--danger), #dc2626)"
                    : isSpeaking
                      ? "var(--border)"
                      : "linear-gradient(135deg, #818cf8, #c084fc)",
                  color: "white",
                  cursor: isSpeaking ? "not-allowed" : "pointer",
                  fontSize: "1.2rem", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, transition: "all 0.2s",
                  animation: isListening ? "pulse-glow 1s infinite" : "none",
                }}
              >
                {isListening ? "⏹" : "🎤"}
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
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
              ? "🎤 Click microphone to speak • ⌨️ Or type your issue • 📎 Upload files • Say no → connects to human 🎧"
              : "🎧 Connected to human agent • Press Enter to send • 📎 Upload files"}
          </p>
        </div>
      </div>
    </>
  );
};

export default CustomerChat;
