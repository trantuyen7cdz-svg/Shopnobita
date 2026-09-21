"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(null);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    setAllowed(true);
    await loadUsers();
    setLoading(false);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, role")
      .order("username", { ascending: true });

    if (error) {
      alert("Không thể tải người dùng: " + error.message);
      return;
    }

    setUsers(data || []);
  }

  useEffect(() => {
    checkAdmin();
  }, []);

  async function changeRole(userId, currentRole) {
    const newRole =
      currentRole === "admin" ? "user" : "admin";

    const ok = confirm(
      `Đổi tài khoản này thành "${newRole}"?`
    );

    if (!ok) return;

    setSaving(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        role: newRole,
      })
      .eq("id", userId);

    setSaving(null);

    if (error) {
      alert("Không thể đổi quyền: " + error.message);
      return;
    }

    await loadUsers();
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        Đang kiểm tra quyền Admin...
      </main>
    );
  }

  if (!allowed) {
    return (
      <main style={styles.loading}>
        <div style={styles.denied}>
          <h1>🚫 Không có quyền</h1>
          <p>Tài khoản này không phải Admin.</p>

          <a href="/dashboard" style={styles.back}>
            ← Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              👤 NGƯỜI DÙNG
            </h1>

            <p style={styles.subtitle}>
              Quản lý tài khoản XENOVA PLAY
            </p>
          </div>

          <a href="/admin" style={styles.back}>
            ← Admin Panel
          </a>
        </div>

        <div style={styles.card}>

          <div style={styles.listHeader}>
            <h2 style={styles.cardTitle}>
              👥 Danh sách tài khoản
            </h2>

            <span style={styles.count}>
              {users.length} tài khoản
            </span>
          </div>

          {users.length === 0 ? (
            <div style={styles.empty}>
              Chưa có tài khoản nào.
            </div>
          ) : (
            <div style={styles.list}>

              {users.map((user) => (
                <div
                  key={user.id}
                  style={styles.userCard}
                >

                  <div style={styles.userTop}>

                    <div style={styles.avatar}>
                      👤
                    </div>

                    <div style={styles.userInfo}>
                      <div style={styles.username}>
                        {user.username ||
                          "Chưa có username"}
                      </div>

                      <div style={styles.email}>
                        {user.email ||
                          "Không có email"}
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.role,
                        ...(user.role === "admin"
                          ? styles.adminRole
                          : styles.userRole),
                      }}
                    >
                      {user.role === "admin"
                        ? "ADMIN"
                        : "USER"}
                    </span>

                  </div>

                  <div style={styles.id}>
                    ID: {user.id}
                  </div>

                  <button
                    onClick={() =>
                      changeRole(
                        user.id,
                        user.role
                      )
                    }
                    disabled={saving === user.id}
                    style={styles.roleButton}
                  >
                    {saving === user.id
                      ? "Đang lưu..."
                      : user.role === "admin"
                      ? "⬇️ Hạ xuống USER"
                      : "⬆️ Cấp quyền ADMIN"}
                  </button>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    padding: "20px 14px 60px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  header: {
    padding: "24px",
    borderRadius: "20px",
    background: "#111",
    border: "1px solid #292929",
    marginBottom: "20px",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "14px",
  },

  title: {
    margin: "8px 0",
    fontSize: "36px",
    fontWeight: "900",
  },

  subtitle: {
    margin: 0,
    color: "#888",
  },

  back: {
    display: "inline-block",
    marginTop: "18px",
    padding: "12px 18px",
    borderRadius: "12px",
    background: "#181818",
    border: "1px solid #333",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "700",
  },

  card: {
    background: "#0e0e0e",
    border: "1px solid #252525",
    borderRadius: "20px",
    padding: "22px",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "23px",
  },

  count: {
    color: "#888",
    fontSize: "13px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  userCard: {
    padding: "18px",
    borderRadius: "16px",
    background: "#151515",
    border: "1px solid #292929",
  },

  userTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#222",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  username: {
    fontWeight: "900",
    fontSize: "17px",
    wordBreak: "break-word",
  },

  email: {
    color: "#888",
    marginTop: "4px",
    fontSize: "13px",
    wordBreak: "break-all",
  },

  role: {
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: "900",
    flexShrink: 0,
  },

  adminRole: {
    color: "#ff1744",
    border: "1px solid #ff1744",
  },

  userRole: {
    color: "#aaa",
    border: "1px solid #444",
  },

  id: {
    marginTop: "14px",
    color: "#555",
    fontSize: "10px",
    wordBreak: "break-all",
  },

  roleButton: {
    width: "100%",
    marginTop: "15px",
    padding: "12px",
    borderRadius: "11px",
    border: "1px solid #333",
    background: "#202020",
    color: "#fff",
    fontWeight: "800",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#777",
  },

  loading: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  denied: {
    padding: "30px",
    background: "#111",
    borderRadius: "20px",
    textAlign: "center",
  },
};
