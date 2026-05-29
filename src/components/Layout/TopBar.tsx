import React, { type ReactNode } from "react"

interface TopBarProps {
  children?: ReactNode
}

export function TopBar({ children }: TopBarProps) {
  return (
    <div className="top-bar">
      <span className="top-bar-title">CrossPost</span>
      {children}
    </div>
  )
}
