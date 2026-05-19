import { apiFetch } from "./client";
import type {
  FinanceExpenseCategoryAmounts,
  FinanceExpenseCategoryPercents,
  FinanceExpenseMonth,
  FinanceExpensesYear,
  FinanceIncomeMonth,
  FinanceIncomeYear,
  FinanceSettings
} from "./types";

export type FinanceExpensePayload = {
  category_amounts: Partial<FinanceExpenseCategoryAmounts>;
};

export type FinanceIncomePayload = {
  salary_amount: string;
  bonus_percent: string;
  total_amount: string;
};

export type FinanceSettingsPayload = {
  salary_amount: string;
  bonus_percent: string;
  expense_limit_percents: Partial<FinanceExpenseCategoryPercents>;
};

export function listExpenses(year: number): Promise<FinanceExpensesYear> {
  return apiFetch<FinanceExpensesYear>(
    `/api/v1/finance/expenses?year=${encodeURIComponent(String(year))}`
  );
}

export function saveExpenseMonth(
  year: number,
  month: number,
  payload: FinanceExpensePayload
): Promise<FinanceExpenseMonth> {
  return apiFetch<FinanceExpenseMonth>(`/api/v1/finance/expenses/${year}/${month}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function listIncome(year: number): Promise<FinanceIncomeYear> {
  return apiFetch<FinanceIncomeYear>(
    `/api/v1/finance/income?year=${encodeURIComponent(String(year))}`
  );
}

export function saveIncomeMonth(
  year: number,
  month: number,
  payload: FinanceIncomePayload
): Promise<FinanceIncomeMonth> {
  return apiFetch<FinanceIncomeMonth>(`/api/v1/finance/income/${year}/${month}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getSettings(): Promise<FinanceSettings> {
  return apiFetch<FinanceSettings>("/api/v1/finance/settings");
}

export function saveSettings(payload: FinanceSettingsPayload): Promise<FinanceSettings> {
  return apiFetch<FinanceSettings>("/api/v1/finance/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
