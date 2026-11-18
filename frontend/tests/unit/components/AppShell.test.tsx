import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppShell, useAppShell } from "../../../src/components/AppShell";

function SidebarContent() {
  const { closeDrawer } = useAppShell();
  return <button onClick={closeDrawer}>Pick</button>;
}

describe("AppShell", () => {
  it("renders sidebar and main content", () => {
    render(
      <AppShell sidebar={<SidebarContent />}>
        <p>Main</p>
      </AppShell>,
    );
    expect(screen.getByRole("complementary", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Main");
  });

  it("toggles the drawer with the menu button", async () => {
    render(<AppShell sidebar={<SidebarContent />}>x</AppShell>);
    const toggle = screen.getByRole("button", { name: "Open categories" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close categories" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "true");
  });

  it("closes the drawer with Escape", async () => {
    render(<AppShell sidebar={<SidebarContent />}>x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Open categories" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "false");
  });

  it("closes the drawer from the overlay or a sidebar action", async () => {
    render(<AppShell sidebar={<SidebarContent />}>x</AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Open categories" }));
    await userEvent.click(screen.getByTestId("drawer-overlay"));
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "false");

    await userEvent.click(screen.getByRole("button", { name: "Open categories" }));
    await userEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(screen.getByRole("complementary")).toHaveAttribute("data-open", "false");
  });
});
