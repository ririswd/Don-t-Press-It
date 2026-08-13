import { describe, expect, it } from "vitest";
import { gameScreen } from "./gameScreen";

describe("gameScreen", () => {
  it("returns players to the choice screen after nextRound clears finalization", () => {
    expect(gameScreen("result", true, true, false)).toBe("choice");
  });

  it("keeps a finalized room on the results screen", () => {
    expect(gameScreen("choice", true, true, true)).toBe("result");
  });
});
