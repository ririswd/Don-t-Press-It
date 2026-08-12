"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "./page.module.css";
import { useDontPressIt } from "@/hooks/useDontPressIt";

type Screen = "home" | "matchmaking" | "room";

const shortenAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roomInput, setRoomInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<bigint | undefined>();
  const [now, setNow] = useState(Date.now());
  const game = useDontPressIt(activeRoomId);

  useEffect(() => {
    const initialRoom = new URLSearchParams(window.location.search).get("room");
    if (initialRoom && /^\d+$/.test(initialRoom) && BigInt(initialRoom) > 0n) {
      setActiveRoomId(BigInt(initialRoom));
      setRoomInput(initialRoom);
      setScreen("room");
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectRoom = (roomId: bigint) => {
    setActiveRoomId(roomId);
    setRoomInput(roomId.toString());
    setScreen("room");
    window.history.replaceState(null, "", `?room=${roomId}`);
  };

  const createRoom = async () => {
    try {
      selectRoom(await game.createRoom(4));
    } catch {
      // The contract hook presents the actionable wallet or contract error below.
    }
  };

  const joinRoom = () => {
    if (/^\d+$/.test(roomInput) && BigInt(roomInput) > 0n) selectRoom(BigInt(roomInput));
  };

  const leaveRoom = () => {
    setActiveRoomId(undefined);
    setRoomInput("");
    setScreen("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const room = game.room;
  const host = room?.[0] ?? "0x0000000000000000000000000000000000000000";
  const allPlayers = room?.[1] ?? [];
  const playerCount = room?.[2] ?? 0;
  const maxPlayers = room?.[3] ?? 4;
  const round = room?.[4] ?? 0;
  const submittedCount = room?.[5] ?? 0;
  const points = room?.[6] ?? 0n;
  const started = room?.[7] ?? false;
  const revealReady = room?.[8] ?? false;
  const roundFinalized = room?.[9] ?? false;
  const ended = room?.[10] ?? false;
  const winner = room?.[11] ?? "0x0000000000000000000000000000000000000000";
  const players = allPlayers.slice(0, playerCount);
  const isPlayer = Boolean(game.address && players.some((player) => player.toLowerCase() === game.address?.toLowerCase()));
  const isHost = Boolean(game.address && host.toLowerCase() === game.address.toLowerCase());
  const deadlineReached = game.deadline !== undefined && now >= Number(game.deadline) * 1_000;
  const secondsLeft = game.deadline === undefined ? null : Math.max(0, Math.ceil(Number(game.deadline) - now / 1_000));

  return (
    <main className={styles.appShell}>
      <div className={styles.ambient} />
      <section className={styles.gameStage}>
        <div className={styles.grain} />
        {screen === "home" && (
          <HomeScreen connected={Boolean(game.address)} onStart={() => setScreen("matchmaking")} />
        )}
        {screen === "matchmaking" && (
          <MatchmakingScreen
            connected={Boolean(game.address)}
            working={game.isWorking}
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            onCreate={() => void createRoom()}
            onJoin={joinRoom}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "room" && (
          <RoomScreen
            game={game}
            roomId={activeRoomId}
            host={host}
            players={players}
            playerCount={playerCount}
            maxPlayers={maxPlayers}
            round={round}
            submittedCount={submittedCount}
            points={points}
            started={started}
            revealReady={revealReady}
            roundFinalized={roundFinalized}
            ended={ended}
            winner={winner}
            isHost={isHost}
            isPlayer={isPlayer}
            deadlineReached={deadlineReached}
            secondsLeft={secondsLeft}
            onLeave={leaveRoom}
          />
        )}
        <div className={styles.stageRim} />
      </section>
      <div className={styles.rotateNotice}>↻ Rotate device for the tactical display</div>
    </main>
  );
}

function WalletControl({ large = false }: { large?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        if (!connected) {
          return <button className={`${styles.wallet} ${large ? styles.walletLarge : ""}`} onClick={openConnectModal}><i /><span><small>SECURE LINK</small><strong>CONNECT WALLET</strong></span><b>▰▰▰</b></button>;
        }
        if (chain.unsupported) {
          return <button className={`${styles.wallet} ${styles.walletWrong}`} onClick={openChainModal}><i /><span><small>NETWORK ALERT</small><strong>SWITCH NETWORK</strong></span></button>;
        }
        return <button className={`${styles.wallet} ${large ? styles.walletLarge : ""}`} onClick={openAccountModal}><i /><span><small>{chain.name?.toUpperCase()}</small><strong>{account.displayName}</strong></span><b>▰▰▰</b></button>;
      }}
    </ConnectButton.Custom>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.brand} ${compact ? styles.brandCompact : ""}`}><span>DON&apos;T</span><span>PRESS</span><b>IT</b></div>;
}

function Rivets() { return <span className={styles.rivets}><i /><i /><i /><i /></span>; }

function CommandButton({ children, tone = "olive", onClick, disabled = false }: { children: React.ReactNode; tone?: "olive" | "bone" | "red"; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`${styles.commandButton} ${styles[`button${tone[0].toUpperCase()}${tone.slice(1)}`]}`}><Rivets /><span>»</span><strong>{children}</strong><span>«</span></button>;
}

function HomeScreen({ connected: _connected, onStart }: { connected: boolean; onStart: () => void }) {
  return <section className={styles.screen}>
    <aside className={styles.homeLeft}>
      <div className={styles.operationPlate}><Rivets /><strong>OPERATION GRIDLOCK</strong><small>SECTOR 7-G / BRAVO</small></div>
      <div className={styles.radarPanel}><small>TACTICAL DISPLAY</small><Radar /><span>BASE SEPOLIA<br />STATUS // LIVE<br />CHOICES // ENCRYPTED</span></div>
      <div className={styles.motto}>DISCIPLINE. FOCUS. VICTORY.</div>
    </aside>
    <section className={styles.homeCommand}>
      <Rivets /><p>★ CLASSIFIED MULTIPLAYER ★</p><Brand />
      <div className={styles.homeTagline}>★ TRUST NO ONE. HOLD THE LINE. ★</div>
      <CommandButton onClick={onStart}>START GAME</CommandButton>
      <small className={styles.stayFrosty}>★ PRIVATE CHOICES POWERED BY INCO ★</small>
    </section>
    <aside className={styles.homeRight}>
      <div className={styles.radioUnit}><Rivets /><h3>COMMS-01</h3><div className={styles.crt}>COMMAND ONLINE.<br />AWAITING OPERATOR.<br /><br /><b>CHANNEL 07</b></div><WalletControl large /></div>
      <div className={styles.warningPlate}>⚠ <span><b>WARNING</b><br />ONE CLICK CAN COMPROMISE EVERYTHING.</span></div>
    </aside>
  </section>;
}

function MatchmakingScreen({ connected, working, roomInput, setRoomInput, onCreate, onJoin, onBack }: { connected: boolean; working: boolean; roomInput: string; setRoomInput: (value: string) => void; onCreate: () => void; onJoin: () => void; onBack: () => void }) {
  return <section className={`${styles.screen} ${styles.matchmaking}`}>
    <header className={styles.matchHeader}><button className={styles.wordmark} onClick={onBack}><Brand compact /></button><span>ROOM / MATCHMAKING</span><WalletControl /></header>
    <aside className={styles.missionNote}><small>MISSION NOTE</small><strong>COORDINATE.<br />COMMUNICATE.<br />DON&apos;T PRESS IT.</strong><b>CLASSIFIED</b></aside>
    <div className={styles.roomPanels}>
      <section className={`${styles.roomPanel} ${styles.createPanel}`}><Rivets /><h1>— CREATE OPERATION —</h1><p>Host a private 2–4 player room.</p><CommandButton onClick={onCreate} disabled={!connected || working}>{working ? "CREATING…" : connected ? "CREATE ROOM" : "CONNECT WALLET"}</CommandButton></section>
      <section className={`${styles.roomPanel} ${styles.joinPanel}`}><Rivets /><h1>— JOIN OPERATION —</h1><label htmlFor="room-id">★ ENTER ROOM ID ★</label><input id="room-id" inputMode="numeric" value={roomInput} onChange={(event) => setRoomInput(event.target.value.replace(/\D/g, ""))} placeholder="ROOM ID" /><CommandButton tone="bone" onClick={onJoin} disabled={!/^\d+$/.test(roomInput)}>JOIN ROOM</CommandButton></section>
    </div>
    <footer className={styles.matchFooter}>◈ 2–4 PLAYERS &nbsp; // &nbsp; ENCRYPTED ONCHAIN UNTIL REVEAL ◈</footer>
  </section>;
}

type Game = ReturnType<typeof useDontPressIt>;

function RoomScreen({ game, roomId, host, players, playerCount, maxPlayers, round, submittedCount, points, started, revealReady, roundFinalized, ended, winner, isHost, isPlayer, deadlineReached, secondsLeft, onLeave }: { game: Game; roomId?: bigint; host: string; players: readonly string[]; playerCount: number; maxPlayers: number; round: number; submittedCount: number; points: bigint; started: boolean; revealReady: boolean; roundFinalized: boolean; ended: boolean; winner: string; isHost: boolean; isPlayer: boolean; deadlineReached: boolean; secondsLeft: number | null; onLeave: () => void }) {
  const roomTitle = ended ? "MISSION COMPLETE" : started ? "LIVE OPERATION" : "LOBBY / READY ROOM";
  return <section className={`${styles.screen} ${styles.roomScreen}`}>
    <header className={styles.roomHeader}><Brand compact /><div>OPERATION: <b>#{roomId?.toString() ?? "…"}</b> &nbsp;//&nbsp; BASE SEPOLIA</div><WalletControl /></header>
    {!game.gameAddress && <Notice danger text="Contract address is missing from this deployment." />}
    {game.error && <Notice danger text={game.error} />}
    {game.isLoading && <Notice text="Loading operation from Base Sepolia…" />}
    {game.room && <>
      <div className={styles.roomTitle}><small>TACTICAL OPERATIONS</small><h1>{roomTitle}</h1><span>★ ★ ★</span></div>
      {!started ? <Lobby game={game} host={host} players={players} playerCount={playerCount} maxPlayers={maxPlayers} isHost={isHost} isPlayer={isPlayer} onLeave={onLeave} /> : <Round game={game} players={players} playerCount={playerCount} round={round} submittedCount={submittedCount} points={points} revealReady={revealReady} roundFinalized={roundFinalized} ended={ended} winner={winner} isPlayer={isPlayer} deadlineReached={deadlineReached} secondsLeft={secondsLeft} onLeave={onLeave} />}
    </>}
  </section>;
}

function Lobby({ game, host, players, playerCount, maxPlayers, isHost, isPlayer, onLeave }: { game: Game; host: string; players: readonly string[]; playerCount: number; maxPlayers: number; isHost: boolean; isPlayer: boolean; onLeave: () => void }) {
  const copyRoom = () => navigator.clipboard?.writeText(window.location.href);
  return <div className={styles.lobbyLayout}>
    <section className={styles.rosterPanel}><Rivets /><header>SQUAD STATUS <span>{playerCount}/{maxPlayers} CONNECTED</span></header>{players.map((player, index) => <Player key={player} index={index} address={player} you={player.toLowerCase() === game.address?.toLowerCase()} status="READY" />)}{Array.from({ length: maxPlayers - playerCount }).map((_, index) => <Player key={`open-${index}`} index={playerCount + index} address="OPEN SLOT" status="WAITING" />)}</section>
    <section className={styles.readyPanel}><Rivets /><small>SHARE THIS OPERATION</small><strong>#{host === "0x0000000000000000000000000000000000000000" ? "…" : window.location.search.replace("?room=", "")}</strong><button className={styles.copyLink} onClick={() => void copyRoom()}>COPY INVITE LINK</button><p>{isHost ? "You are squad leader." : isPlayer ? "Standing by for squad leader." : "Join this room to enter the squad."}</p>{!isPlayer && <CommandButton tone="bone" onClick={() => void game.joinRoom()} disabled={!game.address || game.isWorking || playerCount >= maxPlayers}>{game.isWorking ? "JOINING…" : "JOIN THIS ROOM"}</CommandButton>}{isHost && <CommandButton onClick={() => void game.startGame()} disabled={game.isWorking || playerCount < 2}>{game.isWorking ? "STARTING…" : playerCount < 2 ? "NEED 2 PLAYERS" : "START ROUND"}</CommandButton>}<button className={styles.leave} onClick={onLeave}>← LEAVE OPERATION</button></section>
  </div>;
}

function Player({ index, address, status, you = false }: { index: number; address: string; status: string; you?: boolean }) {
  return <div className={`${styles.player} ${you ? styles.playerYou : ""}`}><span>0{index + 1}</span><i>▶</i><strong>{you ? "YOU" : address.startsWith("0x") ? shortenAddress(address) : address}</strong><b>{status}</b><em /></div>;
}

function Round({ game, players, playerCount, round, submittedCount, points, revealReady, roundFinalized, ended, winner, isPlayer, deadlineReached, secondsLeft, onLeave }: { game: Game; players: readonly string[]; playerCount: number; round: number; submittedCount: number; points: bigint; revealReady: boolean; roundFinalized: boolean; ended: boolean; winner: string; isPlayer: boolean; deadlineReached: boolean; secondsLeft: number | null; onLeave: () => void }) {
  if (roundFinalized) return <Result game={game} ended={ended} winner={winner} points={points} onLeave={onLeave} />;
  return <div className={styles.roundLayout}>
    <aside className={styles.squadPanel}><header>★ SQUAD STATUS ★</header>{players.map((player, index) => <Player key={player} index={index} address={player} you={player.toLowerCase() === game.address?.toLowerCase()} status={game.address?.toLowerCase() === player.toLowerCase() && game.hasSubmitted ? "LOCKED IN" : "ACTIVE"} />)}<footer>PRIVATE ORDERS // INCO TEE</footer></aside>
    <section className={styles.roundCenter}><div className={styles.metrics}><Metric label="ROUND" value={round.toString()} /><Metric label="TIMER" value={secondsLeft === null ? "…" : `00:${secondsLeft.toString().padStart(2, "0")}`} danger={deadlineReached} /><Metric label="MISSION POINTS" value={points.toString()} /></div>{revealReady ? <div className={styles.locked}><h2>ALL ORDERS REVEALED</h2><p>Inco has made the encrypted outcome available for verification.</p><CommandButton onClick={() => void game.finalizeRound()} disabled={game.isWorking}>{game.isWorking ? "VERIFYING…" : "VERIFY & FINALIZE"}</CommandButton></div> : deadlineReached ? <div className={styles.locked}><h2>ROUND EXPIRED</h2><p>A squad member did not submit in time. Submitted choices stay private.</p><CommandButton tone="bone" onClick={() => void game.expireRound()} disabled={game.isWorking}>EXPIRE ROUND SAFELY</CommandButton></div> : !isPlayer ? <div className={styles.locked}><h2>SPECTATOR MODE</h2><p>Only squad members can submit encrypted orders.</p></div> : game.hasSubmitted ? <div className={styles.locked}><div className={styles.lockIcon}>▣</div><h2>YOUR ORDER IS LOCKED</h2><p>Awaiting the rest of the squad. No player can see your choice yet.</p><b>{submittedCount}/{playerCount} ORDERS SEALED</b></div> : <div className={styles.choiceArena}><p>// SELECT YOUR SECRET ORDER //</p><button className={styles.holdChoice} onClick={() => void game.submitChoice(false)} disabled={game.isWorking}><Rivets /><span>★</span><strong>DON&apos;T PRESS</strong><small>HOLD POSITION. STAY DISCIPLINED.</small></button><button className={styles.pressChoice} onClick={() => void game.submitChoice(true)} disabled={game.isWorking}><Rivets /><span>⚠</span><strong>PRESS IT</strong><small>TAKE THE RISK. BREAK FORMATION.</small></button></div>}</section>
    <aside className={styles.comms}><header>⌁ COMMS</header><p><b>COMMAND</b> All units, stand by.</p><p><b>INCO</b> Orders remain encrypted.</p><p><b>SYSTEM</b> {submittedCount}/{playerCount} submitted.</p><footer>NO REAL-MONEY PRIZES</footer></aside>
  </div>;
}

function Result({ game, ended, winner, points, onLeave }: { game: Game; ended: boolean; winner: string; points: bigint; onLeave: () => void }) {
  const youWon = game.address?.toLowerCase() === winner.toLowerCase();
  return <div className={styles.resultScreen}><div className={styles.resultStamp}>ROUND RESULTS<br /><small>VERIFIED BY INCO</small></div><h2>{ended ? youWon ? "YOU PRESSED IT" : "A PLAYER PRESSED IT" : "NO SOLE PRESSER"}</h2><p>{ended ? `${youWon ? "You" : shortenAddress(winner)} claimed the mission points.` : "The mission continues. The squad made the same choice."}</p><div className={styles.pointsPlate}><small>MISSION POINTS</small><strong>{points.toString()}</strong></div>{!ended && <CommandButton onClick={() => void game.nextRound()} disabled={game.isWorking}>{game.isWorking ? "STARTING…" : "NEXT ROUND"}</CommandButton>}<button className={styles.leave} onClick={onLeave}>← RETURN TO COMMAND</button></div>;
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div className={`${styles.metric} ${danger ? styles.metricDanger : ""}`}><small>{label}</small><strong>{value}</strong></div>; }
function Radar() { return <div className={styles.radar}><i /><i /><i /><b>OBJ. DELTA</b></div>; }
function Notice({ text, danger = false }: { text: string; danger?: boolean }) { return <div className={`${styles.notice} ${danger ? styles.noticeDanger : ""}`}>{text}</div>; }
