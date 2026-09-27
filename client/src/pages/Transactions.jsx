import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { useData } from "../context/DataContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateMessages";
import Modal from "../components/Modal";
import TransactionForm from "../components/TransactionForm";
import { categoryIcon } from "../utils/categoryIcons";

function formatMoney(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

const emptyFilters = { type: "", category: "", account: "", dateFrom: "", dateTo: "", amountMin: "", amountMax: "", search: "" };

export default function Transactions() {
  const { accounts, categories, refreshAccounts, refreshCategories } = useData();
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], pagination: { totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    refreshAccounts();
    refreshCategories();
  }, [refreshAccounts, refreshCategories]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 10 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "") params[k] = v;
      });
      const res = await api.get("/transactions", { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    await api.delete(`/transactions/${id}`);
    load();
  };

  const handleExport = async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "") params[k] = v;
    });
    const res = await api.get("/transactions/export", { params, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={handleExport}>
            Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <input
          placeholder="Search note, category, amount..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {[...new Set(categories.map((c) => c.name))].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={filters.account} onChange={(e) => updateFilter("account", e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} title="From date" />
        <input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} title="To date" />
        <input
          type="number"
          placeholder="Min amount"
          value={filters.amountMin}
          onChange={(e) => updateFilter("amountMin", e.target.value)}
        />
        <input
          type="number"
          placeholder="Max amount"
          value={filters.amountMax}
          onChange={(e) => updateFilter("amountMax", e.target.value)}
        />
        <button className="btn btn-ghost" onClick={() => setFilters(emptyFilters)}>
          Clear
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState label={error} />
      ) : data.transactions.length === 0 ? (
        <EmptyState label="No transactions match your filters." />
      ) : (
        <>
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Account</th>
                <th>Note</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t._id}>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>{categoryIcon(t.category)} {t.category}</td>
                  <td>{t.account?.name}</td>
                  <td className="txn-note">{t.note}</td>
                  <td className={t.type === "income" ? "positive" : "negative"}>
                    {t.type === "income" ? "+" : "-"}
                    {formatMoney(t.amount)}
                  </td>
                  <td className="txn-actions">
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => {
                        setEditing({ ...t, account: t.account?._id });
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-small danger" onClick={() => handleDelete(t._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages || 1}
            </span>
            <button
              className="btn btn-ghost"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Transaction" : "Add Transaction"} onClose={() => setShowForm(false)}>
          <TransactionForm
            initial={editing}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
