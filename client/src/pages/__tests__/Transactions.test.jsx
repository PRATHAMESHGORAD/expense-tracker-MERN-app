import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Transactions from "../Transactions";

const refreshAccounts = vi.fn();
const refreshCategories = vi.fn();

vi.mock("../../context/DataContext", () => ({
  useData: () => ({
    accounts: [{ _id: "acc1", name: "Cash" }],
    categories: [
      { _id: "c1", name: "Food", type: "expense" },
      { _id: "c2", name: "Salary", type: "income" },
    ],
    refreshAccounts,
    refreshCategories,
  }),
}));

const apiGet = vi.fn();
vi.mock("../../api/client", () => ({
  default: { get: (...args) => apiGet(...args), delete: vi.fn() },
}));

const sampleData = {
  transactions: [
    { _id: "1", date: "2026-09-01", category: "Food", account: { name: "Cash" }, note: "Lunch", amount: 250, type: "expense" },
    { _id: "2", date: "2026-09-02", category: "Salary", account: { name: "Cash" }, note: "", amount: 5000, type: "income" },
  ],
  pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

describe("Transactions page", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({ data: sampleData });
  });

  it("renders the fetched transactions in a table", async () => {
    render(<Transactions />);
    const rows = await screen.findAllByRole("row");
    // First row is the header; the two data rows should contain our sample categories.
    expect(rows[1]).toHaveTextContent("Food");
    expect(rows[2]).toHaveTextContent("Salary");
  });

  it("re-fetches with the type filter applied when the user picks a type", async () => {
    render(<Transactions />);
    await screen.findByText("Food");
    apiGet.mockClear();

    fireEvent.change(screen.getByDisplayValue("All types"), { target: { value: "expense" } });

    await waitFor(() => {
      const call = apiGet.mock.calls.find((c) => c[0] === "/transactions");
      expect(call[1].params).toMatchObject({ type: "expense", page: 1 });
    });
  });

  it("shows an empty state when no transactions match the filters", async () => {
    apiGet.mockResolvedValue({ data: { transactions: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } });
    render(<Transactions />);
    expect(await screen.findByText(/no transactions match/i)).toBeInTheDocument();
  });
});
