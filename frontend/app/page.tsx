"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDontPressIt } from "@/hooks/useDontPressIt";

type ScreenName = "home" | "matchmaking" | "lobby" | "choice" | "locked" | "result";
type Tone = "olive" | "amber" | "bone" | "red" | "dark";
type Game = ReturnType<typeof useDontPressIt>;

const shorten = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function Home() {
  const [screen, setScreen] = useState<ScreenName>("home");
  const [roomInput, setRoomInput] = useState("");
  const [roomId, setRoomId] = useState<bigint | undefined>();
  const [now, setNow] = useState(Date.now());
  const game = useDontPressIt(roomId);

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room && /^\d+$/.test(room) && BigInt(room) > 0n) {
      setRoomId(BigInt(room));
      setRoomInput(room);
      setScreen("lobby");
    }
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectRoom = (id: bigint) => {
    setRoomId(id);
    setRoomInput(id.toString());
    setScreen("lobby");
    window.history.replaceState(null, "", `?room=${id}`);
  };
  const create = async () => {
    try { selectRoom(await game.createRoom(4)); } catch { /* Hook shows the error in the screen. */ }
  };
  const join = () => {
    if (/^\d+$/.test(roomInput) && BigInt(roomInput) > 0n) selectRoom(BigInt(roomInput));
  };
  const leave = () => {
    setRoomId(undefined);
    setScreen("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const room = game.room;
  const host = room?.[0] ?? "0x0000000000000000000000000000000000000000";
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
  const winner = room?.[11] ?? "0x0000000000000000000000000000000000000000";
  const isPlayer = Boolean(game.address && players.some((player) => player.toLowerCase() === game.address?.toLowerCase()));
  const isHost = Boolean(game.address && host.toLowerCase() === game.address.toLowerCase());
  const deadlineReached = game.deadline !== undefined && now >= Number(game.deadline) * 1_000;
  const secondsLeft = game.deadline === undefined ? null : Math.max(0, Math.ceil(Number(game.deadline) - now / 1_000));

  useEffect(() => {
    if (room && started && screen === "lobby") setScreen("choice");
    if (room && finalized && screen !== "result") setScreen("result");
  }, [finalized, room, screen, started]);

  const content = (() => {
    if (screen === "matchmaking") return <Matchmaking game={game} roomInput={roomInput} setRoomInput={setRoomInput} create={create} join={join} back={() => setScreen("home")} />;
    if ((screen === "lobby" || screen === "choice" || screen === "locked" || screen === "result") && roomId) {
      if (screen === "result" && room) return <Results game={game} ended={ended} winner={winner} points={points} leave={leave} />;
      if (screen === "choice" || screen === "locked") return <Choice game={game} roomId={roomId} players={players} playerCount={playerCount} round={round} points={points} submittedCount={submittedCount} revealReady={revealReady} deadlineReached={deadlineReached} secondsLeft={secondsLeft} leave={leave} />;
      return <Lobby game={game} roomId={roomId} players={players} playerCount={playerCount} maxPlayers={maxPlayers} isHost={isHost} isPlayer={isPlayer} leave={leave} />;
    }
    return <HomeScreen start={() => setScreen("matchmaking")} />;
  })();

  return <main className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="game-stage"><div className="stage-surface" /><div className="stage-rim" />{content}</div><div className="rotate-notice"><WarningIcon /><strong>Rotate device</strong><span>Tactical display requires landscape mode.</span></div></main>;
}

function Screen({ children, className = "" }: PropsWithChildren<{ className?: string }>) { return <section className={`screen ${className}`}>{children}</section>; }
function Panel({ children, className = "", tone = "dark" }: PropsWithChildren<{ className?: string; tone?: Tone }>) { return <div className={`panel panel-${tone} ${className}`}>{children}</div>; }
function Rivets() { return <span className="rivets"><i /><i /><i /><i /></span>; }
function WingStar({ className = "" }: { className?: string }) { return <div className={`wing-star ${className}`}><i /><i /><span>★</span><i /><i /></div>; }
function WarningIcon() { return <span className="warning-icon"><span>!</span></span>; }
function ShieldIcon() { return <span className="shield-icon">★</span>; }
function BrandMark({ compact = false }: { compact?: boolean }) { return <div className={`brand-mark ${compact ? "compact" : ""}`}><span>DON&apos;T</span><span className="brand-press">PRESS</span><span className="brand-it">IT</span></div>; }
function PlateButton({ children, tone = "olive", onClick, disabled = false }: PropsWithChildren<{ tone?: Tone; onClick: () => void; disabled?: boolean }>) { return <button className={`plate-button plate-${tone}`} onClick={onClick} disabled={disabled}><Rivets /><span className="button-chevron">»</span><span className="button-label">{children}</span><span className="button-chevron">«</span></button>; }

function WalletControl({ large = false }: { large?: boolean }) {
  return <ConnectButton.Custom>{({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
    const connected = mounted && account && chain;
    if (!connected) return <button className={`wallet-control ${large ? "large" : ""}`} onClick={openConnectModal}><span className="status-led red" /><span className="wallet-copy"><small>SECURE LINK</small><strong>CONNECT WALLET</strong></span><span className="signal-bars"><i /><i /><i /><i /></span></button>;
    if (chain.unsupported) return <button className="wallet-control" onClick={openChainModal}><span className="status-led red" /><span className="wallet-copy"><small>NETWORK ALERT</small><strong>SWITCH NETWORK</strong></span></button>;
    return <button className={`wallet-control ${large ? "large" : ""}`} onClick={openAccountModal}><span className="status-led green" /><span className="wallet-copy"><small>{chain.name}</small><strong>{account.displayName}</strong></span><span className="signal-bars"><i /><i /><i /><i /></span></button>;
  }}</ConnectButton.Custom>;
}

function Radar() { return <div className="radar"><span className="radar-sweep" /><i className="radar-blip one" /><i className="radar-blip two" /><i className="radar-blip three" /><b>OBJ. DELTA</b></div>; }

function HomeScreen({ start }: { start: () => void }) { return <Screen className="home-screen"><aside className="home-left"><Panel className="operation-plate"><Rivets /><strong>OPERATION GRIDLOCK</strong><span>SECTOR 7-G / BRAVO</span></Panel><Panel className="radar-panel"><Radar /></Panel><Panel className="motto-plate">DISCIPLINE. FOCUS. VICTORY.</Panel></aside><Panel className="home-command"><Rivets /><WingStar /><BrandMark /><div className="home-tagline"><span>★</span> Trust no one. Hold the line. <span>★</span></div><div className="home-actions"><PlateButton onClick={start}>START GAME</PlateButton></div><div className="stay-frosty">★ STAY FROSTY ★</div></Panel><aside className="home-right"><Panel className="radio-unit" tone="olive"><Rivets /><div className="radio-antenna one" /><div className="radio-antenna two" /><h3>COMMS-01</h3><div className="crt-screen"><div className="signal-bars big"><i /><i /><i /><i /></div><p>Command online.<br />Awaiting operator.</p><span className="waveform" /></div><div className="radio-controls"><div><small>CHANNEL</small><strong>07</strong></div><div className="knob" /></div><WalletControl large /></Panel><Panel className="warning-plate"><WarningIcon /><span><b>WARNING</b>ONE CLICK CAN<br />COMPROMISE EVERYTHING.</span></Panel></aside></Screen>; }

function Matchmaking({ game, roomInput, setRoomInput, create, join, back }: { game: Game; roomInput: string; setRoomInput: (value: string) => void; create: () => void; join: () => void; back: () => void }) { return <Screen className="matchmaking-screen"><header className="match-header"><Panel className="warning-mini"><WarningIcon /><span><b>WARNING</b>ONE WRONG MOVE<br />EVERYONE LOSES</span></Panel><Panel className="match-brand"><button className="plain-button" onClick={back}><BrandMark compact /></button><span>ROOM / MATCHMAKING</span><WingStar /></Panel><Panel className="network-unit"><WalletControl /></Panel></header><div className="match-body"><aside className="mission-note"><span>MISSION NOTE</span><p>COORDINATE.<br />COMMUNICATE.<br />DON&apos;T PRESS IT.</p><WingStar /><b>CLASSIFIED</b></aside><Panel className="room-panel create-room" tone="olive"><Rivets /><h2>— CREATE ROOM —</h2><small>★ START A PRIVATE OPERATION ★</small><div className="room-code">2–4 PLAYERS</div><CreateRoomAction game={game} create={create} /></Panel><Panel className="room-panel join-room"><Rivets /><h2>— JOIN ROOM —</h2><label htmlFor="room-code">★ ENTER ROOM ID ★</label><input id="room-code" value={roomInput} onChange={(event) => setRoomInput(event.target.value.replace(/\D/g, ""))} placeholder="ROOM ID" inputMode="numeric" /><PlateButton tone="bone" onClick={join} disabled={!/^\d+$/.test(roomInput)}>JOIN</PlateButton></Panel></div><Panel className="player-count-plate"><span>♟♟</span> 2–4 PLAYERS <span>♟♟</span></Panel><div className="map-strip" />{game.error && <ErrorBanner text={game.error} />}</Screen>; }

function CreateRoomAction({ game, create }: { game: Game; create: () => void }) {
  return <ConnectButton.Custom>{({ account, chain, openChainModal, openConnectModal, mounted }) => {
    const connected = mounted && account && chain;
    if (!connected) return <PlateButton tone="amber" onClick={openConnectModal}>CONNECT WALLET</PlateButton>;
    if (chain.unsupported) return <PlateButton tone="red" onClick={openChainModal}>SWITCH TO BASE SEPOLIA</PlateButton>;
    return <PlateButton tone="amber" onClick={create} disabled={game.isWorking}>{game.isWorking ? "CREATING…" : "CREATE ROOM"}</PlateButton>;
  }}</ConnectButton.Custom>;
}

function Lobby({ game, roomId, players, playerCount, maxPlayers, isHost, isPlayer, leave }: { game: Game; roomId: bigint; players: readonly string[]; playerCount: number; maxPlayers: number; isHost: boolean; isPlayer: boolean; leave: () => void }) { return <Screen className="lobby-screen"><header className="lobby-topbar"><BrandMark compact /><div className="operation-meta"><span>OPERATION: <b>#{roomId.toString()}</b></span><i>//</i><span>LOCATION: <b>BASE SEPOLIA</b></span><i>//</i><span>CHOICES: ENCRYPTED</span></div><WalletControl /></header><section className="lobby-left"><header><small>TACTICAL OPERATIONS</small><h1>LOBBY / READY ROOM</h1><WingStar /></header><Panel className="roster-panel"><Rivets />{players.map((player, index) => <RosterRow key={player} index={index} address={player} you={player.toLowerCase() === game.address?.toLowerCase()} status="READY" />)}{Array.from({ length: maxPlayers - playerCount }).map((_, index) => <RosterRow key={index} index={playerCount + index} address="OPEN SLOT" status="WAITING" />)}</Panel><div className="radio-feed compact"><strong>RADIO FEED</strong><p><span>[LIVE]</span> <b>COMMAND:</b> Awaiting squad readiness.</p><p><span>[INCO]</span> Choices will remain private.</p></div></section><Panel className="lobby-round-panel"><Rivets /><h2><em>{playerCount}/{maxPlayers}</em> PLAYERS</h2><WingStar /><small>{isHost ? "SQUAD LEADER ONLINE" : "WAITING FOR SQUAD LEADER"}</small><strong className="countdown">#{roomId.toString()}</strong>{!isPlayer && <PlateButton tone="bone" onClick={() => void game.joinRoom()} disabled={!game.address || game.isWorking || playerCount >= maxPlayers}>{game.isWorking ? "JOINING…" : "JOIN ROOM"}</PlateButton>}{isHost && <PlateButton tone="amber" onClick={() => void game.startGame()} disabled={game.isWorking || playerCount < 2}>{game.isWorking ? "STARTING…" : playerCount < 2 ? "NEED 2 PLAYERS" : "START ROUND"}</PlateButton>}<PlateButton tone="dark" onClick={leave}>LEAVE</PlateButton></Panel><footer className="lobby-footer"><span>// STAY FOCUSED<br />// TRUST NO ONE</span><WingStar /><Panel>DISCIPLINE&nbsp;&nbsp; ◆ &nbsp;&nbsp;FOCUS&nbsp;&nbsp; ◆ &nbsp;&nbsp;VICTORY</Panel><span className="footer-warning"><WarningIcon /> POINTS ONLY<br />NO REAL-MONEY PRIZES</span></footer>{game.error && <ErrorBanner text={game.error} />}</Screen>; }

function RosterRow({ index, address, status, you = false }: { index: number; address: string; status: string; you?: boolean }) { return <div className="lobby-player"><span className="player-number">{String(index + 1).padStart(2, "0")}</span><span className="mini-chevron">▶</span><strong>{you ? "YOU" : address.startsWith("0x") ? shorten(address) : address}</strong><span className={`status-chip ${status === "READY" ? "ready" : "connected"}`}>{status}</span><i className={`status-led ${status === "READY" ? "green" : "amber"}`} /></div>; }

function Metric({ label, value, tone = "olive" }: { label: string; value: string; tone?: Tone }) { return <div className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function Choice({ game, roomId: _roomId, players, playerCount, round, points, submittedCount, revealReady, deadlineReached, secondsLeft, leave }: { game: Game; roomId: bigint; players: readonly string[]; playerCount: number; round: number; points: bigint; submittedCount: number; revealReady: boolean; deadlineReached: boolean; secondsLeft: number | null; leave: () => void }) { if (revealReady) return <Locked game={game} title="ALL ORDERS REVEALED" detail="Inco has made the encrypted outcome available for verification." action="VERIFY & FINALIZE" onAction={() => void game.finalizeRound()} leave={leave} />; if (deadlineReached) return <Locked game={game} title="ROUND EXPIRED" detail="A player did not submit. Submitted choices remain private." action="EXPIRE ROUND SAFELY" onAction={() => void game.expireRound()} leave={leave} />; if (game.hasSubmitted) return <Locked game={game} title="CHOICE LOCKED IN" detail={`${submittedCount}/${playerCount} encrypted orders sealed. Awaiting the squad.`} leave={leave} />; return <Screen className="choice-screen"><header className="metrics-bar"><Metric label="ROUND" value={`${round}`} /><Metric label="TIMER" value={secondsLeft === null ? "…" : `00:${secondsLeft.toString().padStart(2, "0")}`} tone="amber" /><Metric label="MISSION POINTS" value={points.toString()} /></header><Panel className="squad-panel"><header><WingStar /> SQUAD STATUS <span>— ★★★</span></header>{players.map((player, index) => <div className="squad-player" key={player}><div><strong>{player.toLowerCase() === game.address?.toLowerCase() ? "YOU" : shorten(player)}</strong><span><i className="status-led amber" />{player.toLowerCase() === game.address?.toLowerCase() ? "CHOOSING" : "ACTIVE"}</span></div><div className="player-dots"><i /><i className="active" /><i /></div></div>)}<footer>UNIT 7&nbsp; · &nbsp;STAY SHARP&nbsp; · &nbsp;TRUST THE PLAN<WingStar /></footer></Panel><section className="choice-arena"><ChoiceButton choice="hold" onClick={() => void game.submitChoice(false)} disabled={game.isWorking} /><ChoiceButton choice="press" onClick={() => void game.submitChoice(true)} disabled={game.isWorking} /></section><Panel className="comms-panel"><header>⌁ COMMS</header><div className="comms-lines"><div><strong>COMMAND</strong><time>LIVE</time><p>Choose carefully. Nobody can see your encrypted order.</p></div><div><strong>INCO</strong><time>LIVE</time><p>Private state secured in the TEE.</p></div></div></Panel><div className="tactical-desk"><span>MISSION FOCUS. SQUAD TRUST. VICTORY.</span><button className="leave-choice" onClick={leave}>LEAVE OPERATION</button></div>{game.error && <ErrorBanner text={game.error} />}</Screen>; }
function ChoiceButton({ choice, onClick, disabled }: { choice: "hold" | "press"; onClick: () => void; disabled: boolean }) { const hold = choice === "hold"; return <button className={`choice-button ${hold ? "hold-choice" : "press-choice"}`} onClick={onClick} disabled={disabled}><Rivets /><span className="choice-icon">{hold ? <ShieldIcon /> : <WarningIcon />}</span><span className="choice-copy"><strong>{hold ? "DON’T PRESS" : "PRESS IT"}</strong><small>{hold ? "★ HOLD POSITION. STAY DISCIPLINED. PROTECT THE MISSION. ★" : "☠ TAKE THE RISK. STRIKE HARD. CLAIM THE REWARD. ☠"}</small></span></button>; }
function Locked({ game, title, detail, action, onAction, leave }: { game: Game; title: string; detail: string; action?: string; onAction?: () => void; leave: () => void }) { return <Screen className="locked-screen"><header className="locked-header"><Panel className="brand-strip"><BrandMark compact /><WingStar /></Panel><h1>{title}</h1><WingStar /></header><aside className="locked-metrics"><Panel><Metric label="MISSION STATUS" value="SEALED" /></Panel><Panel><Metric label="SYSTEM" value="INCO TEE" tone="amber" /></Panel></aside><Panel className="locked-table"><Rivets /><div className="table-heading"><span>PLAYER</span><span>STATUS</span></div><div className="locked-row"><strong>YOU</strong><span className="is-locked">{title === "CHOICE LOCKED IN" ? "LOCKED IN" : "READY"}</span><i>▣</i></div><p className="locked-detail">{detail}</p>{action && onAction && <PlateButton onClick={onAction} disabled={game.isWorking}>{game.isWorking ? "WORKING…" : action}</PlateButton>}</Panel><Panel className="hand-radio" tone="olive"><Rivets /><h3>TRC-152</h3><div className="crt-screen"><small>COMMS CHANNEL 7</small><p>Decision logged.<br />Stand by.</p></div></Panel><footer className="locked-footer">UNIT 7-A <span>★ STAY SHARP. STAY ALIVE. ★</span><button className="leave-choice" onClick={leave}>LEAVE</button></footer>{game.error && <ErrorBanner text={game.error} />}</Screen>; }
function Results({ game, ended, winner, points, leave }: { game: Game; ended: boolean; winner: string; points: bigint; leave: () => void }) { const youWon = game.address?.toLowerCase() === winner.toLowerCase(); return <Screen className="results-screen"><header className="results-header"><Panel className="round-stamp"><small>// OPERATION:<br />DON’T PRESS IT</small><strong>RESULT:<br />VERIFIED</strong></Panel><h1>ROUND RESULTS</h1><WingStar /><Panel className="result-warning"><WarningIcon /><span><b>INCO</b>PRIVATE ORDERS<br />REVEALED TOGETHER</span></Panel></header><Panel className="winner-pot" tone="amber"><span>★★ &nbsp; {ended ? youWon ? "YOU PRESSED IT" : `${shorten(winner)} PRESSED IT` : "NO SOLE PRESSER"} &nbsp; ★★</span><strong>{points.toString()} POINTS</strong></Panel><div className="result-action">{!ended && <PlateButton onClick={() => void game.nextRound()} disabled={game.isWorking}>{game.isWorking ? "STARTING…" : "NEXT ROUND"}</PlateButton>}<PlateButton tone="dark" onClick={leave}>BACK TO MENU</PlateButton></div></Screen>; }
function ErrorBanner({ text }: { text: string }) { return <div className="ui-error">{text}</div>; }
