import type { Metadata } from "next";
import { requireChatGPTUser } from "./chatgpt-auth";
import TradeApp from "./trade-app";

export const metadata: Metadata = {
  title: "KerjaPro — One job. Quote to payment.",
  description: "A simple, mobile-first job workflow for service and trade businesses.",
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <TradeApp user={{ displayName: user.displayName, email: user.email }} />;
}
