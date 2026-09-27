"use client"

import React, { useState } from "react"
import Link from "next/link"

export default function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar`} id="sidebar" aria-hidden={collapsed}>
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-lg font-semibold">
            Hunty
          </Link>
          <button
            aria-expanded={!collapsed}
            aria-controls="sidebar"
            onClick={() => setCollapsed((s) => !s)}
            className="sidebar-toggle"
          >
            {collapsed ? "☰" : "✕"}
          </button>
        </div>

        <nav className="flex-1 space-y-2" aria-label="Primary">
          <Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-sidebar-accent">
            Dashboard
          </Link>
          <Link href="/hunt" className="block px-3 py-2 rounded hover:bg-sidebar-accent">
            Hunts
          </Link>
          <Link href="/profile" className="block px-3 py-2 rounded hover:bg-sidebar-accent">
            Profile
          </Link>
        </nav>
      </aside>

      <div className="main" id="main-content">
        {children}
      </div>

      <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile">
        <Link href="/hunt" className="flex flex-col items-center text-sm">
          Hunts
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center text-sm">
          Dashboard
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-sm">
          Profile
        </Link>
      </nav>
    </div>
  )
}
