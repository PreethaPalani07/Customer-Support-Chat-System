import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const PrivateRoute = ({ children, allowedRole }) => {
  const [status, setStatus] = useState("loading"); // loading | allowed | denied
  const [redirectPath, setRedirectPath] = useState("/");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRedirectPath(allowedRole === "agent" ? "/agent/login" : "/");
        setStatus("denied");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === allowedRole) {
          setStatus("allowed");
        } else {
          setRedirectPath(allowedRole === "agent" ? "/agent/login" : "/");
          setStatus("denied");
        }
      } catch (err) {
        console.error(err);
        setStatus("denied");
      }
    });

    return () => unsubscribe();
  }, [allowedRole]);

  if (status === "loading") {
    return (
      <>
        <div className="bg-mesh" />
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
        }}>
          <div style={{
            width: "44px", height: "44px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Verifying access...
          </p>
        </div>
      </>
    );
  }

  if (status === "denied") {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PrivateRoute;