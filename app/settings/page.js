"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);
    } catch (err) {
      console.error("SETTINGS USER ERROR:", err);
      router.replace("/login");
    }

    setLoading(false);
  }

  async function changePassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu mới.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        console.error("CHANGE PASSWORD ERROR:", updateError);

        setError(
          updateError.message ||
            "Không thể đổi mật khẩu."
        );

        setChangingPassword(false);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");

      setMessage("Đổi mật khẩu thành công.");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi đổi mật khẩu.");
    }

    setChangingPassword(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải cài đặt...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Link href="/dashboard" style={styles.back}>
          ← Quay lại tài khoản
        </Link>

        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              ⚙️ Cài đặt
            </h1>

            <p style={styles.subtitle}>
              Quản lý thông tin và bảo mật tài khoản.
            </p>
          </div>
        </div>

        {/* THÔNG TIN TÀI KHOẢN */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            👤 Thông tin tài khoản
          </div>

          <div style={styles.account}>
            <div style={styles.avatar}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={styles.emailLabel}>
                EMAIL
              </div>

              <div style={styles.email}>
                {user?.email}
              </div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <Info
              label="ID tài khoản"
              value={user?.id}
            />

            <Info
              label="Ngày tạo"
              value={
                user?.created_at
                  ? new Date(
                      user.created_at
                    ).toLocaleDateString("vi-VN")
                  : "—"
              }
            />
          </div>
        </section>

        {/* ĐỔI MẬT KHẨU */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            🔐 Đổi mật khẩu
          </div>

          <p style={styles.cardDescription}>
            Sử dụng mật khẩu mạnh và không chia sẻ
            mật khẩu với người khác.
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

          <form onSubmit={changePassword}>
            <label style={styles.label}>
              MẬT KHẨU MỚI
            </label>

            <div style={styles.passwordBox}>
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
                disabled={changingPassword}
                style={styles.passwordInput}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
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
                type={
                  showConfirm
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={changingPassword}
                style={styles.passwordInput}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm(!showConfirm)
                }
                style={styles.showButton}
              >
                {showConfirm ? "Ẩn" : "Hiện"}
              </button>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              style={{
                ...styles.primaryButton,
                opacity: changingPassword
                  ? 0.6
                  : 1,
              }}
            >
              {changingPassword
                ? "ĐANG CẬP NHẬT..."
                : "ĐỔI MẬT KHẨU"}
            </button>
          </form>
        </section>

        {/* LIÊN KẾT */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>
            ⚡ Truy cập nhanh
          </div>

          <div style={styles.links}>
            <QuickLink
              href="/dashboard"
              icon="👤"
              text="Tài khoản"
            />

            <QuickLink
              href="/shop"
              icon="🛒"
              text="Cửa hàng"
            />

            <QuickLink
              href="/deposit"
              icon="💰"
              text="Nạp tiền"
            />

            <QuickLink
              href="/keys"
              icon="🔑"
              text="KEY của tôi"
            />

            <QuickLink
              href="/orders"
              icon="📦"
              text="Đơn hàng"
            />
          </div>
        </section>

        {/* ĐĂNG XUẤT */}
        <section style={styles.dangerCard}>
          <div>
            <div style={styles.dangerTitle}>
              🚪 Đăng xuất
            </div>

            <div style={styles.dangerText}>
              Đăng xuất khỏi tài khoản trên thiết bị này.
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logout}
          >
            ĐĂNG XUẤT
          </button>
        </section>

        <div style={styles.footer}>
          © 2026 XENOVA PLAY
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.info}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function QuickLink({ href, icon, text }) {
  return (
    <Link href={href} style={styles.quickLink}>
      <span style={styles.quickIcon}>
        {icon}
      </span>

      <span>{text}</span>

      <span style={styles.arrow}>›</span>
    </Link>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111d36 0%, #070b12 45%, #040609 100%)",
    color: "#fff",
    padding: "30px 15px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
  },

  back: {
    display: "inline-block",
    marginBottom: "22px",
    color: "#7f8da3",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  header: {
    marginBottom: "22px",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#101b30",
    border: "1px solid #263c65",
    color: "#72a9ff",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  title: {
    margin: "11px 0 5px",
    fontSize: "clamp(28px, 6vw, 38px)",
    fontWeight: "950",
  },

  subtitle: {
    margin: 0,
    color: "#77859b",
    fontSize: "13px",
  },

  card: {
    marginBottom: "14px",
    padding: "20px",
    borderRadius: "17px",
    background: "#0d1420",
    border: "1px solid #202d42",
  },

  cardTitle: {
    marginBottom: "16px",
    fontSize: "15px",
    fontWeight: "900",
  },

  cardDescription: {
    margin: "-7px 0 18px",
    color: "#718097",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  account: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px",
    borderRadius: "12px",
    background: "#09101a",
    border: "1px solid #19283c",
  },

  avatar: {
    width: "45px",
    height: "45px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    background: "#172942",
    color: "#72a9ff",
    fontSize: "17px",
    fontWeight: "900",
  },

  emailLabel: {
    color: "#5f6d82",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  email: {
    marginTop: "3px",
    color: "#dce4ef",
    fontSize: "13px",
    wordBreak: "break-all",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "10px",
  },

  info: {
    padding: "11px",
    borderRadius: "10px",
    background: "#080d15",
  },

  label: {
    display: "block",
    margin: "14px 0 7px",
    color: "#7c8aa0",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
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
    height: "47px",
    padding: "0 13px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#fff",
    fontSize: "13px",
  },

  showButton: {
    height: "47px",
    padding: "0 12px",
    border: "none",
    background: "transparent",
    color: "#72a9ff",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "900",
  },

  primaryButton: {
    width: "100%",
    height: "47px",
    marginTop: "18px",
    border: "none",
    borderRadius: "10px",
    background: "#fff",
    color: "#000",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "950",
  },

  error: {
    padding: "11px",
    borderRadius: "9px",
    background: "#291519",
    border: "1px solid #59262e",
    color: "#ff858c",
    fontSize: "11px",
  },

  success: {
    padding: "11px",
    borderRadius: "9px",
    background: "#112719",
    border: "1px solid #245b35",
    color: "#68e891",
    fontSize: "11px",
  },

  links: {
    display: "grid",
    gap: "7px",
  },

  quickLink: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minHeight: "50px",
    padding: "0 11px",
    borderRadius: "10px",
    background: "#0a111b",
    border: "1px solid #19283b",
    color: "#dbe4f0",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "700",
  },

  quickIcon: {
    width: "29px",
    textAlign: "center",
    fontSize: "17px",
  },

  arrow: {
    marginLeft: "auto",
    color: "#536177",
    fontSize: "21px",
  },

  dangerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    padding: "18px",
    borderRadius: "17px",
    background: "#160d10",
    border: "1px solid #402027",
  },

  dangerTitle: {
    fontSize: "13px",
    fontWeight: "900",
  },

  dangerText: {
    marginTop: "4px",
    color: "#796a70",
    fontSize: "10px",
  },

  logout: {
    padding: "10px 14px",
    borderRadius: "9px",
    border: "1px solid #5a2931",
    background: "#261316",
    color: "#ff858c",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "900",
  },

  loading: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    color: "#7d899c",
    fontSize: "13px",
  },

  footer: {
    marginTop: "25px",
    textAlign: "center",
    color: "#4f5b6d",
    fontSize: "10px",
  },
};
