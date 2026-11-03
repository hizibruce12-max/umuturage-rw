
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api";

const expenseCategories = [
  "Food",
  "Transport",
  "Housing",
  "Education",
  "Healthcare",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Business",
  "Other",
];

const incomeTypes = [
  { value: "salary", label: "Salary" },
  { value: "business", label: "Business" },
  { value: "farming", label: "Farming" },
  { value: "freelance", label: "Freelance" },
  { value: "rental", label: "Rental income" },
  { value: "investment", label: "Investment" },
  { value: "remittance", label: "Remittance" },
  { value: "government", label: "Government support" },
  { value: "other", label: "Other" },
];

const money = (value, currency = "RWF") =>
  new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const today = () => new Date().toISOString().slice(0, 10);

const emptyBudgetForm = () => ({
  budgetName: "",
  category: "Food",
  budgetAmount: "",
  currency: "RWF",
  periodType: "monthly",
  startDate: today(),
  endDate: "",
});

function Finance({ darkMode = false }) {
  const [section, setSection] = useState("overview");

  const [providers, setProviders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [incomeSources, setIncomeSources] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingBudgetId, setEditingBudgetId] = useState(null);

  const [accountForm, setAccountForm] = useState({
    providerId: "",
    accountName: "",
    accountNumberLast4: "",
  });

  const [incomeSourceForm, setIncomeSourceForm] = useState({
    sourceName: "",
    sourceType: "salary",
    description: "",
  });

  const [incomeForm, setIncomeForm] = useState({
    accountId: "",
    incomeSourceId: "",
    amount: "",
    description: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    accountId: "",
    amount: "",
    category: "Food",
    description: "",
  });

  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);

  const token = () => localStorage.getItem("umuturageToken");

  const request = useCallback(async (path, options = {}) => {
    const currentToken = token();

    if (!currentToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${currentToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }, []);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        providerData,
        accountData,
        sourceData,
        transactionData,
        budgetData,
      ] = await Promise.all([
        request("/finance/providers"),
        request("/finance/accounts"),
        request("/finance/income-sources"),
        request("/finance/transactions"),
        request("/finance/budgets"),
      ]);

      setProviders(providerData.providers || []);
      setAccounts(accountData.accounts || []);
      setIncomeSources(sourceData.incomeSources || []);
      setTransactions(transactionData.transactions || []);
      setBudgets(budgetData.budgets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  // REAL FINANCIAL TOTALS
  // All figures come from the API/database.
  const totals = useMemo(() => {
    const completedTransactions = transactions.filter(
      (item) =>
        String(item.transactionStatus || "").toLowerCase() === "completed"
    );

    const income = completedTransactions
      .filter((item) => item.transactionType === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = completedTransactions
      .filter((item) => item.transactionType === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const balance = accounts.reduce(
      (sum, account) => sum + Number(account.currentBalance || 0),
      0
    );

    return {
      income,
      expenses,
      balance,
      availableBalance: balance,
    };
  }, [accounts, transactions]);

  const selectedProvider = providers.find(
    (provider) => String(provider.id) === String(accountForm.providerId)
  );

  const accountType =
    selectedProvider?.providerType === "mobile_money"
      ? "mobile_money"
      : "bank";

  const showMessage = (message) => {
    setSuccess(message);
    setError("");

    window.setTimeout(() => setSuccess(""), 4000);
  };

  async function submitAccount(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await request("/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          providerId: Number(accountForm.providerId),
          accountName: accountForm.accountName,
          accountType,
          accountNumberLast4: accountForm.accountNumberLast4,
        }),
      });

      setAccountForm({
        providerId: "",
        accountName: "",
        accountNumberLast4: "",
      });

      showMessage("Financial account added successfully.");
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitIncomeSource(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await request("/finance/income-sources", {
        method: "POST",
        body: JSON.stringify(incomeSourceForm),
      });

      setIncomeSourceForm({
        sourceName: "",
        sourceType: "salary",
        description: "",
      });

      showMessage("Income source added successfully.");
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitIncome(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await request("/finance/income", {
        method: "POST",
        body: JSON.stringify({
          ...incomeForm,
          accountId: Number(incomeForm.accountId),
          incomeSourceId: Number(incomeForm.incomeSourceId),
          amount: Number(incomeForm.amount),
        }),
      });

      setIncomeForm({
        accountId: "",
        incomeSourceId: "",
        amount: "",
        description: "",
      });

      showMessage("Income recorded successfully.");
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await request("/finance/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...expenseForm,
          accountId: Number(expenseForm.accountId),
          amount: Number(expenseForm.amount),
        }),
      });

      setExpenseForm({
        accountId: "",
        amount: "",
        category: "Food",
        description: "",
      });

      showMessage("Expense recorded successfully.");
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetBudgetForm() {
    setEditingBudgetId(null);
    setBudgetForm(emptyBudgetForm());
  }

  async function submitBudget(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...budgetForm,
        budgetAmount: Number(budgetForm.budgetAmount),
        endDate: budgetForm.endDate || null,
      };

      if (editingBudgetId) {
        await request(`/finance/budgets/${editingBudgetId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        showMessage("Budget updated successfully.");
      } else {
        await request("/finance/budgets", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showMessage("Budget created successfully.");
      }

      resetBudgetForm();
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function editBudget(budget) {
    setEditingBudgetId(budget.id);

    setBudgetForm({
      budgetName: budget.budgetName,
      category: budget.category,
      budgetAmount: budget.budgetAmount,
      currency: budget.currency || "RWF",
      periodType: budget.periodType,
      startDate: budget.startDate,
      endDate: budget.endDate || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateBudgetStatus(budgetId, status) {
    const confirmed = window.confirm(
      `Are you sure you want to mark this budget as ${status}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await request(`/finance/budgets/${budgetId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ budgetStatus: status }),
      });

      showMessage(`Budget marked as ${status}.`);
      await loadFinance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const navigation = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "accounts", label: "My accounts", icon: "▣" },
    { id: "income", label: "Income", icon: "↗" },
    { id: "expenses", label: "Expenses", icon: "↘" },
    { id: "budgets", label: "Budgets", icon: "▤" },
    { id: "transactions", label: "Transactions", icon: "⇄" },
  ];

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#172432]";

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-950";

  const labelClass =
    "block text-sm font-semibold text-slate-700 dark:text-slate-200";

  function StatCard({ title, amount, icon, color, subtitle }) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${color}`}>
            {icon}
          </span>
        </div>
        <h3 className="mt-5 break-words text-2xl font-black tracking-tight">
          {amount}
        </h3>
        <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
      </div>
    );
  }

  function TransactionList({ items }) {
    if (!items.length) {
      return (
        <div className="py-12 text-center">
          <div className="text-4xl text-slate-300">⇄</div>
          <p className="mt-3 font-semibold">No transactions yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Your recorded financial activity will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.map((item) => {
          const isIncome = item.transactionType === "income";

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                }`}>
                  {isIncome ? "↗" : "↘"}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {item.description || item.category || item.transactionType}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.accountName || "Account"} ·{" "}
                    {item.transactionDate
                      ? new Date(item.transactionDate).toLocaleDateString()
                      : "Date unavailable"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-bold ${
                  isIncome ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {isIncome ? "+" : "-"}
                  {money(item.amount, item.currency || "RWF")}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-400">
                  {item.transactionStatus}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your financial information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADING */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span>UMUTURAGE.RW</span>
            <span className="text-slate-400">/</span>
            <span>PERSONAL FINANCE</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
            My Finances
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your accounts, income, budgets and spending in one place.
          </p>
        </div>

        <button
          onClick={loadFinance}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          ↻ Refresh data
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ {success}
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-[#172432]">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              section === item.id
                ? "bg-[#102D50] text-white shadow"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {section === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Balance"
              amount={money(totals.balance)}
              icon="◈"
              color="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              subtitle="Actual money in your accounts"
            />

            <StatCard
              title="Total Income"
              amount={money(totals.income)}
              icon="↗"
              color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              subtitle="Successfully recorded income"
            />

            <StatCard
              title="Total Expenses"
              amount={money(totals.expenses)}
              icon="↘"
              color="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              subtitle="Successfully recorded expenses"
            />

            <StatCard
              title="Available Balance"
              amount={money(totals.availableBalance)}
              icon="◎"
              color="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              subtitle="Current balance across your accounts"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className={`${cardClass} xl:col-span-2`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Recent transactions</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Your latest recorded financial activity
                  </p>
                </div>
                <button
                  onClick={() => setSection("transactions")}
                  className="text-xs font-bold text-emerald-600"
                >
                  View all →
                </button>
              </div>
              <div className="mt-3">
                <TransactionList items={transactions.slice(0, 5)} />
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="font-bold">My accounts</h2>
              <p className="mt-1 text-xs text-slate-400">
                Your registered financial accounts
              </p>
              <div className="mt-4 space-y-3">
                {accounts.length ? accounts.map((account) => (
                  <div key={account.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{account.providerName}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Manual
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {account.accountName} · {account.accountNumberMasked || "No number"}
                    </p>
                    <p className="mt-3 font-black">
                      {money(account.currentBalance, account.currency)}
                    </p>
                  </div>
                )) : (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No accounts added yet.
                  </p>
                )}
              </div>
              <button
                onClick={() => setSection("accounts")}
                className="mt-4 w-full rounded-xl bg-[#102D50] py-3 text-sm font-bold text-white hover:bg-[#173D68]"
              >
                + Manage accounts
              </button>
            </section>
          </div>

          <section className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Budget overview</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Monitor your active spending limits.
                </p>
              </div>
              <button
                onClick={() => setSection("budgets")}
                className="text-xs font-bold text-emerald-600"
              >
                View budgets →
              </button>
            </div>

            {budgets.filter((b) => b.budgetStatus === "active").length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {budgets
                  .filter((b) => b.budgetStatus === "active")
                  .slice(0, 4)
                  .map((budget) => (
                    <div key={budget.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-bold">{budget.budgetName}</span>
                        <span className="text-xs font-bold text-emerald-600">
                          {Number(budget.spendingPercentage || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(Number(budget.spendingPercentage || 0), 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {money(budget.amountSpent, budget.currency)} spent of {money(budget.budgetAmount, budget.currency)}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                You have no active budgets yet.
              </p>
            )}
          </section>
        </>
      )}

      {/* ACCOUNTS */}
      {section === "accounts" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold">Add a financial account</h2>
            <p className="mt-1 text-sm text-slate-400">
              Register a bank or mobile-money account for manual tracking.
            </p>

            <form onSubmit={submitAccount} className="mt-6 space-y-4">
              <label className={labelClass}>
                Financial provider
                <select
                  required
                  value={accountForm.providerId}
                  onChange={(e) => setAccountForm({
                    ...accountForm,
                    providerId: e.target.value,
                  })}
                  className={inputClass}
                >
                  <option value="">Choose provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.providerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Account name
                <input
                  required
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({
                    ...accountForm,
                    accountName: e.target.value,
                  })}
                  placeholder="e.g. My personal account"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Last four digits (optional)
                <input
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={accountForm.accountNumberLast4}
                  onChange={(e) => setAccountForm({
                    ...accountForm,
                    accountNumberLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })}
                  placeholder="1234"
                  className={inputClass}
                />
              </label>

              <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                This version is for manual tracking. Never enter your bank PIN,
                mobile-money PIN or OTP here.
              </div>

              <button
                disabled={saving || !accountForm.providerId}
                className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add account"}
              </button>
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold">Your accounts</h2>
            <p className="mt-1 text-sm text-slate-400">
              Accounts registered under your citizen profile.
            </p>
            <div className="mt-5 space-y-3">
              {accounts.length ? accounts.map((account) => (
                <div key={account.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{account.providerName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {account.accountName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {account.accountNumberMasked}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      {account.connectionStatus}
                    </span>
                  </div>
                  <p className="mt-4 text-xl font-black">
                    {money(account.currentBalance, account.currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {account.integrationStatus === "live"
                      ? "Provider integration available"
                      : "Manual tracking · Live connection not configured"}
                  </p>
                </div>
              )) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  You have not added any accounts.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* INCOME */}
      {section === "income" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold">Record income</h2>
            <p className="mt-1 text-sm text-slate-400">
              Record money received into one of your accounts.
            </p>

            <form onSubmit={submitIncome} className="mt-6 space-y-4">
              <label className={labelClass}>
                Deposit into account
                <select
                  required
                  value={incomeForm.accountId}
                  onChange={(e) => setIncomeForm({
                    ...incomeForm,
                    accountId: e.target.value,
                  })}
                  className={inputClass}
                >
                  <option value="">Choose account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.providerName} — {account.accountName}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Income source
                <select
                  required
                  value={incomeForm.incomeSourceId}
                  onChange={(e) => setIncomeForm({
                    ...incomeForm,
                    incomeSourceId: e.target.value,
                  })}
                  className={inputClass}
                >
                  <option value="">Choose income source</option>
                  {incomeSources.filter((source) => Number(source.isActive) === 1).map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.sourceName}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Amount (RWF)
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({
                    ...incomeForm,
                    amount: e.target.value,
                  })}
                  placeholder="500000"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Description
                <input
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({
                    ...incomeForm,
                    description: e.target.value,
                  })}
                  placeholder="Monthly salary"
                  className={inputClass}
                />
              </label>

              <button
                disabled={saving || !accounts.length || !incomeSources.length}
                className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Recording..." : "Record income"}
              </button>

              {(!accounts.length || !incomeSources.length) && (
                <p className="text-xs text-amber-600">
                  Add an account and an income source before recording income.
                </p>
              )}
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold">Income sources</h2>
            <p className="mt-1 text-sm text-slate-400">
              Organize the different ways you earn money.
            </p>

            <form onSubmit={submitIncomeSource} className="mt-5 space-y-3">
              <label className={labelClass}>
                Source name
                <input
                  required
                  value={incomeSourceForm.sourceName}
                  onChange={(e) => setIncomeSourceForm({
                    ...incomeSourceForm,
                    sourceName: e.target.value,
                  })}
                  placeholder="e.g. Monthly salary"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Income type
                <select
                  value={incomeSourceForm.sourceType}
                  onChange={(e) => setIncomeSourceForm({
                    ...incomeSourceForm,
                    sourceType: e.target.value,
                  })}
                  className={inputClass}
                >
                  {incomeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Description (optional)
                <input
                  value={incomeSourceForm.description}
                  onChange={(e) => setIncomeSourceForm({
                    ...incomeSourceForm,
                    description: e.target.value,
                  })}
                  placeholder="Describe this income source"
                  className={inputClass}
                />
              </label>

              <button
                disabled={saving}
                className="w-full rounded-xl border border-emerald-600 py-3 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                {saving ? "Saving..." : "+ Add income source"}
              </button>
            </form>

            <div className="mt-6 space-y-2">
              {incomeSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <div>
                    <p className="text-sm font-bold">{source.sourceName}</p>
                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {source.sourceType}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    Number(source.isActive) === 1
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-500"
                  }`}>
                    {Number(source.isActive) === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
              {!incomeSources.length && (
                <p className="py-5 text-center text-sm text-slate-400">
                  No income sources added yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* EXPENSES */}
      {section === "expenses" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold">Record an expense</h2>
            <p className="mt-1 text-sm text-slate-400">
              Record money spent from your account.
            </p>

            <form onSubmit={submitExpense} className="mt-6 space-y-4">
              <label className={labelClass}>
                Pay from account
                <select
                  required
                  value={expenseForm.accountId}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    accountId: e.target.value,
                  })}
                  className={inputClass}
                >
                  <option value="">Choose account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.providerName} — {account.accountName} ({money(account.currentBalance)})
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Expense category
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    category: e.target.value,
                  })}
                  className={inputClass}
                >
                  {expenseCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Amount (RWF)
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    amount: e.target.value,
                  })}
                  placeholder="25000"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Description
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })}
                  placeholder="Monthly groceries"
                  className={inputClass}
                />
              </label>

              <button
                disabled={saving || !accounts.length}
                className="w-full rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {saving ? "Recording..." : "Record expense"}
              </button>

              {!accounts.length && (
                <p className="text-xs text-amber-600">
                  Add a financial account before recording expenses.
                </p>
              )}
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold">Spending overview</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your recorded expense categories.
            </p>

            {expenseCategories.map((category) => {
              const amount = transactions
                .filter((item) =>
                  item.transactionType === "expense" &&
                  item.category === category &&
                  String(item.transactionStatus || "").toLowerCase() === "completed"
                )
                .reduce((sum, item) => sum + Number(item.amount || 0), 0);

              if (!amount) return null;

              const percentage = totals.expenses
                ? (amount / totals.expenses) * 100
                : 0;

              return (
                <div key={category} className="mt-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold">{category}</span>
                    <span className="font-bold">{money(amount)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {totals.expenses === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                Your spending categories will appear here after recording expenses.
              </div>
            )}
          </section>
        </div>
      )}

      {/* BUDGETS */}
      {section === "budgets" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total budgets
              </p>
              <h3 className="mt-3 text-2xl font-black">{budgets.length}</h3>
            </div>

            <div className={cardClass}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active budget allocation
              </p>
              <h3 className="mt-3 break-words text-2xl font-black">
                {money(
                  budgets
                    .filter((b) => b.budgetStatus === "active")
                    .reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0)
                )}
              </h3>
            </div>

            <div className={cardClass}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Amount spent
              </p>
              <h3 className="mt-3 break-words text-2xl font-black text-rose-600">
                {money(
                  budgets
                    .filter((b) => b.budgetStatus === "active")
                    .reduce((sum, b) => sum + Number(b.amountSpent || 0), 0)
                )}
              </h3>
            </div>
          </div>

          <section className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  {editingBudgetId ? "Edit budget" : "Create a budget"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Set a spending limit for a category and period.
                </p>
              </div>

              {editingBudgetId && (
                <button
                  type="button"
                  onClick={resetBudgetForm}
                  className="text-sm font-bold text-rose-600"
                >
                  Cancel editing
                </button>
              )}
            </div>

            <form onSubmit={submitBudget} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Budget name
                <input
                  required
                  maxLength={150}
                  value={budgetForm.budgetName}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    budgetName: e.target.value,
                  })}
                  placeholder="e.g. Monthly Food Budget"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Expense category
                <select
                  required
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    category: e.target.value,
                  })}
                  className={inputClass}
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Budget amount (RWF)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={budgetForm.budgetAmount}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    budgetAmount: e.target.value,
                  })}
                  placeholder="150000"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Budget period
                <select
                  required
                  value={budgetForm.periodType}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    periodType: e.target.value,
                  })}
                  className={inputClass}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label className={labelClass}>
                Start date
                <input
                  required
                  type="date"
                  value={budgetForm.startDate}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    startDate: e.target.value,
                    endDate:
                      e.target.value && budgetForm.endDate &&
                      budgetForm.endDate < e.target.value
                        ? ""
                        : budgetForm.endDate,
                  })}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                End date (optional)
                <input
                  type="date"
                  min={budgetForm.startDate}
                  value={budgetForm.endDate}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    endDate: e.target.value,
                  })}
                  className={inputClass}
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingBudgetId
                      ? "Update budget"
                      : "+ Create budget"}
                </button>
              </div>
            </form>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">My budgets</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Monitor your spending against your limits.
                </p>
              </div>

              <button
                onClick={loadFinance}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-600"
              >
                ↻ Refresh budgets
              </button>
            </div>

            {budgets.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {budgets.map((budget) => {
                  const amount = Number(budget.budgetAmount || 0);
                  const spent = Number(budget.amountSpent || 0);
                  const remaining = Number(budget.remainingAmount || 0);
                  const percentage = Number(budget.spendingPercentage || 0);
                  const overBudget = Boolean(budget.isOverBudget);

                  const statusColors = {
                    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                    completed: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                  };

                  return (
                    <article
                      key={budget.id}
                      className={`${cardClass} ${
                        overBudget ? "border-rose-300 dark:border-rose-800" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{budget.budgetName}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {budget.category} · {budget.periodType}
                          </p>
                        </div>

                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold capitalize ${
                          statusColors[budget.budgetStatus] || statusColors.cancelled
                        }`}>
                          {budget.budgetStatus}
                        </span>
                      </div>

                      <div className="mt-6 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-400">Amount spent</p>
                          <p className="mt-1 text-xl font-black">
                            {money(spent, budget.currency)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400">Budget limit</p>
                          <p className="mt-1 font-bold">
                            {money(amount, budget.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex justify-between gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Spending progress
                          </span>
                          <span className={`font-bold ${
                            overBudget ? "text-rose-600" : "text-emerald-600"
                          }`}>
                            {percentage.toFixed(2)}%
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              overBudget ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {overBudget ? "Over budget" : "Remaining"}
                        </span>
                        <span className={`text-sm font-black ${
                          overBudget ? "text-rose-600" : "text-emerald-600"
                        }`}>
                          {money(remaining, budget.currency)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {budget.budgetStatus === "active" && (
                          <>
                            <button
                              onClick={() => editBudget(budget)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                              Edit
                            </button>

                            <button
                              disabled={saving}
                              onClick={() => updateBudgetStatus(budget.id, "completed")}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                            >
                              Complete
                            </button>

                            <button
                              disabled={saving}
                              onClick={() => updateBudgetStatus(budget.id, "cancelled")}
                              className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
                            >
                              Cancel budget
                            </button>
                          </>
                        )}

                        {budget.budgetStatus !== "active" && (
                          <span className="text-xs text-slate-400">
                            This budget is no longer active.
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-[11px] text-slate-400">
                        {budget.startDate}
                        {budget.endDate ? ` — ${budget.endDate}` : " — No end date"}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={`${cardClass} py-12 text-center`}>
                <div className="text-4xl text-slate-300">▤</div>
                <h3 className="mt-3 font-bold">No budgets created yet</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Create your first budget to start monitoring your spending.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TRANSACTIONS */}
      {section === "transactions" && (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Transaction history</h2>
              <p className="mt-1 text-sm text-slate-400">
                All income and expenses recorded in your account.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {transactions.length} transactions
            </span>
          </div>
          <div className="mt-4">
            <TransactionList items={transactions} />
          </div>
        </section>
      )}

      {/* DATA STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <span>✓ Connected to Umuturage.rw financial records</span>
        <span>Currency: RWF · Manual tracking</span>
      </div>
    </div>
  );
}

export default Finance;
