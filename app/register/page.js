"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: registerError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (registerError) {
        console.error("REGISTER ERROR:", registerError);

        setError(
          registerError.message ||
            "Không thể tạo tài khoản. Vui lòng thử lại."
        );

        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Không thể tạo tài khoản.");
        setLoading(false);
        return;
      }

      /*
       * Nếu Supabase yêu cầu xác nhận email,
       * session sẽ chưa tồn tại.
       */
      if (!data.session) {
        setMessage(
          "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác nhận tài khoản."
        );

        setLoading(false);
        return;
      }

      /*
       * Nếu Supabase đăng nhập luôn sau khi đăng ký,
       * chuyển thẳng vào Dashboard.
       */
      setMessage("Đăng ký thành công. Đang chuyển vào tài khoản...");

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error("REGISTER SERVER ERROR:", err);

      setError("Đã xảy ra lỗi. Vui lòng thử lại.");

      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.container}>
        <Link href="/" style={styles.back}>
          ← Trang chủ
        </Link>

        <div style={styles.card}>
          <div style={styles.logo}>
            XENOVA
            <span> PLAY</span>
          </div>

          <div style={styles.icon}>👤</div>

          <h1 style={styles.title}>Tạo tài khoản</h1>

          <p style={styles.subtitle}>
            Đăng ký tài khoản XENOVA PLAY để bắt đầu sử dụng hệ thống.
          </p>

          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}

          {message && (
            <div style={styles.success}>
              ✅ {message}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <label style={styles.label}>EMAIL</label>

            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              style={styles.input}
            />

            <label style={styles.label}>MẬT KHẨU</label>

            <div style={styles.passwordBox}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                style={styles.passwordInput}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>

            <label style={styles.label}>
              XÁC NHẬN MẬT KHẨU
            </label>

            <div style={styles.passwordBox}>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                disabled={loading}
                style={styles.passwordInput}
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={styles.showButton}
              >
                {showConfirm ? "Ẩn" : "Hiện"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.registerButton,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "ĐANG TẠO TÀI KHOẢN..."
                : "TẠO TÀI KHOẢN →"}
            </button>
          </form>

          <div style={styles.divider}>
            <span>ĐÃ CÓ TÀI KHOẢN?</span>
          </div>

          <Link href="/login" style={styles.loginButton}>
            🔐 ĐĂNG NHẬP
          </Link>
        </div>

        <div style={styles.footer}>
          © 2026 XENOVA PLAY
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #040609 100%)",
    color: "#fff",
    padding: "30px 15px 50px",
  },

  glowOne: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(39, 116, 255, .10)",
    filter: "blur(80px)",
    top: "-120px",
    left: "-100px",
    pointerEvents: "none",
  },

  glowTwo: {
    position: "fixed",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(0, 204, 255, .06)",
    filter: "blur(90px)",
    bottom: "-120px",
    right: "-100px",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: "430px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },

  back: {
    display: "inline-block",
    marginBottom: "20px",
    color: "#8290a6",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  card: {
    background: "rgba(12, 19, 31, .96)",
    border: "1px solid #223149",
    borderRadius: "20px",
    padding: "30px 24px",
    boxShadow: "0 25px 80px rgba(0,0,0,.4)",
  },

  logo: {
    textAlign: "center",
    fontSize: "25px",
    fontWeight: "950",
    letterSpacing: "3px",
  },

  icon: {
    width: "55px",
    height: "55px",
    margin: "25px auto 15px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background: "#14223a",
    border: "1px solid #29466f",
    fontSize: "25px",
  },

  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "28px",
    fontWeight: "900",
  },

  subtitle: {
    margin: "9px 0 25px",
    textAlign: "center",
    color: "#77859b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  label: {
    display: "block",
    marginTop: "15px",
    marginBottom: "7px",
    color: "#8492a8",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  input: {
    width: "100%",
    height: "48px",
    boxSizing: "border-box",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #263750",
    outline: "none",
    background: "#080e17",
    color: "#fff",
    fontSize: "14px",
  },

  passwordBox: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #263750",
    borderRadius: "10px",
    background: "#080e17",
    overflow: "hidden",
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: "48px",
    padding: "0 14px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#fff",
    fontSize: "14px",
  },

  showButton: {
    border: "none",
    background: "transparent",
    color: "#72a9ff",
    padding: "0 13px",
    height: "48px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "11px",
  },

  registerButton: {
    width: "100%",
    height: "50px",
    marginTop: "22px",
    border: "none",
    borderRadius: "10px",
    background: "#fff",
    color: "#000",
    fontSize: "13px",
    fontWeight: "950",
    cursor: "pointer",
  },

  error: {
    padding: "11px 12px",
    marginBottom: "15px",
    borderRadius: "9px",
    background: "#291519",
    border: "1px solid #59262e",
    color: "#ff858c",
    fontSize: "12px",
  },

  success: {
    padding: "11px 12px",
    marginBottom: "15px",
    borderRadius: "9px",
    background: "#112719",
    border: "1px solid #245b35",
    color: "#68e891",
    fontSize: "12px",
  },

  divider: {
    display: "flex",
    justifyContent: "center",
    margin: "25px 0 15px",
    color: "#536178",
    fontSize: "9px",
    fontWeight: "800",
  },

  loginButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "46px",
    borderRadius: "10px",
    border: "1px solid #2a3c57",
    background: "#101a2a",
    color: "#dce6f5",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "900",
  },

  footer: {
    textAlign: "center",
    marginTop: "22px",
    color: "#4f5b6d",
    fontSize: "10px",
  },
};
