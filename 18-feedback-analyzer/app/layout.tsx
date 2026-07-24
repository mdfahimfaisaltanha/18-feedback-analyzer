import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "EchoLens — Multi-Language Feedback Analyzer",
  description:
    "Detects language, translates, scores sentiment, and extracts themes from customer feedback in 6 languages.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
