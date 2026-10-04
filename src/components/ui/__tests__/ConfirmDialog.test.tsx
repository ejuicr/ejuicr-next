import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  it("exposes an accessible name and closes on Escape", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog label="Delete account" onCancel={onCancel}>
        <button type="button">Cancel</button>
        <button type="button">Delete</button>
      </ConfirmDialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Delete account" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog and restores it when closed", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <ConfirmDialog label="Confirm" onCancel={vi.fn()}>
        <button type="button">Cancel</button>
      </ConfirmDialog>,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("keeps Tab focus inside the dialog", () => {
    render(
      <ConfirmDialog label="Confirm" onCancel={vi.fn()}>
        <button type="button">Cancel</button>
        <button type="button">Delete</button>
      </ConfirmDialog>,
    );

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Delete" });

    remove.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    cancel.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(remove);
  });
});
