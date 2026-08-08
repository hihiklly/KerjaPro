import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./customer-picker.css";
import "./workflow-polish.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-workflow.png`;
  return {
    title: "KerjaPro",
    description: "One simple job workflow from customer and quote to completion and payment.",
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "KerjaPro — One job. Quote to payment.", description: "The simple job workflow for service businesses.", images: [image] },
    twitter: { card: "summary_large_image", title: "KerjaPro — One job. Quote to payment.", description: "The simple job workflow for service businesses.", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
