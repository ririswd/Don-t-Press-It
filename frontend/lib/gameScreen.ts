export type GameScreen = "home" | "matchmaking" | "lobby" | "choice" | "locked" | "result";

/** Chooses the visible game screen from the current onchain room state. */
export function gameScreen(screen: GameScreen, hasRoom: boolean, started: boolean, finalized: boolean): GameScreen {
  if (hasRoom && finalized) return "result";
  if (hasRoom && started) return "choice";
  return screen;
}
