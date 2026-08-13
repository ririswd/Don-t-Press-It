const ROOM_CODE_MASK = 0xd0a7e5n;
const BASE_36_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Creates a short, shareable label for an on-chain room id. The room id is
 * still the source of truth; this code is reversible and needs no database.
 */
export function roomCode(roomId: bigint) {
  if (roomId < 1n) throw new Error("Room ids must be positive");
  const encoded = roomId ^ ROOM_CODE_MASK;
  const body = encoded.toString(36).toUpperCase().padStart(6, "0");
  const checksum = ((encoded * 31n + roomId) % 1296n).toString(36).toUpperCase().padStart(2, "0");
  return `DPI-${body}-${checksum}`;
}

function base36ToBigInt(value: string) {
  return [...value].reduce(
    (total, character) => total * 36n + BigInt(BASE_36_ALPHABET.indexOf(character)),
    0n,
  );
}

/** Accepts current invite codes and legacy numeric URLs from before this change. */
export function parseRoomReference(value: string): bigint | undefined {
  const reference = value.trim().toUpperCase();
  if (/^[1-9]\d*$/.test(reference)) return BigInt(reference);

  const match = /^DPI-([0-9A-Z]+)-([0-9A-Z]{2})$/.exec(reference);
  if (!match) return undefined;

  const encoded = base36ToBigInt(match[1]);
  const roomId = encoded ^ ROOM_CODE_MASK;
  const expectedChecksum = ((encoded * 31n + roomId) % 1296n)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");

  return roomId > 0n && expectedChecksum === match[2] ? roomId : undefined;
}

export function roomLink(origin: string, roomId: bigint) {
  return `${origin}/?room=${roomCode(roomId)}`;
}
