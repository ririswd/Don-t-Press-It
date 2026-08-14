"use client";

import Image from "next/image";
import { useEffect, useState, type PropsWithChildren } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDontPressIt } from "@/hooks/useDontPressIt";
import { activeChain } from "@/lib/network";
import { parseRoomReference, roomCode, roomLink } from "@/lib/roomCode";

type ScreenName = "home" | "how" | "matchmaking" | "lobby" | "choice" | "result";
type Game = ReturnType<typeof useDontPressIt>;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const shorten = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function Home() {
  const [screen, setScreen] = useState<ScreenName>("home");
  const [roomInput, setRoomInput] = useState("");
  const [roomId, setRoomId] = useState<bigint | undefined>();
  const [now, setNow] = useState(0);
  const game = useDontPressIt(roomId);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("room");
    const id = reference ? parseRoomReference(reference) : undefined;
    if (!id) return;
    setRoomId(id);
    setRoomInput(roomCode(id));
    setScreen("lobby");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectRoom = (id: bigint) => {
    game.clearError();
    setRoomId(id);
    setRoomInput(roomCode(id));
    setScreen("lobby");
    window.history.replaceState(null, "", `?room=${roomCode(id)}`);
  };

  const create = async () => {
    try {
      selectRoom(await game.createRoom(4));
    } catch {
      // The contract hook exposes the wallet-safe error message.
    }
  };

  const join = () => {
    const id = parseRoomReference(roomInput);
    if (id) selectRoom(id);
  };

  const leave = () => {
    game.clearError();
    setRoomId(undefined);
    setScreen("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const playAgain = () => {
    leave();
    setScreen("matchmaking");
  };

  const room = game.room;
  const host = room?.[0] ?? ZERO_ADDRESS;
  const players = (room?.[1] ?? []).slice(0, room?.[2] ?? 0);
  const playerCount = room?.[2] ?? 0;
  const maxPlayers = room?.[3] ?? 4;
  const round = room?.[4] ?? 0;
  const submittedCount = room?.[5] ?? 0;
  const points = room?.[6] ?? 0n;
  const started = room?.[7] ?? false;
  const revealReady = room?.[8] ?? false;
  const finalized = room?.[9] ?? false;
  const ended = room?.[10] ?? false;
  const winner = room?.[11] ?? ZERO_ADDRESS;
  const isPlayer = Boolean(
    game.address && players.some((player) => player.toLowerCase() === game.address?.toLowerCase()),
  );
  const isHost = Boolean(game.address && host.toLowerCase() === game.address.toLowerCase());
  const deadlineReached = game.deadline !== undefined && now >= Number(game.deadline) * 1_000;
  const secondsLeft = game.deadline === undefined
    ? null
    : Math.max(0, Math.ceil(Number(game.deadline) - now / 1_000));

  const activeScreen: ScreenName = room && finalized
    ? "result"
    : room && started
      ? "choice"
      : screen;

  const shared = {
    game,
    players,
    playerCount,
    maxPlayers,
    round,
    points,
    submittedCount,
    revealReady,
    deadlineReached,
    secondsLeft,
  };

  const content = (() => {
    if (activeScreen === "how") {
      return <HowToPlay back={() => setScreen("home")} continueToGame={() => setScreen("matchmaking")} />;
    }
    if (activeScreen === "matchmaking") {
      return (
        <Matchmaking
          game={game}
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          create={create}
          join={join}
          back={() => setScreen("home")}
        />
      );
    }
    if (activeScreen === "lobby" && roomId !== undefined) {
      return (
        <Lobby
          game={game}
          roomId={roomId}
          players={players}
          playerCount={playerCount}
          maxPlayers={maxPlayers}
          isHost={isHost}
          isPlayer={isPlayer}
          leave={leave}
        />
      );
    }
    if (activeScreen === "choice") {
      return <Choice {...shared} leave={leave} />;
    }
    if (activeScreen === "result") {
      return (
        <Results
          game={game}
          players={players}
          ended={ended}
          winner={winner}
          points={points}
          round={round}
          leave={leave}
          playAgain={playAgain}
        />
      );
    }
    return <HomeScreen start={() => setScreen("matchmaking")} how={() => setScreen("how")} />;
  })();

  return (
    <main className="candy-shell">
      <div className="candy-stage">
        <div className="stage-glitter" aria-hidden="true" />
        {content}
      </div>
      <div className="rotate-notice" role="status">
        <HeartGem />
        <strong>Rotate your device</strong>
        <span>This game is designed for a landscape screen.</span>
      </div>
    </main>
  );
}

function Screen({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`candy-screen ${className}`}>{children}</section>;
}

function CandyPanel({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`candy-panel ${className}`}>{children}</div>;
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      className={`candy-logo ${compact ? "compact" : ""}`}
      src="/candy/candy-logo.jpg"
      width={2528}
      height={1696}
      sizes={compact ? "30vw" : "62vw"}
      priority={!compact}
      alt="Don’t Press It"
    />
  );
}

function PhoneCharm({ className = "" }: { className?: string }) {
  return (
    <Image
      className={`phone-charm ${className}`}
      src="/candy/candy-phone.jpg"
      width={1792}
      height={2400}
      sizes="25vw"
      alt=""
    />
  );
}

function HeartGem({ tone = "pink" }: { tone?: "pink" | "purple" | "mint" }) {
  return <span className={`heart-gem heart-${tone}`} aria-hidden="true">♥</span>;
}

function Tape({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`paper-tape ${className}`}>{children}</div>;
}

function CandyButton({
  children,
  onClick,
  tone = "pink",
  disabled = false,
  className = "",
}: PropsWithChildren<{
  onClick: () => void;
  tone?: "pink" | "purple" | "cream" | "mint";
  disabled?: boolean;
  className?: string;
}>) {
  return (
    <button className={`candy-button button-${tone} ${className}`} onClick={onClick} disabled={disabled}>
      <HeartGem tone={tone === "purple" ? "purple" : tone === "mint" ? "mint" : "pink"} />
      <span>{children}</span>
      <i aria-hidden="true">✦</i>
    </button>
  );
}

function WalletControl() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        if (!connected) {
          return <button className="wallet-pill" onClick={openConnectModal}><i />CONNECT WALLET</button>;
        }
        if (chain.unsupported) {
          return <button className="wallet-pill alert" onClick={openChainModal}><i />SWITCH NETWORK</button>;
        }
        return (
          <button className="wallet-pill connected" onClick={openAccountModal}>
            <i />{account.displayName}<small>{chain.name}</small>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function HomeScreen({ start, how }: { start: () => void; how: () => void }) {
  return (
    <Screen className="home-screen">
      <div className="top-wallet"><WalletControl /></div>
      <BrandLogo />
      <Tape className="home-tagline">Bestie… trust no one.♡</Tape>
      <aside className="scrap-note home-note" aria-label="Game summary">
        <b>Secret choice game. ♡</b>
        <span>Press or</span>
        <span>don’t press.</span>
        <HeartGem />
      </aside>
      <div className="home-actions">
        <CandyButton onClick={start}>START GAME</CandyButton>
        <CandyButton tone="purple" onClick={how}>HOW TO PLAY</CandyButton>
      </div>
      <PhoneCharm className="home-phone" />
    </Screen>
  );
}

function HowToPlay({ back, continueToGame }: { back: () => void; continueToGame: () => void }) {
  const rules = [
    ["1", "If nobody presses", "The points grow for the next round."],
    ["2", "If exactly one presses", "That player wins the points."],
    ["3", "If two or more press", "Nobody wins and the game continues."],
  ] as const;
  return (
    <Screen className="how-screen">
      <BrandLogo compact />
      <h1 className="screen-title">HOW TO PLAY</h1>
      <div className="rule-grid">
        {rules.map(([number, title, detail], index) => (
          <article className="rule-note" key={number}>
            <span className={`rule-number rule-${index + 1}`}>{number}</span>
            <h2>{title}</h2>
            <i aria-hidden="true">→</i>
            <p>{detail}</p>
            <HeartGem tone={index === 1 ? "purple" : "pink"} />
          </article>
        ))}
      </div>
      <Tape className="rules-whisper">Psst… choices stay encrypted until every player commits. ♡</Tape>
      <div className="bottom-actions two-up">
        <CandyButton tone="purple" onClick={back}>BACK</CandyButton>
        <CandyButton onClick={continueToGame}>CONTINUE</CandyButton>
      </div>
    </Screen>
  );
}

function Matchmaking({
  game,
  roomInput,
  setRoomInput,
  create,
  join,
  back,
}: {
  game: Game;
  roomInput: string;
  setRoomInput: (value: string) => void;
  create: () => void;
  join: () => void;
  back: () => void;
}) {
  return (
    <Screen className="matchmaking-screen">
      <div className="top-wallet"><WalletControl /></div>
      <BrandLogo compact />
      <div className="match-grid">
        <CandyPanel className="match-card create-card">
          <h1>CREATE ROOM</h1>
          <HeartGem />
          <Tape>Private operation</Tape>
          <output aria-label="Room size">2–4 PLAYERS</output>
          <CreateRoomAction game={game} create={create} />
        </CandyPanel>
        <CandyPanel className="match-card join-card">
          <h1>JOIN ROOM</h1>
          <HeartGem tone="purple" />
          <label htmlFor="room-reference">Enter room code:</label>
          <input
            id="room-reference"
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            placeholder="DPI-XXXXXX-XX"
            autoCapitalize="characters"
          />
          <CandyButton tone="purple" onClick={join} disabled={!parseRoomReference(roomInput)}>JOIN</CandyButton>
        </CandyPanel>
      </div>
      <aside className="scrap-note match-note"><b>2–4 players</b><span>Choices stay secret ♡</span></aside>
      <button className="text-link back-link" onClick={back}>← BACK TO MENU</button>
      <PhoneCharm className="match-phone" />
      {game.error && <ErrorBanner text={game.error} onDismiss={game.clearError} />}
    </Screen>
  );
}

function CreateRoomAction({ game, create }: { game: Game; create: () => void }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        if (!connected) return <CandyButton onClick={openConnectModal}>CONNECT WALLET</CandyButton>;
        if (chain.unsupported) return <CandyButton onClick={openChainModal}>SWITCH NETWORK</CandyButton>;
        return (
          <CandyButton onClick={create} disabled={game.isWorking}>
            {game.isWorking ? "CREATING…" : "CREATE ROOM"}
          </CandyButton>
        );
      }}
    </ConnectButton.Custom>
  );
}

function Lobby({
  game,
  roomId,
  players,
  playerCount,
  maxPlayers,
  isHost,
  isPlayer,
  leave,
}: {
  game: Game;
  roomId: bigint;
  players: readonly string[];
  playerCount: number;
  maxPlayers: number;
  isHost: boolean;
  isPlayer: boolean;
  leave: () => void;
}) {
  const code = roomCode(roomId);
  const copyInvite = () => void navigator.clipboard.writeText(roomLink(window.location.origin, roomId));
  return (
    <Screen className="lobby-screen">
      <div className="top-wallet"><WalletControl /></div>
      <BrandLogo compact />
      <CandyPanel className="roster-card">
        <h1>BESTIES ASSEMBLED</h1>
        <div className="roster-list">
          {players.map((player, index) => (
            <PlayerRow
              key={player}
              index={index}
              address={player}
              you={player.toLowerCase() === game.address?.toLowerCase()}
              status="READY"
            />
          ))}
          {Array.from({ length: maxPlayers - playerCount }).map((_, index) => (
            <PlayerRow key={`open-${index}`} index={playerCount + index} address="OPEN SLOT" status="WAITING" />
          ))}
        </div>
      </CandyPanel>
      <CandyPanel className="lobby-main-card">
        <output className="player-total" aria-label={`${playerCount} of ${maxPlayers} players`}>
          <HeartGem /> {playerCount}/{maxPlayers} <HeartGem tone="purple" />
          <b>PLAYERS</b>
        </output>
        <Tape>{isHost ? "Your room is ready ♡" : "Waiting for the host ♡"}</Tape>
        <button className="room-code-button" onClick={copyInvite} title="Copy invite link">
          <small>INVITE CODE</small>
          <output>{code}</output>
          <span>COPY INVITE</span>
        </button>
        {!isPlayer && (
          <CandyButton tone="purple" onClick={() => void game.joinRoom()} disabled={!game.address || game.isWorking || playerCount >= maxPlayers}>
            {game.isWorking ? "JOINING…" : "JOIN ROOM"}
          </CandyButton>
        )}
        {isHost && (
          <CandyButton onClick={() => void game.startGame()} disabled={game.isWorking || playerCount < 2}>
            {game.isWorking ? "STARTING…" : playerCount < 2 ? "NEED 2 PLAYERS" : "START ROUND"}
          </CandyButton>
        )}
        <CandyButton tone="purple" onClick={leave}>LEAVE</CandyButton>
      </CandyPanel>
      <PhoneCharm className="lobby-phone" />
      <small className="network-label">{activeChain.name} · ENCRYPTED CHOICES</small>
      {game.error && <ErrorBanner text={game.error} onDismiss={game.clearError} />}
    </Screen>
  );
}

function PlayerRow({ index, address, status, you = false }: { index: number; address: string; status: string; you?: boolean }) {
  return (
    <div className="player-row">
      <span className="avatar-heart">{you ? "♡" : "♥"}</span>
      <strong>{you ? "YOU" : address.startsWith("0x") ? shorten(address) : address}</strong>
      <HeartGem tone={index % 2 ? "purple" : "pink"} />
      <output>{status}</output>
    </div>
  );
}

function StatsBar({ round, points, secondsLeft }: { round: number; points: bigint; secondsLeft: number | null }) {
  return (
    <header className="stats-bar" aria-label="Round status">
      <span>ROUND <output>{round}</output></span>
      <span>♡</span>
      <span>TIME <time dateTime={secondsLeft === null ? undefined : `PT${secondsLeft}S`}>{secondsLeft === null ? "…" : `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`}</time></span>
      <span>♡</span>
      <span>POINTS <output>{points.toString()}</output></span>
    </header>
  );
}

function Choice({
  game,
  players,
  playerCount,
  round,
  points,
  submittedCount,
  revealReady,
  deadlineReached,
  secondsLeft,
  leave,
}: {
  game: Game;
  players: readonly string[];
  playerCount: number;
  maxPlayers: number;
  round: number;
  points: bigint;
  submittedCount: number;
  revealReady: boolean;
  deadlineReached: boolean;
  secondsLeft: number | null;
  leave: () => void;
}) {
  if (revealReady) {
    return (
      <Locked
        game={game}
        players={players}
        playerCount={playerCount}
        submittedCount={submittedCount}
        round={round}
        points={points}
        secondsLeft={secondsLeft}
        title="ORDERS REVEALED"
        detail="The encrypted outcome is ready for Inco attestation."
        action="VERIFY & FINALIZE"
        onAction={() => void game.finalizeRound()}
        leave={leave}
      />
    );
  }
  if (deadlineReached) {
    return (
      <Locked
        game={game}
        players={players}
        playerCount={playerCount}
        submittedCount={submittedCount}
        round={round}
        points={points}
        secondsLeft={secondsLeft}
        title="ROUND EXPIRED"
        detail="A player did not submit. Existing choices remain private."
        action="EXPIRE ROUND SAFELY"
        onAction={() => void game.expireRound()}
        leave={leave}
      />
    );
  }
  if (game.hasSubmitted) {
    return (
      <Locked
        game={game}
        players={players}
        playerCount={playerCount}
        submittedCount={submittedCount}
        round={round}
        points={points}
        secondsLeft={secondsLeft}
        title="CHOICE LOCKED IN"
        detail="No take-backs. Your encrypted choice is sealed."
        leave={leave}
      />
    );
  }
  return (
    <Screen className="choice-screen">
      <BrandLogo compact />
      <StatsBar round={round} points={points} secondsLeft={secondsLeft} />
      <Tape className="choice-prompt">♡ What will you do? ♡</Tape>
      <CandyPanel className="choice-roster">
        <h2>SQUAD</h2>
        {players.map((player, index) => (
          <PlayerRow
            key={player}
            index={index}
            address={player}
            you={player.toLowerCase() === game.address?.toLowerCase()}
            status={player.toLowerCase() === game.address?.toLowerCase() ? "CHOOSING" : "PRIVATE"}
          />
        ))}
      </CandyPanel>
      <div className="choice-actions" aria-label="Choose your encrypted order">
        <ChoiceButton choice="hold" onClick={() => void game.submitChoice(false)} disabled={game.isWorking} />
        <ChoiceButton choice="press" onClick={() => void game.submitChoice(true)} disabled={game.isWorking} />
      </div>
      <CandyPanel className="secure-note">
        <h2>♡ SECURE LINK ♡</h2>
        <p>Your choice is encrypted for the game contract.</p>
        <p>Other players cannot react to your order.</p>
        <output>{submittedCount}/{playerCount} SEALED</output>
        <WalletControl />
      </CandyPanel>
      <button className="text-link leave-link" onClick={leave}>LEAVE OPERATION</button>
      {game.error && <ErrorBanner text={game.error} onDismiss={game.clearError} />}
    </Screen>
  );
}

function ChoiceButton({ choice, onClick, disabled }: { choice: "hold" | "press"; onClick: () => void; disabled: boolean }) {
  const hold = choice === "hold";
  return (
    <button className={`choice-button ${hold ? "choice-hold" : "choice-press"}`} onClick={onClick} disabled={disabled}>
      <Image
        src={hold ? "/candy/choice-angel.jpg" : "/candy/choice-devil.jpg"}
        width={2048}
        height={2048}
        sizes="30vw"
        alt=""
      />
      <span>{hold ? "DON’T\nPRESS" : "PRESS\nIT"}</span>
      <small>{hold ? "Play it safe. Keep the points growing." : "Risk it all. Press for glory."}</small>
    </button>
  );
}

function Locked({
  game,
  players,
  playerCount,
  submittedCount,
  round,
  points,
  secondsLeft,
  title,
  detail,
  action,
  onAction,
  leave,
}: {
  game: Game;
  players: readonly string[];
  playerCount: number;
  submittedCount: number;
  round: number;
  points: bigint;
  secondsLeft: number | null;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
  leave: () => void;
}) {
  return (
    <Screen className="locked-screen">
      <BrandLogo compact />
      <StatsBar round={round} points={points} secondsLeft={secondsLeft} />
      <aside className="scrap-note locked-note"><b>No take-backs!</b><span>{detail}</span><HeartGem /></aside>
      <CandyPanel className="locked-card" aria-live="polite">
        <HeartGem />
        <h1>{title}</h1>
        <p>{detail}</p>
        <output className="sealed-total">{submittedCount}/{playerCount} CHOICES SEALED</output>
        <div className="locked-roster">
          {players.map((player, index) => (
            <div key={player}>
              <span>{index + 1}</span>
              <strong>{player.toLowerCase() === game.address?.toLowerCase() ? "YOU" : shorten(player)}</strong>
              <HeartGem tone={index % 2 ? "purple" : "pink"} />
              <output>{player.toLowerCase() === game.address?.toLowerCase() && game.hasSubmitted ? "LOCKED" : "PRIVATE"}</output>
            </div>
          ))}
        </div>
        {action && onAction && (
          <CandyButton onClick={onAction} disabled={game.isWorking}>
            {game.isWorking ? "WORKING…" : action}
          </CandyButton>
        )}
      </CandyPanel>
      <PhoneCharm className="locked-phone" />
      <button className="text-link leave-link" onClick={leave}>LEAVE OPERATION</button>
      {game.error && <ErrorBanner text={game.error} onDismiss={game.clearError} />}
    </Screen>
  );
}

function Results({
  game,
  players,
  ended,
  winner,
  points,
  round,
  leave,
  playAgain,
}: {
  game: Game;
  players: readonly string[];
  ended: boolean;
  winner: string;
  points: bigint;
  round: number;
  leave: () => void;
  playAgain: () => void;
}) {
  const youWon = game.address?.toLowerCase() === winner.toLowerCase();
  const winnerLabel = youWon ? "YOU WIN!" : `${shorten(winner)} WINS!`;
  return (
    <Screen className={`results-screen ${ended ? "game-over" : "round-result"}`}>
      <BrandLogo compact />
      <h1 className="result-title">{ended ? winnerLabel : `ROUND ${round} RESULTS`}</h1>
      <Tape>{ended ? "Bestie trust: unlocked! ♡" : "The round is verified ♡"}</Tape>
      <div className="result-player-grid">
        {players.map((player, index) => (
          <CandyPanel className={`result-player ${player.toLowerCase() === winner.toLowerCase() ? "winner" : ""}`} key={player}>
            <span>{index + 1}</span>
            <strong>{player.toLowerCase() === game.address?.toLowerCase() ? "YOU" : shorten(player)}</strong>
            <HeartGem tone={index % 2 ? "purple" : "pink"} />
            <small>{ended && player.toLowerCase() === winner.toLowerCase() ? "WINNER" : "ORDER PRIVATE"}</small>
          </CandyPanel>
        ))}
      </div>
      <CandyPanel className="result-pot" aria-live="polite">
        <span>{ended ? "FINAL POINTS" : "POINTS CARRY FORWARD"}</span>
        <output>{points.toString()}</output>
        <small>IN-GAME POINTS</small>
      </CandyPanel>
      <div className="result-actions">
        {!ended && (
          <CandyButton onClick={() => void game.nextRound()} disabled={game.isWorking}>
            {game.isWorking ? "STARTING…" : "NEXT ROUND"}
          </CandyButton>
        )}
        {ended && <CandyButton onClick={playAgain}>PLAY AGAIN</CandyButton>}
        <CandyButton tone="purple" onClick={leave}>BACK TO MENU</CandyButton>
      </div>
      <PhoneCharm className="result-phone" />
      {game.error && <ErrorBanner text={game.error} onDismiss={game.clearError} />}
    </Screen>
  );
}

function ErrorBanner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="candy-error" role="alert">
      <HeartGem />
      <span>{text}</span>
      <button onClick={onDismiss} aria-label="Dismiss message">×</button>
    </div>
  );
}
