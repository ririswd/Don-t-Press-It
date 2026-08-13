"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { bytesToHex, pad, parseEventLogs, toHex, type Address, type Hex } from "viem";
import { handleTypes } from "@inco/lightning-js";
import { getIncoLightning } from "@/lib/network";
import { dontPressItAbi } from "@/lib/dontPressItAbi";
import { walletErrorMessage } from "@/lib/walletError";

const GAME_ADDRESS = process.env.NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS as Address | undefined;

const feeAbi = [
  {
    type: "function" as const,
    name: "getFee",
    stateMutability: "pure" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint256" as const }],
  },
];

let lightningClient: Awaited<ReturnType<typeof getIncoLightning>> | null = null;

async function getLightning() {
  if (!lightningClient) lightningClient = await getIncoLightning();
  return lightningClient;
}

type Room = readonly [
  Address,
  readonly Address[],
  number,
  number,
  number,
  number,
  bigint,
  boolean,
  boolean,
  boolean,
  boolean,
  Address,
];

type AttestedValue = {
  plaintext: { value: boolean | bigint };
  handle: Hex;
  covalidatorSignatures: Uint8Array[];
};

export function useDontPressIt(roomId?: bigint) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const clearError = useCallback(() => setError(null), []);

  const enabled = Boolean(GAME_ADDRESS && roomId !== undefined);
  const roomRead = useReadContract({
    address: GAME_ADDRESS,
    abi: dontPressItAbi,
    functionName: "getRoom",
    args: roomId === undefined ? undefined : [roomId],
    query: { enabled, refetchInterval: 4_000 },
  });
  const deadlineRead = useReadContract({
    address: GAME_ADDRESS,
    abi: dontPressItAbi,
    functionName: "getRoundDeadline",
    args: roomId === undefined ? undefined : [roomId],
    query: { enabled, refetchInterval: 4_000 },
  });
  const submittedRead = useReadContract({
    address: GAME_ADDRESS,
    abi: dontPressItAbi,
    functionName: "hasSubmitted",
    args: roomId === undefined || !address ? undefined : [roomId, address],
    query: { enabled: enabled && Boolean(address), refetchInterval: 4_000 },
  });

  const room = roomRead.data as Room | undefined;
  const deadline = deadlineRead.data as bigint | undefined;

  const refresh = useCallback(async () => {
    await Promise.all([roomRead.refetch(), deadlineRead.refetch(), submittedRead.refetch()]);
  }, [deadlineRead, roomRead, submittedRead]);

  const confirm = useCallback(async (hash: Hex) => {
    if (!publicClient) throw new Error("No public client available");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    await refresh();
    return receipt;
  }, [publicClient, refresh]);

  const createRoom = useCallback(async (maxPlayers: number) => {
    if (!GAME_ADDRESS) throw new Error("Missing NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS");
    setError(null);
    setIsWorking(true);
    try {
      const hash = await writeContractAsync({
        address: GAME_ADDRESS,
        abi: dontPressItAbi,
        functionName: "createRoom",
        args: [maxPlayers],
      });
      const receipt = await confirm(hash);
      const logs = parseEventLogs({ abi: dontPressItAbi, logs: receipt.logs, eventName: "RoomCreated", strict: false });
      const roomCreated = logs[0] as { args?: { roomId?: bigint } } | undefined;
      if (roomCreated?.args?.roomId === undefined) throw new Error("Room was created but its ID could not be read");
      return roomCreated.args.roomId;
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not create the operation. Please try again."));
      throw cause;
    } finally {
      setIsWorking(false);
    }
  }, [confirm, writeContractAsync]);

  const joinRoom = useCallback(async () => {
    if (!GAME_ADDRESS || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS, abi: dontPressItAbi, functionName: "joinRoom", args: [roomId],
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not join this operation. Check the invite code and try again."));
    } finally {
      setIsWorking(false);
    }
  }, [confirm, roomId, writeContractAsync]);

  const startGame = useCallback(async () => {
    if (!GAME_ADDRESS || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS, abi: dontPressItAbi, functionName: "startGame", args: [roomId],
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not start the round. Please try again."));
    } finally {
      setIsWorking(false);
    }
  }, [confirm, roomId, writeContractAsync]);

  const submitChoice = useCallback(async (press: boolean) => {
    if (!GAME_ADDRESS || !address || !publicClient || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      const lightning = await getLightning();
      const encryptedChoice = await lightning.encrypt(press, {
        accountAddress: address,
        dappAddress: GAME_ADDRESS,
        handleType: handleTypes.ebool,
      });
      const fee = await publicClient.readContract({
        address: lightning.executorAddress,
        abi: feeAbi,
        functionName: "getFee",
      });
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS,
        abi: dontPressItAbi,
        functionName: "submitChoice",
        args: [roomId, encryptedChoice],
        value: fee,
        // Inco ciphertexts are larger than ordinary contract inputs. Some
        // wallet RPCs under-estimate them; this safe cap avoids that failure.
        gas: 1_000_000n,
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not lock in your encrypted choice. Please try again."));
    } finally {
      setIsWorking(false);
    }
  }, [address, confirm, publicClient, roomId, writeContractAsync]);

  const finalizeRound = useCallback(async () => {
    if (!GAME_ADDRESS || !walletClient || !publicClient || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      const handles = await publicClient.readContract({
        address: GAME_ADDRESS,
        abi: dontPressItAbi,
        functionName: "getRoundHandles",
        args: [roomId],
      }) as readonly [Hex, Hex];
      const lightning = await getLightning();
      const decrypted = await (lightning as unknown as {
        attestedDecrypt: (client: typeof walletClient, requestedHandles: readonly Hex[], options: {
          backoffConfig: { maxRetries: number; baseDelayInMs: number; backoffFactor: number };
        }) => Promise<AttestedValue[]>;
      }).attestedDecrypt(walletClient, handles, {
        backoffConfig: { maxRetries: 12, baseDelayInMs: 2_000, backoffFactor: 1.3 },
      });
      const toAttestation = (result: AttestedValue) => {
        const value = result.plaintext.value;
        const encoded = pad(toHex(typeof value === "boolean" ? (value ? 1 : 0) : value as bigint), { size: 32 });
        return {
          attestation: { handle: result.handle as Hex, value: encoded },
          signatures: result.covalidatorSignatures.map((signature: Uint8Array) => bytesToHex(signature)),
        };
      };
      const pressCount = toAttestation(decrypted[0]);
      const winnerIndex = toAttestation(decrypted[1]);
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS,
        abi: dontPressItAbi,
        functionName: "finalizeRound",
        args: [
          roomId,
          pressCount.attestation,
          pressCount.signatures,
          winnerIndex.attestation,
          winnerIndex.signatures,
        ],
        // The attestation call simulates at ~111k gas on Base Sepolia, but some
        // wallet RPCs return an unusably large estimate and reject it. A 250k
        // cap leaves generous headroom while staying under their transaction cap.
        gas: 250_000n,
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not finalize the revealed round. Please try again."));
    } finally {
      setIsWorking(false);
    }
  }, [confirm, publicClient, roomId, walletClient, writeContractAsync]);

  const nextRound = useCallback(async () => {
    if (!GAME_ADDRESS || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS, abi: dontPressItAbi, functionName: "nextRound", args: [roomId],
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not start the next round. Please try again."));
    } finally {
      setIsWorking(false);
    }
  }, [confirm, roomId, writeContractAsync]);

  const expireRound = useCallback(async () => {
    if (!GAME_ADDRESS || roomId === undefined) return;
    setError(null);
    setIsWorking(true);
    try {
      await confirm(await writeContractAsync({
        address: GAME_ADDRESS, abi: dontPressItAbi, functionName: "expireRound", args: [roomId],
      }));
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not expire this round. Please try again."));
    } finally {
      setIsWorking(false);
    }
  }, [confirm, roomId, writeContractAsync]);

  return {
    address,
    gameAddress: GAME_ADDRESS,
    room,
    deadline,
    hasSubmitted: submittedRead.data === true,
    isLoading: roomRead.isLoading,
    isWorking,
    error: error ?? (roomRead.error ? "Unable to load this room. Check the network and contract address." : null),
    clearError,
    createRoom,
    joinRoom,
    startGame,
    submitChoice,
    finalizeRound,
    nextRound,
    expireRound,
  };
}
