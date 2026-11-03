
import { useState } from "react";

const API_URL = "http://localhost:5000/api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#16865B] focus:ring-4 focus:ring-[#16865B]/10";

const labelClass =
  "mb-2 block text-sm font-semibold text-[#102D50]";

function Login({ onLoginSuccess, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);

  const [citizenCode, setCitizenCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function apiRequest(endpoint, body) {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function handleCreateAccount(event) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    try {
      await apiRequest("create-account", {
        citizenCode: citizenCode.trim().toUpperCase(),
        password,
        confirmPassword,
      });

      setMessage(
        "Your account has been created successfully. You can now log in."
      );

      setIsSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    } catch (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await apiRequest("login", {
        citizenCode: citizenCode.trim().toUpperCase(),
        password,
      });

      // Save the authentication token for future protected requests.
      localStorage.setItem("umuturageToken", result.token);

      setMessage("Login successful!");
      setIsSuccess(true);

      if (onLoginSuccess) {
        onLoginSuccess(result.citizen);
      }
    } catch (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 py-6 sm:px-6 lg:py-10">

      {/* HEADER */}
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-7">

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <img
              src="/umuturage-logo.png"
              alt="Umuturage.rw logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <p className="text-xl font-extrabold tracking-tight text-[#102D50]">
              Umuturage<span className="text-[#16865B]">.rw</span>
            </p>

            <p className="text-[11px] font-medium tracking-wide text-slate-500">
              YOUR DIGITAL COMMUNITY
            </p>
          </div>
        </div>

        <span className="hidden text-xs font-semibold tracking-wide text-slate-500 sm:block">
          CITIZEN PORTAL
        </span>
      </header>

      {/* LOGIN CONTAINER */}
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-25px_rgba(16,45,80,0.18)] lg:grid-cols-2">

        {/* BRAND PANEL */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#102D50] px-7 py-10 text-white sm:px-10">

          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#16865B]/20 blur-3xl" />

          <div className="relative z-10">

            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#45C58A]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                Secure citizen access
              </span>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#45C58A]">
              Welcome back
            </p>

            <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Your community.
              <br />
              Your services.
              <br />
              <span className="text-[#45C58A]">One account.</span>
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-7 text-blue-100/80">
              Access your personal citizen space and stay connected
              with information, services and opportunities.
            </p>

            <div className="mt-10 space-y-4">

              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.07] p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16865B] text-lg">
                  ✓
                </span>

                <div>
                  <p className="text-sm font-bold">Secure access</p>
                  <p className="mt-1 text-xs text-blue-100/60">
                    Your account, protected.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.07] p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">
                  ✦
                </span>

                <div>
                  <p className="text-sm font-bold">Citizen services</p>
                  <p className="mt-1 text-xs text-blue-100/60">
                    Your digital community.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="relative z-10 mt-12 border-t border-white/15 pt-6">
            <p className="text-sm font-semibold text-[#45C58A]">
              Umuturage.rw
            </p>

            <p className="mt-2 text-sm text-blue-100/70">
              Buri muturage, serivisi yegereye.
            </p>
          </div>
        </section>

        {/* FORM PANEL */}
        <section className="flex min-w-0 items-center px-5 py-10 sm:px-10 sm:py-14">

          <div className="mx-auto w-full max-w-md">

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#16865B]">
              {mode === "login" ? "Citizen access" : "Join Umuturage.rw"}
            </p>

            <h2 className="text-2xl font-extrabold tracking-tight text-[#102D50] sm:text-3xl">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {mode === "login"
                ? "Enter your Citizen Code and password to continue."
                : "Use the Citizen Code you received after completing your registration."}
            </p>

            {/* NOTIFICATION */}
            {message && (
              <div
                role="status"
                className={`mt-6 rounded-xl border p-4 text-sm ${
                  isSuccess
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <form
              onSubmit={
                mode === "login"
                  ? handleLogin
                  : handleCreateAccount
              }
              className="mt-8 space-y-5"
            >

              {/* CITIZEN CODE */}
              <div>
                <label htmlFor="citizenCode" className={labelClass}>
                  Citizen Code
                </label>

                <input
                  id="citizenCode"
                  type="text"
                  value={citizenCode}
                  onChange={(event) =>
                    setCitizenCode(event.target.value.toUpperCase())
                  }
                  placeholder="Enter your Citizen Code"
                  autoComplete="username"
                  required
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-slate-400">
                  Your Citizen Code is your username.
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    required
                    minLength={8}
                    className={`${inputClass} pr-20`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#16865B] hover:text-[#102D50]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {mode === "login" ? null : (
                  <p className="mt-2 text-xs text-slate-400">
                    Use at least 8 characters.
                  </p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              {mode === "create" && (
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#102D50] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#102D50]/15 transition duration-200 hover:bg-[#16865B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In →"
                    : "Create My Account →"}
              </button>

            </form>

            {/* SWITCH SCREENS */}
            <div className="mt-8 border-t border-slate-100 pt-6 text-center">

              {mode === "login" ? (
                <p className="text-sm text-slate-500">
                  Don't have a password yet?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("create")}
                    className="font-bold text-[#16865B] hover:text-[#102D50]"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-bold text-[#16865B] hover:text-[#102D50]"
                  >
                    Sign In
                  </button>
                </p>
              )}

            </div>

          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mx-auto mt-8 max-w-5xl text-center">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Umuturage.rw. All rights reserved.
        </p>
      </footer>

    </main>
  );
}

export default Login;
