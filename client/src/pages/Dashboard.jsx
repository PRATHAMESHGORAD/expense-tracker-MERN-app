import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "../api/client";
import { LoadingState, ErrorState, EmptyState } from "../components/StateMessages";
import Modal from "../components/Modal";
import TransactionForm from "../components/TransactionForm";
import { categoryIcon } from "../utils/categoryIcons";

const COLORS = ["#4f46e5", "#f97316"];

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, recentRes] = await Promise.all([
        api.get("/analytics/summary"),
        api.get("/transactions/recent?count=8"),
      ]);
      setSummary(summaryRes.data);
      setRecent(recentRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState label={error} />;

  const chartData = [
    { name: "Income", value: summary.monthlyIncome },
    { name: "Expense", value: summary.monthlyExpense },
  ];
  const hasChartData = summary.monthlyIncome > 0 || summary.monthlyExpense > 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Transaction
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Balance</span>
          <span className="stat-value">{formatMoney(summary.totalBalance)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Income</span>
          <span className="stat-value positive">{formatMoney(summary.totalIncome)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Expenses</span>
          <span className="stat-value negative">{formatMoney(summary.totalExpense)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Monthly Budget</span>
          <span className="stat-value">
            {summary.monthlyBudget ? formatMoney(summary.monthlyBudget) : "Not set"}
          </span>
          {summary.monthlyBudget > 0 && (
            <div className="progress-bar">
              <div
                className={"progress-fill" + (summary.percentBudgetUsed >= 100 ? " over" : "")}
                style={{ width: `${Math.min(100, summary.percentBudgetUsed)}%` }}
              />
            </div>
          )}
          {summary.monthlyBudget > 0 && (
            <span className="stat-sublabel">{summary.percentBudgetUsed}% used</span>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>This Month: Income vs Expense</h2>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No transactions yet this month." />
          )}
        </div>

        <div className="card">
          <h2>Recent Transactions</h2>
          {recent.length === 0 ? (
            <EmptyState label="No transactions yet. Add your first one!" />
          ) : (
            <ul className="txn-list">
              {recent.map((t) => (
                <li key={t._id} className="txn-row">
                  <div>
                    <span className="txn-category">{categoryIcon(t.category)} {t.category}</span>
                    <span className="txn-meta">
                      {t.account?.name} &middot; {new Date(t.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={"txn-amount " + (t.type === "income" ? "positive" : "negative")}>
                    {t.type === "income" ? "+" : "-"}
                    {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add Transaction" onClose={() => setShowAddModal(false)}>
          <TransactionForm
            onSaved={() => {
              setShowAddModal(false);
              load();
            }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
