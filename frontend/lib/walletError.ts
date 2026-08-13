/** Converts wallet/RPC errors into short instructions suitable for players. */
export function walletErrorMessage(cause: unknown, fallback: string) {
  const technicalMessage = cause instanceof Error ? cause.message : String(cause ?? "");
  const message = technicalMessage.toLowerCase();

  if (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("user cancelled") ||
    message.includes("4001")
  ) {
    return "Transaction cancelled in MetaMask. Nothing was sent—choose again when you are ready.";
  }

  if (message.includes("wrong network") || message.includes("chain") && message.includes("unsupported")) {
    return "Switch MetaMask to Base Sepolia, then try again.";
  }

  if (message.includes("exceeds max transaction gas limit")) {
    return "Your wallet rejected its gas estimate. Refresh the page and try once more.";
  }

  if (message.includes("transaction relay error") || message.includes("callfailedafterfeerefresh")) {
    return "The encrypted relay could not process that request. Wait a few seconds, then try once more.";
  }

  if (message.includes("already submitted")) {
    return "Your encrypted choice is already locked in.";
  }

  if (message.includes("round still active")) {
    return "This round is still active. Wait for the timer before expiring it.";
  }

  return fallback;
}
