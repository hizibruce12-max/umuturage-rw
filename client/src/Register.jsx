
import { useState } from "react";
import { locations } from "./data/locations";

const API_URL = "http://localhost:5000/api";

const initialFormData = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  province: "",
  district: "",
  sector: "",
  cell: "",
  village: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#16865B] focus:ring-4 focus:ring-[#16865B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60";

const labelClass = "mb-2 block text-sm font-semibold text-[#102D50]";

function Register({ onGoToLogin, onGoToCreateAccount }) {
  const [formData, setFormData] = useState(initialFormData);
  const [stage, setStage] = useState("application");

  const [applicationId, setApplicationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [testCode, setTestCode] = useState("");
  const [citizenCode, setCitizenCode] = useState("");

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const districts = formData.province
    ? Object.keys(locations[formData.province] || {})
    : [];

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

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

  // STEP 1: Submit application
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    try {
      const application = await apiRequest("register", formData);

      setApplicationId(application.applicationId);

      const verification = await apiRequest("send-verification", {
        applicationId: application.applicationId,
      });

      setTestCode(verification.testCode || "");
      setStage("verification");

      setMessage("Your application has been received successfully.");
      setIsSuccess(true);
    } catch (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // STEP 2: Verify phone and generate Citizen Code
  async function handleVerifyPhone(event) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    try {
      await apiRequest("verify-phone", {
        applicationId,
        code: verificationCode,
      });

      const result = await apiRequest("generate-citizen-code", {
        applicationId,
      });

      setCitizenCode(result.citizenCode);
      setStage("completed");

      setMessage("Your Citizen Code is ready!");
      setIsSuccess(true);
    } catch (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewApplication() {
    setFormData({ ...initialFormData });
    setStage("application");
    setApplicationId(null);
    setVerificationCode("");
    setTestCode("");
    setCitizenCode("");
    setMessage("");
    setIsSuccess(false);
  }

  const stages = ["application", "verification", "completed"];
  const currentStage = stages.indexOf(stage);

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 py-6 sm:px-6 lg:py-10">
      {/* HEADER */}
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
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

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-semibold tracking-wide text-slate-500 sm:inline">
            ALREADY REGISTERED?
          </span>

          <button
            type="button"
            onClick={onGoToLogin}
            className="rounded-xl border border-[#102D50] px-4 py-2.5 text-sm font-bold text-[#102D50] transition hover:bg-[#102D50] hover:text-white"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-25px_rgba(16,45,80,0.18)] lg:grid-cols-5">
        {/* BRAND PANEL */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#102D50] px-7 py-10 text-white sm:px-10 lg:col-span-2">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#16865B]/20 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#45C58A]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                A platform for every citizen
              </span>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#45C58A]">
              Welcome to Umuturage.rw
            </p>

            <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Your life.
              <br />
              Your community.
              <br />
              <span className="text-[#45C58A]">Connected.</span>
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-7 text-blue-100/80">
              One digital space to access useful information, discover
              opportunities and stay connected with your community.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#16865B]">
                  <span className="text-lg">⌂</span>
                </div>
                <p className="text-sm font-bold">Citizen services</p>
                <p className="mt-1 text-xs text-blue-100/60">
                  Services within reach
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <span className="text-lg">✦</span>
                </div>
                <p className="text-sm font-bold">Opportunities</p>
                <p className="mt-1 text-xs text-blue-100/60">
                  Discover and grow
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 border-t border-white/15 pt-6">
            <p className="text-sm font-semibold text-[#45C58A]">
              Our commitment
            </p>
            <p className="mt-2 text-lg font-medium">
              Buri muturage, serivisi yegereye.
            </p>
            <p className="mt-4 text-xs text-blue-100/60">
              Built around people. Designed for progress.
            </p>
          </div>
        </section>

        {/* FORM PANEL */}
        <section className="min-w-0 px-5 py-9 sm:px-10 sm:py-12 lg:col-span-3">
          {/* REGISTRATION PROGRESS */}
          <div className="mb-9">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Registration process
              </p>
              <p className="text-xs font-semibold text-[#102D50]">
                Step {currentStage + 1} of 3
              </p>
            </div>

            <div className="flex gap-2">
              {stages.map((item, index) => (
                <div
                  key={item}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    currentStage >= index ? "bg-[#16865B]" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="mt-3 flex justify-between text-[11px] font-medium text-slate-400">
              <span>Application</span>
              <span>Verification</span>
              <span>Citizen Code</span>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          {message && (
            <div
              role="status"
              className={`mb-6 rounded-xl border p-4 text-sm ${
                isSuccess
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* APPLICATION FORM */}
          {stage === "application" && (
            <>
              <div className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#16865B]">
                  Get started
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#102D50] sm:text-3xl">
                  Citizen Code Application
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  Provide your information below to begin your Umuturage.rw
                  registration.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* PERSONAL INFORMATION */}
                <div>
                  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#102D50]/5 text-xs font-bold text-[#102D50]">
                      01
                    </span>
                    <h3 className="text-sm font-bold text-[#102D50]">
                      Personal information
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="fullName" className={labelClass}>
                        Full name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        placeholder="Enter your full name"
                        className={inputClass}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="dateOfBirth" className={labelClass}>
                          Date of birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          required
                          max={new Date().toISOString().split("T")[0]}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="gender" className={labelClass}>
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        Telephone number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        autoComplete="tel"
                        placeholder="+250 7XX XXX XXX"
                        className={inputClass}
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Your number will be used for phone verification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* RESIDENTIAL INFORMATION */}
                <div>
                  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16865B]/10 text-xs font-bold text-[#16865B]">
                      02
                    </span>
                    <h3 className="text-sm font-bold text-[#102D50]">
                      Residential information
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="province" className={labelClass}>
                        Province <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="province"
                        name="province"
                        value={formData.province}
                        onChange={(event) => {
                          setFormData((previous) => ({
                            ...previous,
                            province: event.target.value,
                            district: "",
                            sector: "",
                            cell: "",
                            village: "",
                          }));
                        }}
                        required
                        className={inputClass}
                      >
                        <option value="">Select province</option>
                        {Object.keys(locations).map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="district" className={labelClass}>
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={(event) => {
                          setFormData((previous) => ({
                            ...previous,
                            district: event.target.value,
                            sector: "",
                            cell: "",
                            village: "",
                          }));
                        }}
                        required
                        disabled={!formData.province}
                        className={inputClass}
                      >
                        <option value="">Select district</option>
                        {districts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {["sector", "cell", "village"].map((field) => (
                        <div key={field}>
                          <label htmlFor={field} className={labelClass}>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                            <span className="text-red-500"> *</span>
                          </label>
                          <input
                            id={field}
                            name={field}
                            value={formData[field]}
                            onChange={handleChange}
                            required
                            placeholder={`Enter ${field}`}
                            className={inputClass}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PRIVACY NOTICE */}
                <div className="rounded-xl border border-[#16865B]/15 bg-[#16865B]/5 p-4">
                  <p className="text-xs leading-6 text-slate-600">
                    <strong className="text-[#102D50]">Privacy notice:</strong>{" "}
                    Please provide accurate information. Your personal details
                    should only be used for the purposes explained by the
                    Umuturage.rw platform.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#102D50] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#102D50]/15 transition duration-200 hover:bg-[#16865B] hover:shadow-[#16865B]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Submitting your application..."
                    : "Submit Application →"}
                </button>
              </form>
            </>
          )}

          {/* PHONE VERIFICATION */}
          {stage === "verification" && (
            <div className="mx-auto max-w-md py-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#102D50]/5 text-3xl">
                📱
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#16865B]">
                Almost there
              </p>
              <h2 className="text-2xl font-extrabold text-[#102D50]">
                Verify your phone
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Your application has been received. Enter the six-digit
                verification code to confirm your phone number.
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Application reference: #{applicationId}
              </p>

              {testCode && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-800">
                    DEVELOPMENT TEST CODE
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-[0.3em] text-amber-900">
                    {testCode}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-800">
                    This code is displayed for testing only. Real SMS delivery
                    will be integrated before launch.
                  </p>
                </div>
              )}

              <form onSubmit={handleVerifyPhone} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="verificationCode" className={labelClass}>
                    Six-digit verification code
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    required
                    placeholder="000000"
                    className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.length !== 6}
                  className="w-full rounded-xl bg-[#102D50] px-6 py-4 text-sm font-bold text-white transition duration-200 hover:bg-[#16865B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Verifying..."
                    : "Verify & Generate Citizen Code"}
                </button>
              </form>
            </div>
          )}

          {/* CITIZEN CODE SUCCESS */}
          {stage === "completed" && (
            <div className="mx-auto max-w-md py-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#16865B]/10 text-4xl font-bold text-[#16865B]">
                ✓
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#16865B]">
                Registration completed
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-[#102D50]">
                Congratulations!
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Your phone number has been verified and your Umuturage.rw
                Citizen Code has been generated.
              </p>

              <div className="mt-8 rounded-2xl border border-[#16865B]/20 bg-[#16865B]/5 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-[#16865B]">
                  Your Citizen Code
                </p>
                <p className="mt-4 break-all text-2xl font-extrabold tracking-wider text-[#102D50] sm:text-3xl">
                  {citizenCode}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(citizenCode);
                      setMessage("Citizen Code copied successfully!");
                      setIsSuccess(true);
                    } catch {
                      setMessage(
                        "Please select and copy your Citizen Code."
                      );
                      setIsSuccess(false);
                    }
                  }}
                  className="mt-5 rounded-lg border border-[#16865B] px-5 py-2.5 text-sm font-bold text-[#16865B] transition hover:bg-[#16865B] hover:text-white"
                >
                  Copy Citizen Code
                </button>
              </div>

              <p className="mt-6 text-sm leading-6 text-slate-500">
                Keep your Citizen Code safe. You will use it when setting up
                your Umuturage.rw account.
              </p>

              <button
                type="button"
                onClick={onGoToCreateAccount}
                className="mt-7 w-full rounded-xl bg-[#16865B] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#116C49]"
              >
                Create Your Account →
              </button>

              <button
                type="button"
                onClick={handleNewApplication}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-[#102D50] transition hover:bg-slate-50"
              >
                Start New Application
              </button>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mx-auto mt-8 max-w-6xl text-center">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Umuturage.rw. All rights reserved.
        </p>
        <p className="mt-2 text-xs font-medium text-slate-400">
          Buri muturage, serivisi yegereye.
        </p>
      </footer>
    </main>
  );
}

export default Register;
