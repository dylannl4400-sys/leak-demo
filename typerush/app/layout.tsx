import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = { title: "TypeRush — Find your flow", description: "Build speed, sharpen accuracy, and make every keystroke count." }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
