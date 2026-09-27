import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TransactionForm from "../TransactionForm";

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

const apiPost = vi.fn();
vi.mock("../../api/client", () => ({
  default: { post: (...args) => apiPost(...args), put: vi.fn() },
}));

describe("TransactionForm", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("renders amount, category, and account fields", () => {
    render(<TransactionForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // amount input
    expect(screen.getByDisplayValue("Select category")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Select account")).toBeInTheDocument();
  });

  it("shows a validation error when no account is selected", async () => {
    render(<TransactionForm onSaved={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });
    fireEvent.change(screen.getByDisplayValue("Select category"), { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(await screen.findByText(/select an account/i)).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("submits a valid transaction and calls onSaved", async () => {
    apiPost.mockResolvedValue({ data: { _id: "t1" } });
    const onSaved = vi.fn();
    render(<TransactionForm onSaved={onSaved} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });
    fireEvent.change(screen.getByDisplayValue("Select category"), { target: { value: "Food" } });
    fireEvent.change(screen.getByDisplayValue("Select account"), { target: { value: "acc1" } });
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/transactions", expect.objectContaining({ amount: 500, category: "Food", account: "acc1" })));
    expect(onSaved).toHaveBeenCalled();
  });
});
