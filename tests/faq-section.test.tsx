import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqSection } from "@/components/landing/faq-section";

describe("FaqSection", () => {
  it("reveals an answer from the keyboard-accessible trigger", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const trigger = screen.getByRole("button", { name: "Do I need to connect YouTube?" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/You can start with your own idea/)).toBeVisible();
  });
});
