import { useEffect, useState } from "react";
import api from "../api/client";
import { LoadingState, ErrorState } from "../components/StateMessages";
import { useData } from "../context/DataContext";

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

const WARNING_LABELS = {
  moderate: "50%+ used",
  high: "75%+ used",
  critical: "90%+ used",
  exceeded: "Exceeded",
};

export default function Budgets() {
  const { categories, refreshCategories } = useData();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overallInput, setOverallInput] = useState("");
  const [categoryInput, setCategoryInput] = useState({ category: "", limit: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/budgets/current");
      setBudget(res.data);
      setOverallInput(res.data.overallLimit || "");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load budget.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    refreshCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveOverall = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/budgets/overall", { overallLimit: parseFloat(overallInput) || 0 });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!categoryInput.category || categoryInput.limit === "") return;
    setSaving(true);
    try {
      await api.put("/budgets/category", {
        category: categoryInput.category,
        limit: parseFloat(categoryInput.limit) || 0,
      });
      setCategoryInput({ category: "", limit: "" });
      await load();
    } finally {
      setSaving(false);
    }
  };
  const deleteCategoryBudget = async (category) => {
    if (!window.confirm(`Remove the budget limit for "${category}"?`)) return;
    setSaving(true);
    try {
      await api.delete(`/budgets/category/${encodeURIComponent(category)}`);
      await load();
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <LoadingState />;
  if (error) return <ErrorState label={error} />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Budgets — {budget.monthName}</h1>
      </div>

      <div className="card">
        <h2>Overall Monthly Budget</h2>
        {budget.overallLimit > 0 && (
          <>
            <div className="progress-bar">
              <div
                className={"progress-fill" + (budget.overallWarning === "exceeded" ? " over" : "")}
                style={{ width: `${Math.min(100, budget.overallPercent)}%` }}
              />
            </div>
            <p className="stat-sublabel">
              {formatMoney(budget.totalSpent)} of {formatMoney(budget.overallLimit)} spent ({budget.overallPercent}%)
            </p>
            {budget.overallMessage && (
              <p className={"budget-warning" + (budget.overallWarning === "exceeded" ? " over" : "")}>
                {budget.overallMessage}
              </p>
            )}
          </>
        )}
        <form onSubmit={saveOverall} className="inline-form">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Set monthly limit"
            value={overallInput}
            onChange={(e) => setOverallInput(e.target.value)}
          />
          <button className="btn btn-primary" disabled={saving}>
            Save
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Per-Category Budgets</h2>
        {budget.categories.length === 0 ? (
          <p className="stat-sublabel">No category budgets set yet.</p>
        ) : (
          <ul className="category-budget-list">
            {budget.categories.map((c) => (
              <li key={c.category}>
                  <div className="category-budget-row">
                  <span>{c.category}</span>
                  <span>
                    {formatMoney(c.spent)} / {formatMoney(c.limit)}
                    <button
                      type="button"
                      className="btn btn-ghost btn-small danger"
                      style={{ marginLeft: "0.6rem" }}
                      onClick={() => deleteCategoryBudget(c.category)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={"progress-fill" + (c.warning === "exceeded" ? " over" : "")}
                    style={{ width: `${Math.min(100, c.percent)}%` }}
                  />
                </div>
                {c.warning && <span className="budget-warning small">{WARNING_LABELS[c.warning]}</span>}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={saveCategory} className="inline-form">
            <input
            list="budget-category-options"
            placeholder="Category (e.g. Food)"
            value={categoryInput.category}
            onChange={(e) => setCategoryInput({ ...categoryInput, category: e.target.value })}
          />
          <datalist id="budget-category-options">
            {[...new Set(categories.filter((c) => c.type === "expense").map((c) => c.name))].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Monthly limit"
            value={categoryInput.limit}
            onChange={(e) => setCategoryInput({ ...categoryInput, limit: e.target.value })}
          />
          <button className="btn btn-primary" disabled={saving}>
            Add / Update
          </button>
        </form>
      </div>
    </div>
  );
}
