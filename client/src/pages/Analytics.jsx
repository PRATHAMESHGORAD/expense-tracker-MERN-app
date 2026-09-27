import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../api/client";
import { LoadingState, ErrorState, EmptyState } from "../components/StateMessages";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "3months", label: "3 Months" },
  { value: "year", label: "Year" },
];

const PIE_COLORS = ["#4f46e5", "#f97316", "#10b981", "#eab308", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16", "#64748b"];

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

// Reshapes the API's { period, type, total } rows into one row per date with
// separate income/expense fields, which is what a grouped bar chart needs.
function toChartRows(trend) {
  const map = new Map();
  for (const row of trend) {
    if (!map.has(row.period)) map.set(row.period, { period: row.period, income: 0, expense: 0 });
    map.get(row.period)[row.type] = row.total;
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export default function Analytics() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/analytics/trends", { params: { period } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics</h1>
        <div className="period-switch">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={"btn btn-ghost" + (period === p.value ? " active" : "")}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState label={error} />
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Net Savings ({period})</span>
              <span className={"stat-value " + (data.netSavings >= 0 ? "positive" : "negative")}>
                {formatMoney(data.netSavings)}
              </span>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Spending Trend</h2>
              {toChartRows(data.trend).length === 0 ? (
                <EmptyState label="No transactions in this period." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={toChartRows(data.trend)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2>Category Breakdown</h2>
              {data.categoryBreakdown.length === 0 ? (
                <EmptyState label="No expenses in this period." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="total"
                      nameKey="category"
                      outerRadius={90}
                      label={(entry) => entry.category}
                    >
                      {data.categoryBreakdown.map((entry, i) => (
                        <Cell key={entry.category} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
