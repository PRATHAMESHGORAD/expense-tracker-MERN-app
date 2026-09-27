import { useEffect, useState } from "react";
import api from "../api/client";
import { useData } from "../context/DataContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateMessages";
import Modal from "../components/Modal";

const TYPES = ["Cash", "Bank Account", "Credit Card", "Wallet", "Savings"];

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

export default function Accounts() {
  const { accounts, combinedTotal, refreshAccounts } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", type: "Cash", initialBalance: "" });
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      await refreshAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "Cash", initialBalance: "" });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type, initialBalance: String(acc.initialBalance ?? "") });
    setFormError("");
    setShowForm(true);
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = { ...form, initialBalance: parseFloat(form.initialBalance) || 0 };
    try {
      if (editing) {
        await api.put(`/accounts/${editing._id}`, payload);
      } else {
        await api.post("/accounts", payload);
      }
      setShowForm(false);
      await refreshAccounts();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save account.");
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Delete "${acc.name}"?`)) return;
    try {
      await api.delete(`/accounts/${acc._id}`);
      await refreshAccounts();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete account.");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState label={error} />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Accounts & Wallets</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Account
        </button>
      </div>

      <div className="stat-card" style={{ marginBottom: "1.5rem" }}>
        <span className="stat-label">Combined Total</span>
        <span className="stat-value">{formatMoney(combinedTotal)}</span>
      </div>

      {accounts.length === 0 ? (
        <EmptyState label="No accounts yet." />
      ) : (
        <div className="account-grid">
          {accounts.map((acc) => (
            <div key={acc._id} className="card account-card">
              <div className="account-card-header">
                <span className="account-type-badge">{acc.type}</span>
                <div className="txn-actions">
                  <button className="btn btn-ghost btn-small" onClick={() => openEdit(acc)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost btn-small danger" onClick={() => handleDelete(acc)}>
                    Delete
                  </button>
                </div>
              </div>
              <h3>{acc.name}</h3>
              <span className={"stat-value " + (acc.balance >= 0 ? "positive" : "negative")}>
                {formatMoney(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Account" : "Add Account"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="transaction-form">
            {formError && <div className="form-error">{formError}</div>}
            <label>
              Name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Initial Balance
              <input
                type="number"
                step="0.01"
                value={form.initialBalance}
                onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              />
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
