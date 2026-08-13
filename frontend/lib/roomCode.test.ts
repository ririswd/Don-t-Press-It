import { describe, expect, it } from "vitest";
import { parseRoomReference, roomCode, roomLink } from "./roomCode";

describe("room invite codes", () => {
  it("creates reversible invite codes", () => {
    for (const roomId of [1n, 4n, 42n, 999_999n, 2n ** 48n]) {
      expect(parseRoomReference(roomCode(roomId))).toBe(roomId);
    }
  });

  it("keeps legacy numeric references usable", () => {
    expect(parseRoomReference("4")).toBe(4n);
    expect(parseRoomReference(" 42 ")).toBe(42n);
  });

  it("rejects malformed or tampered invite codes", () => {
    expect(parseRoomReference("DPI-0853A9-TX")).toBeUndefined();
    expect(parseRoomReference("DPI-INVALID-TV")).toBeUndefined();
    expect(parseRoomReference("0")).toBeUndefined();
    expect(parseRoomReference("room-4")).toBeUndefined();
  });

  it("creates a complete share link", () => {
    expect(roomLink("https://dont-press-it.example", 4n)).toBe(
      `https://dont-press-it.example/?room=${roomCode(4n)}`,
    );
  });
});
