import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
export const metadata: Metadata = { title: "Arc · Become who you want to be", description: "Your personal 90-day winter arc. Build habits for physical health, mental health, and personal development." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en" className={lora.variable}><body>{children}</body></html>; }
