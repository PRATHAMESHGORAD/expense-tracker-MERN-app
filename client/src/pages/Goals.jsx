import { useEffect, useState } from "react";
import api from "../api/client";
import { LoadingState, ErrorState, EmptyState } from "../components/StateMessages";
import Modal from "../components/Modal";

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "" });
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/goals", {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        targetDate: form.targetDate || undefined,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save goal.");
    }
  };

  const addToGoal = async (goal) => {
    const amountStr = window.prompt(`Add how much to "${goal.name}"?`, "100");
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) return;
    await api.put(`/goals/${goal._id}`, { currentAmount: goal.currentAmount + amount });
    load();
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete goal "${goal.name}"?`)) return;
    await api.delete(`/goals/${goal._id}`);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState label={error} />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Savings Goals</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState label="No savings goals yet." />
      ) : (
        <div className="account-grid">
          {goals.map((g) => (
            <div key={g._id} className="card">
              <div className="account-card-header">
                <h3>{g.name}</h3>
                <div className="txn-actions">
                  <button className="btn btn-ghost btn-small" onClick={() => addToGoal(g)}>
                    Add funds
                  </button>
                  <button className="btn btn-ghost btn-small danger" onClick={() => handleDelete(g)}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="stat-sublabel">
                {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
              </p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${g.progress}%` }} />
              </div>
              <p className="stat-sublabel">
                {g.progress}% {g.targetDate && `· by ${new Date(g.targetDate).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Add Savings Goal" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="transaction-form">
            {formError && <div className="form-error">{formError}</div>}
            <label>
              Goal name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Target amount
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </label>
            <label>
              Already saved
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </label>
            <label>
              Target date
              <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
