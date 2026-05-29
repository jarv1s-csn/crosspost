import React from "react"
import { TopBar } from "./TopBar"
import { InputPanel } from "./InputPanel"
import { PreviewPanel } from "./PreviewPanel"

export function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="main-content">
        <InputPanel />
        <PreviewPanel />
      </div>
    </div>
  )
}
