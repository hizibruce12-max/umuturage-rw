
import { useEffect, useState } from "react";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";

const API_URL = "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState("loading");
  const [loginMode, setLoginMode] = useState("login");
  const [citizen, setCitizen] = useState(null);

  // Check whether the user already has a valid login session.
  useEffect(() => {
    let cancelled = false;

    async function checkLoginSession() {
      const token = localStorage.getItem("umuturageToken");

      // No saved token: show the registration page.
      if (!token) {
        if (!cancelled) {
          setPage("register");
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Your session has expired.");
        }

        if (cancelled) return;

        // Restore the logged-in citizen.
        const profile = data.profile || data.citizen || data;

        setCitizen(profile);
        setPage("dashboard");
      } catch (error) {
        console.error("Session verification failed:", error);

        if (!cancelled) {
          // Remove an invalid or expired token.
          localStorage.removeItem("umuturageToken");
          setCitizen(null);
          setLoginMode("login");
          setPage("login");
        }
      }
    }

    checkLoginSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function goToLogin() {
    setLoginMode("login");
    setPage("login");
  }

  function goToCreateAccount() {
    setLoginMode("create");
    setPage("login");
  }

  function handleLoginSuccess(loggedInCitizen) {
    setCitizen(loggedInCitizen);
    setPage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("umuturageToken");

    setCitizen(null);
    setLoginMode("login");
    setPage("login");
  }

  // Loading screen while checking the saved login session.
  if (page === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#101923]">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[#102D50] dark:text-white">
            Umuturage<span className="text-emerald-600">.rw</span>
          </h1>

          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  if (page === "register") {
    return (
      <Register
        onGoToLogin={goToLogin}
        onGoToCreateAccount={goToCreateAccount}
      />
    );
  }

  if (page === "login") {
    return (
      <Login
        initialMode={loginMode}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        citizen={citizen}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default App;
