
import { useEffect, useState } from "react";
import Profile from "./Profile";
import Finance from "./Finance";
const SERVER_URL = "http://localhost:5000";
const API_URL = `${SERVER_URL}/api`;

const navigation = [
  { id: "overview", icon: "⌂", en: "Overview", rw: "Incamake", fr: "Aperçu", sw: "Muhtasari" },
  { id: "profile", icon: "◎", en: "My Profile", rw: "Umwirondoro", fr: "Mon profil", sw: "Wasifu wangu" },
  { id: "finances", icon: "▤", en: "Finances", rw: "Imari", fr: "Finances", sw: "Fedha" },
  { id: "documents", icon: "▧", en: "My Documents", rw: "Inyandiko", fr: "Documents", sw: "Nyaraka" },
  { id: "services", icon: "▣", en: "Citizen Services", rw: "Serivisi", fr: "Services citoyens", sw: "Huduma za raia" },
  { id: "schedule", icon: "▦", en: "Schedule", rw: "Gahunda", fr: "Agenda", sw: "Ratiba" },
  { id: "family", icon: "♡", en: "Family", rw: "Umuryango", fr: "Famille", sw: "Familia" },
  { id: "messages", icon: "✉", en: "Email & Messages", rw: "Ubutumwa", fr: "Messages", sw: "Ujumbe" },
  { id: "work", icon: "▥", en: "Work & Education", rw: "Akazi n'Uburezi", fr: "Travail et études", sw: "Kazi na Elimu" },
  { id: "transport", icon: "↗", en: "Transport", rw: "Ubwikorezi", fr: "Transport", sw: "Usafiri" },
  { id: "settings", icon: "⚙", en: "Settings", rw: "Igenamiterere", fr: "Paramètres", sw: "Mipangilio" },
];

const translations = {
  en: {
    welcome: "Welcome back",
    subtitle: "Your personal life and citizen services, in one place.",
    balance: "Total balance",
    income: "Monthly income",
    expenses: "Monthly expenses",
    savings: "Savings goal",
    overview: "Your overview",
    activity: "Recent activity",
    schedule: "Upcoming schedule",
    applications: "Applications",
    viewAll: "View all",
    demo: "Illustrative demo data",
    assistant: "Umuturage AI",
    assistantText: "How can I help you today?",
    ask: "Ask me anything...",
    send: "Send",
    logout: "Log out",
    theme: "Dark mode",
    language: "Language",
    coming: "This section is being prepared.",
  },
  rw: {
    welcome: "Murakaza neza",
    subtitle: "Serivisi n'imibereho yawe ahantu hamwe.",
    balance: "Amafaranga yose",
    income: "Amafaranga winjiza",
    expenses: "Amafaranga ukoresha",
    savings: "Intego yo kuzigama",
    overview: "Incamake yawe",
    activity: "Ibikorwa biheruka",
    schedule: "Gahunda iri imbere",
    applications: "Ubusabe",
    viewAll: "Reba byose",
    demo: "Amakuru y'igereranya",
    assistant: "Umuturage AI",
    assistantText: "Nagufasha iki uyu munsi?",
    ask: "Baza ikibazo...",
    send: "Ohereza",
    logout: "Sohoka",
    theme: "Uburyo bwijimye",
    language: "Ururimi",
    coming: "Iki gice kirimo gutegurwa.",
  },
  fr: {
    welcome: "Bon retour",
    subtitle: "Vos services citoyens et votre vie au même endroit.",
    balance: "Solde total",
    income: "Revenu mensuel",
    expenses: "Dépenses mensuelles",
    savings: "Objectif d'épargne",
    overview: "Votre aperçu",
    activity: "Activité récente",
    schedule: "Agenda à venir",
    applications: "Demandes",
    viewAll: "Tout voir",
    demo: "Données de démonstration",
    assistant: "Umuturage AI",
    assistantText: "Comment puis-je vous aider aujourd'hui ?",
    ask: "Posez une question...",
    send: "Envoyer",
    logout: "Déconnexion",
    theme: "Mode sombre",
    language: "Langue",
    coming: "Cette section est en préparation.",
  },
  sw: {
    welcome: "Karibu tena",
    subtitle: "Huduma zako na maisha yako sehemu moja.",
    balance: "Salio lote",
    income: "Mapato ya mwezi",
    expenses: "Matumizi ya mwezi",
    savings: "Lengo la akiba",
    overview: "Muhtasari wako",
    activity: "Shughuli za hivi karibuni",
    schedule: "Ratiba ijayo",
    applications: "Maombi",
    viewAll: "Tazama yote",
    demo: "Takwimu za mfano",
    assistant: "Umuturage AI",
    assistantText: "Ninaweza kukusaidiaje leo?",
    ask: "Uliza chochote...",
    send: "Tuma",
    logout: "Toka",
    theme: "Hali ya giza",
    language: "Lugha",
    coming: "Sehemu hii inaandaliwa.",
  },
};

const demoTransactions = [
  { name: "Monthly salary", date: "Oct 25, 2026", amount: "+ RWF 450,000", positive: true },
  { name: "Electricity payment", date: "Oct 23, 2026", amount: "- RWF 18,500", positive: false },
  { name: "Transport", date: "Oct 21, 2026", amount: "- RWF 12,000", positive: false },
];

const scheduleItems = [
  { time: "09:00", title: "Personal appointment", date: "Tomorrow", type: "Appointment" },
  { time: "14:00", title: "Review monthly budget", date: "Friday", type: "Finance" },
  { time: "10:30", title: "Document renewal reminder", date: "Nov 04", type: "Reminder" },
];

// Always convert the profile photo value into a safe string.
function normalizePhotoUrl(value) {
  let photoUrl = value;

  if (photoUrl && typeof photoUrl === "object") {
    photoUrl =
      photoUrl.profilePhotoUrl ||
      photoUrl.profile_photo_url ||
      "";
  }

  if (typeof photoUrl !== "string" || !photoUrl.trim()) {
    return "";
  }

  return photoUrl.trim();
}

// Convert the saved relative image path into a full URL.
function getPhotoUrl(value) {
  const photoUrl = normalizePhotoUrl(value);

  if (!photoUrl) return "";

  if (/^https?:\/\//i.test(photoUrl)) {
    return photoUrl;
  }

  return `${SERVER_URL}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
}

function FinancialChart() {
  const values = [35, 42, 39, 52, 48, 63, 58, 70, 66, 82, 76, 92];

  const points = values
    .map((value, index) => `${index * 9},${100 - value}`)
    .join(" ");

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>RWF (illustrative)</span>
        <span>Last 12 months</span>
      </div>

      <svg
        viewBox="0 0 100 105"
        className="mt-3 h-48 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {[20, 45, 70, 95].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            opacity="0.12"
            strokeDasharray="2 2"
          />
        ))}

        <polyline
          points={points}
          fill="none"
          stroke="#15966A"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {values.map((value, index) => (
          <circle
            key={index}
            cx={index * 9}
            cy={100 - value}
            r="1.5"
            fill="#15966A"
          />
        ))}
      </svg>

      <div className="flex justify-between text-[10px] text-slate-400">
        {["Nov", "Jan", "Mar", "May", "Jul", "Sep", "Oct"].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ citizen, onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState(() =>
    normalizePhotoUrl(
      citizen?.profilePhotoUrl || citizen?.profile_photo_url || ""
    )
  );

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("umuturageTheme") === "dark";
    } catch {
      return false;
    }
  });

  const [language, setLanguage] = useState(() => {
    try {
      const savedLanguage = localStorage.getItem("umuturageLanguage");
      return translations[savedLanguage] ? savedLanguage : "en";
    } catch {
      return "en";
    }
  });

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  const t = translations[language];

  const citizenName = String(
    citizen?.fullName ||
    citizen?.full_name ||
    citizen?.name ||
    "Citizen"
  );

  const initials = citizenName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentNav = navigation.find((item) => item.id === activePage);

  // Always use the same safe URL conversion for both dashboard photos.
  const displayedPhotoUrl = getPhotoUrl(profilePhotoUrl);

  // Update photo if the citizen information changes.
  useEffect(() => {
    const citizenPhoto = normalizePhotoUrl(
      citizen?.profilePhotoUrl || citizen?.profile_photo_url || ""
    );

    if (citizenPhoto) {
      setProfilePhotoUrl(citizenPhoto);
    }
  }, [citizen?.profilePhotoUrl, citizen?.profile_photo_url]);

  // Load the saved citizen profile and photo from MySQL through the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadCitizenProfile() {
      try {
        const token = localStorage.getItem("umuturageToken");

        if (!token) return;

        const response = await fetch(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load profile.");
        }

        if (cancelled) return;

        const photo = normalizePhotoUrl(
          data.profile?.profilePhotoUrl ||
          data.profile?.profile_photo_url ||
          ""
        );

        setProfilePhotoUrl(photo);
      } catch (error) {
        if (!cancelled) {
          console.error("Profile loading error:", error);
        }
      }
    }

    loadCitizenProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // Receive profile updates from Profile.jsx.
  function handleProfileUpdated(updatedProfile) {
    const newPhoto = normalizePhotoUrl(updatedProfile);

    setProfilePhotoUrl(newPhoto);
  }

  function changeTheme() {
    const next = !darkMode;

    setDarkMode(next);

    try {
      localStorage.setItem("umuturageTheme", next ? "dark" : "light");
    } catch {
      // Theme remains active for the current session.
    }
  }

  function changeLanguage(value) {
    setLanguage(value);

    try {
      localStorage.setItem("umuturageLanguage", value);
    } catch {
      // Language remains active for the current session.
    }
  }

  function sendMessage(event) {
    event.preventDefault();

    if (!question.trim()) return;

    setMessages((previous) => [
      ...previous,
      { sender: "user", text: question.trim() },
      {
        sender: "assistant",
        text: "Thanks for your question. The Umuturage AI connection is not active yet. It will be connected to your authorized platform information in a future development stage.",
      },
    ]);

    setQuestion("");
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#101923] dark:text-slate-100">

        {/* Mobile menu overlay */}
        {mobileMenu && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-[#172432] lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-700">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#102D50] dark:text-white">
                Umuturage<span className="text-[#15966A]">.rw</span>
              </h1>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Your life. Connected.
              </p>
            </div>

            <button
              onClick={() => setMobileMenu(false)}
              className="text-xl lg:hidden"
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>

          {/* Citizen information and photo */}
          <div className="border-b border-slate-100 p-5 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#102D50] font-bold text-white">
                {displayedPhotoUrl ? (
                  <img
                    src={displayedPhotoUrl}
                    alt="Citizen profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{citizenName}</p>
                <p className="text-xs text-slate-400">Umuturage member</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Workspace
            </p>

            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setMobileMenu(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  activePage === item.id
                    ? "bg-[#102D50] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span className="w-5 text-center text-lg">
                  {item.icon}
                </span>

                <span>{item[language]}</span>
              </button>
            ))}

            <button
              onClick={() => {
                setAssistantOpen(true);
                setMobileMenu(false);
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            >
              <span className="text-lg">✧</span>
              {t.assistant}
            </button>
          </nav>

          {/* Logout */}
          <div className="border-t border-slate-100 p-4 dark:border-slate-700">
            <button
              onClick={onLogout}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              ↪ {t.logout}
            </button>
          </div>
        </aside>

        {/* Main dashboard */}
        <main className="min-h-screen lg:pl-72">

          {/* Header */}
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8 dark:border-slate-700 dark:bg-[#172432]/90">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenu(true)}
                className="rounded-lg p-2 text-xl hover:bg-slate-100 lg:hidden dark:hover:bg-slate-700"
                aria-label="Open navigation"
              >
                ☰
              </button>

              <div>
                <p className="text-xs text-slate-400">
                  Umuturage.rw / {currentNav?.[language]}
                </p>

                <h2 className="font-bold">
                  {currentNav?.[language]}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                className="max-w-24 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800"
                aria-label="Choose language"
              >
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
                <option value="fr">Français</option>
                <option value="sw">Kiswahili</option>
              </select>

              <button
                onClick={changeTheme}
                title={t.theme}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
              >
                {darkMode ? "☀" : "☾"}
              </button>

              <button
                onClick={() => setAssistantOpen(true)}
                title={t.assistant}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
              >
                ✧ <span className="hidden sm:inline">AI</span>
              </button>
            </div>
          </header>

          {/* Dashboard content */}
          <div className="mx-auto max-w-7xl p-4 md:p-8">

            {/* Profile page */}
            {activePage === "profile" ? (
  <Profile
    citizen={citizen}
    onProfileUpdated={handleProfileUpdated}
  />

) : activePage === "finances" ? (
  <Finance darkMode={darkMode} />

) : activePage === "overview" ? (
              <>
                {/* Welcome section */}
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500 bg-[#102D50] text-xl font-bold text-white shadow-sm">
                      {displayedPhotoUrl ? (
                        <img
                          src={displayedPhotoUrl}
                          alt="Your profile"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-emerald-600">
                        {t.welcome}, {citizenName} 👋
                      </p>

                      <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                        {t.overview}
                      </h1>

                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    ⓘ {t.demo}
                  </span>
                </div>

                {/* Financial cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: t.balance,
                      value: "RWF 1,250,000",
                      change: "Illustrative balance",
                      icon: "◈",
                    },
                    {
                      label: t.income,
                      value: "RWF 450,000",
                      change: "Illustrative income",
                      icon: "↗",
                    },
                    {
                      label: t.expenses,
                      value: "RWF 185,000",
                      change: "Illustrative expenses",
                      icon: "↘",
                    },
                    {
                      label: t.savings,
                      value: "68%",
                      change: "Illustrative progress",
                      icon: "◎",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172432]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {card.label}
                        </p>

                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {card.icon}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-black tracking-tight">
                        {card.value}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {card.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chart and schedule */}
                <div className="mt-6 grid gap-6 xl:grid-cols-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-[#172432]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">Financial growth</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Illustrative account growth over time
                        </p>
                      </div>

                      <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800">
                        <option>Last 12 months</option>
                        <option>Last 6 months</option>
                        <option>Last 3 months</option>
                        <option>Last 30 days</option>
                        <option>Last 7 days</option>
                      </select>
                    </div>

                    <FinancialChart />
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172432]">
                    <h3 className="font-bold">{t.schedule}</h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Your upcoming reminders
                    </p>

                    <div className="mt-5 space-y-5">
                      {scheduleItems.map((item) => (
                        <div key={item.title} className="flex gap-3">
                          <div className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {item.time}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {item.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {item.date} · {item.type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setActivePage("schedule")}
                      className="mt-6 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      {t.viewAll}
                    </button>
                  </section>
                </div>

                {/* Recent activity and applications */}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172432]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{t.activity}</h3>

                      <button
                        onClick={() => setActivePage("finances")}
                        className="text-xs font-bold text-emerald-600"
                      >
                        {t.viewAll}
                      </button>
                    </div>

                    <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
                      {demoTransactions.map((transaction) => (
                        <div
                          key={transaction.name}
                          className="flex items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {transaction.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {transaction.date}
                            </p>
                          </div>

                          <p
                            className={`whitespace-nowrap text-sm font-bold ${
                              transaction.positive
                                ? "text-emerald-600"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {transaction.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172432]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{t.applications}</h3>

                      <button
                        onClick={() => setActivePage("services")}
                        className="text-xs font-bold text-emerald-600"
                      >
                        {t.viewAll}
                      </button>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Citizen registration
                        </p>

                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Completed
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Your registration information is on file.
                      </p>
                    </div>

                    <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
                      <p className="text-sm font-semibold">
                        More citizen services
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Explore services and track future applications.
                      </p>

                      <button
                        onClick={() => setActivePage("services")}
                        className="mt-3 text-xs font-bold text-emerald-600"
                      >
                        Explore services →
                      </button>
                    </div>
                  </section>
                </div>
              </>

            ) : activePage === "settings" ? (

              /* Settings page */
              <section className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-[#172432]">
                <h1 className="text-2xl font-black">Settings</h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Manage your dashboard preferences.
                </p>

                <div className="mt-6 max-w-md space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <span className="text-sm font-semibold">
                      {t.theme}
                    </span>

                    <button
                      onClick={changeTheme}
                      className="rounded-lg bg-[#102D50] px-4 py-2 text-xs font-bold text-white"
                    >
                      {darkMode ? "Light mode" : "Dark mode"}
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <label className="mb-2 block text-sm font-semibold">
                      {t.language}
                    </label>

                    <select
                      value={language}
                      onChange={(event) => changeLanguage(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    >
                      <option value="en">English</option>
                      <option value="rw">Kinyarwanda</option>
                      <option value="fr">Français</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </div>
                </div>
              </section>

            ) : (

              /* Other sections */
              <section className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-[#172432]">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {currentNav?.icon}
                </div>

                <h1 className="text-2xl font-black">
                  {currentNav?.[language]}
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t.coming}
                </p>
              </section>
            )}
          </div>
        </main>

        {/* Umuturage AI assistant */}
        {assistantOpen && (
          <div className="fixed bottom-5 right-4 z-50 flex h-[min(580px,80vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172432]">
            <div className="flex items-center justify-between bg-[#102D50] p-4 text-white">
              <div>
                <p className="font-bold">✧ {t.assistant}</p>

                <p className="text-xs text-blue-100">
                  Your personal digital assistant
                </p>
              </div>

              <button
                onClick={() => setAssistantOpen(false)}
                className="rounded-lg px-2 py-1 hover:bg-white/10"
                aria-label="Close assistant"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {t.assistantText} I'm being prepared to help with your schedule,
                documents, finances and citizen services.
              </div>

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[90%] rounded-2xl p-3 text-sm leading-6 ${
                    message.sender === "user"
                      ? "ml-auto bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {message.text}
                </div>
              ))}

              <p className="text-center text-[10px] text-slate-400">
                Demo assistant · Not connected to live AI or financial accounts
              </p>
            </div>

            <form
              onSubmit={sendMessage}
              className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={t.ask}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
              />

              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"
              >
                {t.send}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
