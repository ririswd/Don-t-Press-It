import { describe, expect, it } from "vitest";
import { walletErrorMessage } from "./walletError";

describe("wallet error messages", () => {
  const fallback = "Something went wrong.";

  it("explains a declined MetaMask request without exposing transaction data", () => {
    const result = walletErrorMessage(
      new Error("MetaMask Tx Signature: User denied transaction signature."),
      fallback,
    );

    expect(result).toBe("Transaction cancelled in MetaMask. Nothing was sent—choose again when you are ready.");
  });

  it("recognizes Inco relay failures", () => {
    expect(walletErrorMessage(new Error("Transaction relay error - REVERTED"), fallback)).toContain(
      "encrypted relay",
    );
  });

  it("uses the supplied fallback for an unknown error", () => {
    expect(walletErrorMessage(new Error("unexpected issue"), fallback)).toBe(fallback);
  });
});
