import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs"

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
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {/* HEADER */}
          <header className="w-full bg-none border-b">
            <div className="mx-auto p-4 flex justify-end items-center">
              {/* Left side — your site title */}

              {/* Right side — auth */}
              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-2 py-1 rounded-md border hover:bg-gray-50">
                      Register
                    </button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
