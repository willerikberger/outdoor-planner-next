import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Outdoor Planner',
  description: 'Design your garden & driveway layout to scale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
