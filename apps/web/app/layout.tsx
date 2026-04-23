import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareerCoach AI — AI-Powered Resume & Job Coaching",
  description:
    "Upload your resume, paste a job description, and get AI-powered coaching to land your dream role. ATS scoring, bullet rewrites, and streaming chat.",
  keywords: ["resume", "job search", "AI career coach", "ATS optimization", "resume rewrite", "job application"],
  authors: [{ name: "CareerCoach AI" }],
  openGraph: {
    title: "CareerCoach AI — Land your dream job with AI",
    description: "AI-powered resume coaching, ATS scoring, and tailored cover letters — powered by Claude.",
    type: "website",
    siteName: "CareerCoach AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerCoach AI",
    description: "AI-powered resume coaching powered by Claude",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
