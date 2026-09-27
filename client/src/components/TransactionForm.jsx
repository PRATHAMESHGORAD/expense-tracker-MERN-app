import { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import api from "../api/client";

const EXPENSE_DEFAULTS = ["Food", "Travel", "Shopping", "Bills", "Rent", "Entertainment", "Health", "Education", "Subscription", "Other"];
const INCOME_DEFAULTS = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ initial, onSaved, onCancel }) {
  const { accounts, categories, refreshAccounts, refreshCategories } = useData();
  const [form, setForm] = useState(
    initial || {
      amount: "",
      type: "expense",
      category: "",
      account: "",
      note: "",
      date: todayStr(),
      attachmentUrl: "",
      isRecurring: false,
      frequency: "monthly",
    }
  );
  const [customCategory, setCustomCategory] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accounts.length) refreshAccounts();
    if (!categories.length) refreshCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions = categories.filter((c) => c.type === form.type).map((c) => c.name);
  const fallbackOptions = form.type === "expense" ? EXPENSE_DEFAULTS : INCOME_DEFAULTS;
  const visibleOptions = categoryOptions.length ? categoryOptions : fallbackOptions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.account) {
      setError("Please select an account.");
      return;
    }
    if (!form.category) {
      setError("Please select or enter a category.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        account: form.account,
        note: form.note,
        date: form.date,
        attachmentUrl: form.attachmentUrl || undefined,
        isRecurring: form.isRecurring,
        recurrence: form.isRecurring ? { frequency: form.frequency } : undefined,
      };

      if (customCategory) {
        // Register the custom category so it shows up in future dropdowns too.
        await api.post("/categories", { name: form.category, type: form.type }).catch(() => {});
        refreshCategories();
      }

      if (initial?._id) {
        await api.put(`/transactions/${initial._id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-row">
        <label>
          Type
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value, category: "" })}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          Category
          {!customCategory ? (
            <select
              value={form.category}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setCustomCategory(true);
                  setForm({ ...form, category: "" });
                } else {
                  setForm({ ...form, category: e.target.value });
                }
              }}
            >
              <option value="">Select category</option>
              {visibleOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">+ Add custom category</option>
            </select>
          ) : (
            <input
              placeholder="New category name"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          )}
        </label>
        <label>
          Account
          <select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>
          Date
          <input type="date" value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label>
          Note
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
        </label>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        Recurring transaction
      </label>

      <label>
        Attachment URL (optional)
        <input
          type="url"
          placeholder="https://..."
          value={form.attachmentUrl}
          onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
        />
      </label>

      {form.isRecurring && (
        <label>
          Repeats
          <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : initial?._id ? "Save changes" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
