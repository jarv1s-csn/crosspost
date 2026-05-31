import React from "react"

interface TopBarProps {
  activeTab: "publish" | "settings"
  onTabChange: (tab: "publish" | "settings") => void
  saveStatus?: string
  onSave?: () => void
}

export function TopBar({ activeTab, onTabChange, saveStatus, onSave }: TopBarProps) {
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
      {onSave && (
        <button className="save-btn" onClick={onSave} style={{ marginLeft: saveStatus ? 8 : "auto" }}>
          💾 保存
        </button>
      )}
    </div>
  )
}
