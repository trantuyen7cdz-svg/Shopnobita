"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("xenova-theme");

    // Mặc định là sáng
    const isDark = saved === "dark";

    setDark(isDark);
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    setReady(true);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;

    setDark(nextDark);

    document.documentElement.setAttribute(
      "data-theme",
      nextDark ? "dark" : "light"
    );

    localStorage.setItem(
      "xenova-theme",
      nextDark ? "dark" : "light"
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "13px 14px",
        marginTop: "8px",
        borderRadius: "12px",
        border: dark
          ? "1px solid #333"
          : "1px solid #ddd",
        background: dark ? "#171717" : "#f5f5f5",
        color: dark ? "#fff" : "#111",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "800",
      }}
    >
      <span>
        {dark ? "🌙 Chế độ tối" : "☀️ Chế độ sáng"}
      </span>

      <span
        style={{
          width: "42px",
          height: "24px",
          borderRadius: "999px",
          background: dark ? "#ff3030" : "#ccc",
          padding: "3px",
          display: "flex",
          justifyContent: dark ? "flex-end" : "flex-start",
          transition: "all .2s ease",
        }}
      >
        <span
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            display: "block",
          }}
        />
      </span>
    </button>
  );
}
