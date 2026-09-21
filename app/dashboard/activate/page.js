"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ActivatePage() {
  const [keyCode, setKeyCode] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function activateKey(event) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const code = keyCode.trim();

    if (!code) {
      setMessage("Vui lòng nhập KEY.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Bạn chưa đăng nhập.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "activate_key",
      {
        input_key: code,
      }
    );

    if (error) {
      setMessage("Lỗi: " + error.message);
      setLoading(false);
      return;
    }

    if (!data || !data.success) {
      setMessage(
        data?.message || "Không thể kích hoạt KEY."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage("Kích hoạt KEY thành công!");
    setKeyCode("");
    setLoading(false);
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <a href="/dashboard" style={styles.back}>
          ← Dashboard
        </a>

        <section style={styles.card}>

          <div style={styles.icon}>
            🔑
          </div>

          <h1 style={styles.title}>
            KÍCH HOẠT KEY
          </h1>

          <p style={styles.description}>
            Nhập KEY để kích hoạt sản phẩm.
          </p>

          <form onSubmit={activateKey}>

            <input
              type="text"
              value={keyCode}
              onChange={(event) =>
                setKeyCode(event.target.value)
              }
              placeholder="XENO-XXXX-XXXX-XXXX"
              autoComplete="off"
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading
                ? "ĐANG KIỂM TRA..."
                : "KÍCH HOẠT KEY"}
            </button>

          </form>

          {message && (
            <div
              style={{
                ...styles.message,
                color: success
                  ? "#00e676"
                  : "#ff5252",
                borderColor: success
                  ? "#00a854"
                  : "#7a1717",
              }}
            >
              {success ? "✅ " : "❌ "}
              {message}
            </div>
          )}

        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ffffff",
    padding: "30px 15px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
  },

  back: {
    color: "#ff1744",
    textDecoration: "none",
    fontSize: "15px",
  },

  card: {
    marginTop: "35px",
    padding: "30px 22px",
    background: "#101010",
    border: "1px solid #292929",
    borderRadius: "20px",
    textAlign: "center",
  },

  icon: {
    fontSize: "60px",
  },

  title: {
    margin: "10px 0",
    fontSize: "32px",
    fontWeight: "900",
  },

  description: {
    color: "#888888",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #333333",
    background: "#181818",
    color: "#ffffff",
    fontSize: "16px",
    outline: "none",
  },

  button: {
    width: "100%",
    marginTop: "15px",
    padding: "16px",
    border: "none",
    borderRadius: "12px",
    background: "#ff1744",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
  },

  message: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid",
    background: "#151515",
    fontWeight: "700",
  },
};
