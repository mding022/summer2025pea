import type React from "react"
import "./globals.css"

export const metadata = {
  title: "Documentation for Research Model",
  description: "Documentation.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Load Crimson Pro directly from Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-crimson antialiased">{children}</body>
    </html>
  )
}
