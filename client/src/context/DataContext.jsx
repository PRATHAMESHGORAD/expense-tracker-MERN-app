import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/client";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [categories, setCategories] = useState([]);

  const refreshAccounts = useCallback(async () => {
    const res = await api.get("/accounts");
    setAccounts(res.data.accounts);
    setCombinedTotal(res.data.combinedTotal);
    return res.data;
  }, []);

  const refreshCategories = useCallback(async () => {
    const res = await api.get("/categories");
    setCategories(res.data);
    return res.data;
  }, []);

  return (
    <DataContext.Provider
      value={{ accounts, combinedTotal, categories, refreshAccounts, refreshCategories }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
