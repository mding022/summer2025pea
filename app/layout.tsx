import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Protest Events, Institutional Demands, Institutional Responses (PEIDIR) Agential Research Model",
  description: "Protest Events, Institutional Demands, Institutional Responses (PEIDIR) Agential Research Model from Professor Haslam.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* <ThemeProvider attribute="class" defaultTheme="light"> */}
          {children}
        {/* </ThemeProvider> */}
      </body>
    </html>
  )
}
