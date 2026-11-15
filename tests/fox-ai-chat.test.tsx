import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({usePathname:()=>"/help"}));
import { FoxAiChat } from "@/components/support/fox-ai-chat";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("removes redundant labels and displays the actual chat response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:async()=>({message:"Thumbnail Studio requires Gold."})}));
  const user = userEvent.setup(); render(<FoxAiChat />);
  await user.click(screen.getByRole("button",{name:"Open Fox AI support"}));
  expect(screen.queryByText("Scripted Fox support")).not.toBeInTheDocument();
  expect(screen.queryByText(/Helping with/i)).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox",{name:"Ask Fox AI"}),"How do I create thumbnails?");
  await user.click(screen.getByRole("button",{name:"Send to Fox AI"}));
  expect(await screen.findByText("Thumbnail Studio requires Gold.")).toBeVisible();
});
