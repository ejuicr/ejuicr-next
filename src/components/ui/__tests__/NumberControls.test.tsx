import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NumberControls from "../NumberControls";

describe("NumberControls", () => {
  it("names its buttons with the field they control", () => {
    const onChange = vi.fn();
    render(
      <NumberControls
        value={5}
        step={1}
        label="target amount"
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Decrease target amount" }),
    );
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.click(
      screen.getByRole("button", { name: "Increase target amount" }),
    );
    expect(onChange).toHaveBeenCalledWith(6);
  });
});
