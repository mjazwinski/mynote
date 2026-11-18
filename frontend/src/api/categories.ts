import { request } from "./client";
import type { Category } from "./types";

export const listCategories = () => request<Category[]>("GET", "/categories");

export const createCategory = (name: string) =>
  request<Category>("POST", "/categories", { name });

export const deleteCategory = (categoryId: string) =>
  request<void>("DELETE", `/categories/${encodeURIComponent(categoryId)}`);
