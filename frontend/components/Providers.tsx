"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { activeChain, activeRpcUrl } from "@/lib/network";

const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const config = projectId
  ? getDefaultConfig({
      appName: "Don't Press It",
      projectId,
      chains: [activeChain],
      transports: {
        [activeChain.id]: http(activeRpcUrl),
      },
      ssr: true,
    })
  : createConfig({
      chains: [activeChain],
      transports: {
        [activeChain.id]: http(activeRpcUrl),
      },
      ssr: true,
    });

const Providers = ({ children }: { children: ReactNode }) => {
  if (!projectId) {
    console.warn(
      "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Get one at https://cloud.walletconnect.com/"
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#d4d4d4", accentColorForeground: "#0a0a0a", borderRadius: "none" })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export { Providers };
