import React from "react"

interface TopBarProps {
  activeTab: "publish" | "settings"
  onTabChange: (tab: "publish" | "settings") => void
  saveStatus?: string
}

export function TopBar({ activeTab, onTabChange, saveStatus }: TopBarProps) {
  return (
    <div className="top-bar">
      <span className="top-bar-title">CrossPost</span>
      <div className="top-bar-tabs">
        <button
          className={"tab-btn" + (activeTab === "publish" ? " active" : "")}
          onClick={() => onTabChange("publish")}
        >
          📝 发布
        </button>
        <button
          className={"tab-btn" + (activeTab === "settings" ? " active" : "")}
          onClick={() => onTabChange("settings")}
        >
          ⚙️ 设置
        </button>
      </div>
      {saveStatus && (
        <span style={{ color: "#22c55e", fontSize: 11, marginLeft: "auto" }}>
          {saveStatus}
        </span>
      )}
    </div>
  )
}
