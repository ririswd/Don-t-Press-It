"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useDontPressIt } from "@/hooks/useDontPressIt";

const shortenAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function Home() {
  const [roomInput, setRoomInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<bigint | undefined>();
  const [now, setNow] = useState(Date.now());
  const game = useDontPressIt(activeRoomId);

  useEffect(() => {
    const initialRoom = new URLSearchParams(window.location.search).get("room");
    if (initialRoom && /^\d+$/.test(initialRoom) && BigInt(initialRoom) > BigInt(0)) {
      setActiveRoomId(BigInt(initialRoom));
      setRoomInput(initialRoom);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectRoom = (roomId: bigint) => {
    setActiveRoomId(roomId);
    setRoomInput(roomId.toString());
    window.history.replaceState(null, "", `?room=${roomId}`);
  };

  const createRoom = async () => {
    try {
      selectRoom(await game.createRoom(4));
    } catch {
      // The hook provides a user-facing error message.
    }
  };

  const joinRoom = () => {
    if (!/^\d+$/.test(roomInput) || BigInt(roomInput) < BigInt(1)) return;
    selectRoom(BigInt(roomInput));
  };

  const room = game.room;
  const host = room?.[0] ?? "0x0000000000000000000000000000000000000000";
  const allPlayers = room?.[1] ?? [];
  const playerCount = room?.[2] ?? 0;
  const maxPlayers = room?.[3] ?? 4;
  const round = room?.[4] ?? 0;
  const submittedCount = room?.[5] ?? 0;
  const points = room?.[6] ?? BigInt(0);
  const started = room?.[7] ?? false;
  const revealReady = room?.[8] ?? false;
  const roundFinalized = room?.[9] ?? false;
  const ended = room?.[10] ?? false;
  const winner = room?.[11] ?? "0x0000000000000000000000000000000000000000";
  const players = allPlayers.slice(0, playerCount);
  const isPlayer = Boolean(game.address && players.some((player) => player.toLowerCase() === game.address?.toLowerCase()));
  const isHost = Boolean(game.address && host?.toLowerCase() === game.address.toLowerCase());
  const deadlineReached = game.deadline !== undefined && now >= Number(game.deadline) * 1_000;
  const secondsLeft = game.deadline === undefined ? null : Math.max(0, Math.ceil(Number(game.deadline) - now / 1_000));

  return (
    <main className={styles.shell}>
      <div className={styles.scanlines} />
      <header className={styles.topbar}>
        <div><span className={styles.micro}>OPERATION</span><strong>GRIDLOCK</strong></div>
        <div className={styles.topCenter}>DON&apos;T PRESS IT</div>
        <div className={styles.secure}>● PRIVATE CHOICES // INCO</div>
      </header>

      {!activeRoomId ? (
        <section className={styles.home}>
          <aside className={styles.radarPanel}>
            <p className={styles.panelTitle}>TACTICAL DISPLAY</p>
            <div className={styles.radar}>
              <div className={styles.ringOne} /><div className={styles.ringTwo} />
              <div className={styles.crossHorizontal} /><div className={styles.crossVertical} />
              <div className={styles.sweep} /><i className={`${styles.blip} ${styles.blipOne}`} /><i className={`${styles.blip} ${styles.blipTwo}`} />
            </div>
            <div className={styles.terminalText}><span>BASE SEPOLIA</span><span>STATUS // LIVE</span><span>CHOICES // ENCRYPTED</span></div>
          </aside>
          <div className={styles.hero}>
            <p className={styles.classified}>// CLASSIFIED MULTIPLAYER //</p>
            <h1><span>DON&apos;T</span><span className={styles.tan}>PRESS</span><span className={styles.red}>IT</span></h1>
            <p className={styles.tagline}>TRUST NO ONE. HOLD THE LINE.</p>
            <button className={`${styles.bigButton} ${styles.greenButton}`} onClick={() => void createRoom()} disabled={!game.address || game.isWorking}>
              {game.isWorking ? "CREATING…" : game.address ? "CREATE OPERATION" : "CONNECT WALLET TO PLAY"}
            </button>
            <div className={styles.joinInline}>
              <input className={styles.codeInput} value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="ROOM ID" inputMode="numeric" />
              <button className={`${styles.actionButton} ${styles.tanButton}`} onClick={joinRoom}>JOIN OPERATION</button>
            </div>
            <p className={styles.encryption}>🔒 Each choice is encrypted onchain until everyone commits.</p>
          </div>
          <aside className={styles.commsPanel}>
            <p className={styles.panelTitle}>HOW IT WORKS</p>
            <div className={styles.crt}><p>01 // JOIN A SQUAD</p><p>02 // MAKE A SECRET ORDER</p><p>03 // REVEAL TOGETHER</p><p>ONE PRESSER TAKES THE POINTS.</p></div>
          </aside>
        </section>
      ) : (
        <section className={styles.page}>
          <div className={styles.pageHeading}>
            <p>OPERATION // #{activeRoomId.toString()}</p>
            <h1>{ended ? "MISSION COMPLETE" : started ? "LIVE OPERATION" : "READY ROOM"}</h1>
            <div />
          </div>

          {!game.gameAddress && <Notice text="Missing NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS. Add the new deployed contract address before publishing." danger />}
          {game.isLoading && <Notice text="Loading operation from Base Sepolia…" />}
          {game.error && <Notice text={game.error} danger />}

          {room && <>
            <div className={styles.gameHud}>
              <HudBox label="ROUND" value={round.toString()} />
              <HudBox label="SQUAD" value={`${playerCount}/${maxPlayers}`} />
              <HudBox label="MISSION POINTS" value={points.toString()} />
            </div>
            <div className={styles.lobbyGrid}>
              <div className={styles.roster}>
                {players.map((player, index) => <PlayerRow key={player} number={(index + 1).toString().padStart(2, "0")} name={game.address?.toLowerCase() === player.toLowerCase() ? "YOU" : shortenAddress(player)} status={started ? (roundFinalized ? "RESULT READY" : "ACTIVE") : "READY"} active={game.address?.toLowerCase() === player.toLowerCase()} />)}
                {Array.from({ length: maxPlayers - playerCount }).map((_, index) => <PlayerRow key={`open-${index}`} number={(playerCount + index + 1).toString().padStart(2, "0")} name="OPEN SLOT" status="WAITING" />)}
              </div>
              <div className={styles.roomStatus}>
                <small>SHARE THIS ROOM ID</small>
                <strong>#{activeRoomId.toString()}</strong>
                <span>{started ? "OPERATIONS IN PROGRESS" : "WAITING FOR SQUAD"}</span>
                <div className={styles.roomCode}><small>HOST</small><b>{shortenAddress(host)}</b></div>
              </div>
            </div>

            {!started && <div className={styles.actionStack}>
              {!isPlayer && <button className={`${styles.actionButton} ${styles.tanButton}`} onClick={() => void game.joinRoom()} disabled={!game.address || game.isWorking || playerCount >= maxPlayers}>JOIN THIS OPERATION</button>}
              {isHost && <button className={`${styles.actionButton} ${styles.greenButton}`} onClick={() => void game.startGame()} disabled={game.isWorking || playerCount < 2}>START ROUND {playerCount < 2 ? "(NEED 2 PLAYERS)" : ""}</button>}
              {isPlayer && !isHost && <Notice text="The host can start once at least two players are ready." />}
            </div>}

            {started && !roundFinalized && <>
              <div className={styles.gameHud}>
                <HudBox label="SUBMITTED" value={`${submittedCount}/${playerCount}`} />
                <HudBox label="TIMER" value={secondsLeft === null ? "…" : `${secondsLeft}s`} warning={deadlineReached} />
                <HudBox label="STATUS" value={revealReady ? "REVEAL READY" : "SEALED"} />
              </div>
              {revealReady ? <div className={styles.lockedPanel}><div className={styles.lockIcon}>▣</div><p>ALL ORDERS ARE NOW REVEALED BY INCO</p><strong className={styles.tan}>DECLASSIFY THE ROUND</strong><button className={`${styles.actionButton} ${styles.greenButton}`} onClick={() => void game.finalizeRound()} disabled={game.isWorking}>{game.isWorking ? "VERIFYING ATTESTATION…" : "VERIFY & FINALIZE"}</button></div> : deadlineReached ? <div className={styles.lockedPanel}><p>ROUND TIME EXPIRED</p><strong className={styles.dangerText}>A PLAYER DID NOT SUBMIT</strong><button className={`${styles.actionButton} ${styles.tanButton}`} onClick={() => void game.expireRound()} disabled={game.isWorking}>EXPIRE ROUND SAFELY</button><span>Submitted choices remain private.</span></div> : isPlayer ? game.hasSubmitted ? <div className={styles.lockedPanel}><div className={styles.lockIcon}>▣</div><p>YOUR ENCRYPTED ORDER IS LOCKED</p><strong className={styles.safeText}>AWAITING THE SQUAD</strong><span>No player can see your choice before every player submits.</span></div> : <div className={styles.choiceArea}><p className={styles.classified}>// SELECT YOUR SECRET ORDER //</p><button className={styles.holdButton} onClick={() => void game.submitChoice(false)} disabled={game.isWorking}><small>DEFENSIVE ORDER</small><strong>DON&apos;T PRESS</strong><span>HOLD THE LINE</span></button><div className={styles.or}>OR</div><button className={styles.pressButton} onClick={() => void game.submitChoice(true)} disabled={game.isWorking}><small>HIGH RISK ORDER</small><strong>PRESS IT</strong><span>BREAK FORMATION</span></button></div> : <Notice text="Spectators can watch this round, but only room members can submit an encrypted order." />}
            </>}

            {roundFinalized && <div className={styles.winnerPanel}>
              <small>ROUND RESULT</small>
              {ended ? <><strong>{game.address?.toLowerCase() === winner.toLowerCase() ? "YOU PRESSED IT" : `${shortenAddress(winner)} PRESSED IT`}</strong><b>{points.toString()} MISSION POINTS</b></> : <><strong>NO SOLE PRESSER</strong><b>THE MISSION CONTINUES</b></>}
              {!ended && <button className={`${styles.actionButton} ${styles.greenButton}`} onClick={() => void game.nextRound()} disabled={game.isWorking}>{game.isWorking ? "STARTING…" : "NEXT ROUND"}</button>}
            </div>}
          </>}
          <button className={styles.secondaryButton} onClick={() => { setActiveRoomId(undefined); window.history.replaceState(null, "", window.location.pathname); }}>← RETURN TO COMMAND</button>
        </section>
      )}
      <footer className={styles.footer}><span>BASE SEPOLIA</span><strong>★ PRIVATE BY INCO ★</strong><span>POINTS ONLY // NO REAL-MONEY PRIZES</span></footer>
    </main>
  );
}

function HudBox({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={styles.hudBox}><small>{label}</small><strong className={warning ? styles.warningValue : ""}>{value}</strong></div>;
}

function PlayerRow({ number, name, status, active = false }: { number: string; name: string; status: string; active?: boolean }) {
  return <div className={`${styles.playerRow} ${active ? styles.activePlayer : ""}`}><span className={styles.playerNumber}>{number}</span><strong>{name}</strong><span className={styles.playerStatus}>{status}</span></div>;
}

function Notice({ text, danger = false }: { text: string; danger?: boolean }) {
  return <div className={`${styles.notice} ${danger ? styles.noticeDanger : ""}`}>{text}</div>;
}
