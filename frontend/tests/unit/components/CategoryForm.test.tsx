import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { validateCategoryName } from "../../../src/components/CategoryForm";
import { mockDb } from "../../mocks/db";
import { renderApp } from "../helpers";

describe("validateCategoryName", () => {
  it.each([
    ["", "Please enter a category name."],
    ["   ", "Please enter a category name."],
    ["x".repeat(51), "Use at most 50 characters."],
  ])("rejects %j", (name, message) => {
    expect(validateCategoryName(name)).toBe(message);
  });

  it("accepts 1–50 characters after trimming", () => {
    expect(validateCategoryName("  a  ")).toBeNull();
    expect(validateCategoryName("x".repeat(50))).toBeNull();
  });
});

describe("CategoryForm", () => {
  it("shows the empty state and creates the first category", async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Create your first category" }));
    const dialog = screen.getByRole("dialog", { name: "New category" });
    expect(within(dialog).getByLabelText("Category name")).toHaveFocus();

    await user.type(within(dialog).getByLabelText("Category name"), "  Work  ");
    await user.click(within(dialog).getByRole("button", { name: "Create category" }));

    expect(await screen.findByRole("heading", { name: "Work", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Work/ })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects invalid names client-side without calling the API", async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Create your first category" }));
    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a category name.");

    await user.type(screen.getByLabelText("Category name"), "x".repeat(51));
    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use at most 50 characters.");
    expect(mockDb.calls.filter((c) => c.startsWith("POST"))).toEqual([]);
  });

  it("shows a duplicate-name message on 409", async () => {
    mockDb.seedCategory("Work");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.type(screen.getByLabelText("Category name"), "work");
    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A category with this name already exists",
    );
  });

  it("cancels with Escape", async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Create your first category" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("serverMessage", () => {
  it("maps API errors to user-facing messages", async () => {
    const { serverMessage } = await import("../../../src/components/CategoryForm");
    const { ApiError } = await import("../../../src/api/client");
    expect(serverMessage(new ApiError(409, "category_name_conflict", "dup"))).toMatch(/already exists/);
    expect(serverMessage(new ApiError(422, "validation_error", "name: too long"))).toBe("name: too long");
    expect(serverMessage(new ApiError(0, "network_error", "x"))).toMatch(/Could not create/);
    expect(serverMessage(new Error("boom"))).toMatch(/Could not create/);
  });
});
