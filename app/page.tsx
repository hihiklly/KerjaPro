import type { Metadata } from "next";
import { requireChatGPTUser } from "./chatgpt-auth";
import TradeApp from "./trade-app";

export const metadata: Metadata = {
  title: "KerjaPro — Your daily work, sorted",
  description: "The simple work assistant for Malaysian tradesmen.",
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <TradeApp user={{ displayName: user.displayName, email: user.email }} />;
}
