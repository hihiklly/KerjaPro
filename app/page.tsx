import type { Metadata } from "next";
import TradeApp from "./trade-app";

export const metadata: Metadata = {
  title: "KerjaPro — Your daily work, sorted",
  description: "The simple work assistant for Malaysian tradesmen.",
};

export default function Home() {
  return <TradeApp />;
}
