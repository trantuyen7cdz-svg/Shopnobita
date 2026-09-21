"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default function AdminDepositsPage() {
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadDeposits();
  }, []);

  async function loadDeposits() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("LOAD DEPOSITS ERROR:", error);

        setMessage(
          "Không thể tải danh sách đơn nạp: " +
            error.message
        );

        return;
      }

      setDeposits(data || []);
    } catch (error) {
      console.error("LOAD DEPOSITS ERROR:", error);

      setMessage(
        "Có lỗi xảy ra khi tải đơn nạp."
      );
    } finally {
      setLoading(false);
    }
  }

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
    }

    return session.access_token;
  }

  async function approveDeposit(depositId) {
    if (!depositId || processingId) return;

    const confirmed = window.confirm(
      "Bạn chắc chắn muốn DUYỆT đơn nạp tiền này?\n\n" +
        "Tiền sẽ được cộng vào ví của tài khoản."
    );

    if (!confirmed) return;

    setProcessingId(depositId);
    setMessage("");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/approve-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            depositId: Number(depositId),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error(
          "APPROVE DEPOSIT RESPONSE:",
          result
        );

        setMessage(
          result.message ||
            "Không thể duyệt đơn nạp tiền."
        );

        return;
      }

      alert(
        "Đã duyệt nạp tiền và cộng tiền vào ví."
      );

      await loadDeposits();
    } catch (error) {
      console.error(
        "APPROVE DEPOSIT ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Có lỗi xảy ra khi duyệt đơn nạp tiền."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectDeposit(depositId) {
    if (!depositId || processingId) return;

    const confirmed = window.confirm(
      "Bạn chắc chắn muốn TỪ CHỐI đơn nạp tiền này?\n\n" +
        "Đơn sẽ chuyển sang THẤT BẠI và KHÔNG được cộng tiền vào ví."
    );

    if (!confirmed) return;

    setProcessingId(depositId);
    setMessage("");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/reject-deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            depositId: Number(depositId),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error(
          "REJECT DEPOSIT RESPONSE:",
          result
        );

        setMessage(
          result.message ||
            "Không thể từ chối đơn nạp tiền."
        );

        return;
      }

      alert("Đã từ chối đơn nạp tiền.");

      await loadDeposits();
    } catch (error) {
      console.error(
        "REJECT DEPOSIT ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Có lỗi xảy ra khi từ chối đơn nạp tiền."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString("vi-VN") +
      "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleString(
      "vi-VN"
    );
  }

  const filteredDeposits =
    filter === "all"
      ? deposits
      : deposits.filter(
          (item) => item.status === filter
        );

  const pendingCount = deposits.filter(
    (item) => item.status === "pending"
  ).length;

  const completedCount = deposits.filter(
    (item) => item.status === "completed"
  ).length;

  const failedCount = deposits.filter(
    (item) => item.status === "failed"
  ).length;

  const totalPending = deposits
    .filter(
      (item) => item.status === "pending"
    )
    .reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <Link
              href="/admin"
              style={styles.back}
            >
              ← ADMIN
            </Link>

            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ NẠP TIỀN
            </h1>

            <p style={styles.subtitle}>
              Kiểm tra và xử lý các yêu cầu nạp tiền
            </p>
          </div>

          <button
            onClick={loadDeposits}
            disabled={loading}
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.6 : 1,
            }}
          >
            ↻ Làm mới
          </button>
        </div>

        {/* MENU */}

        <div style={styles.menu}>
          <Link
            href="/admin"
            style={styles.menuItem}
          >
            Tổng quan
          </Link>

          <Link
            href="/admin/products"
            style={styles.menuItem}
          >
            Sản phẩm
          </Link>

          <Link
            href="/admin/keys"
            style={styles.menuItem}
          >
            Kho KEY
          </Link>

          <Link
            href="/admin/orders"
            style={styles.menuItem}
          >
            Đơn hàng
          </Link>

          <Link
            href="/admin/deposits"
            style={styles.menuActive}
          >
            💰 Nạp tiền
          </Link>

          <Link
            href="/admin/users"
            style={styles.menuItem}
          >
            Thành viên
          </Link>
        </div>

        {/* THỐNG KÊ */}

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statIcon}>
              ⏳
            </div>

            <div>
              <div style={styles.statLabel}>
                ĐANG CHỜ
              </div>

              <div style={styles.statValue}>
                {pendingCount}
              </div>
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>
              💰
            </div>

            <div>
              <div style={styles.statLabel}>
                TIỀN ĐANG CHỜ
              </div>

              <div style={styles.statValue}>
                {formatMoney(totalPending)}
              </div>
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>
              ✅
            </div>

            <div>
              <div style={styles.statLabel}>
                HOÀN THÀNH
              </div>

              <div style={styles.statValue}>
                {completedCount}
              </div>
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statIcon}>
              ❌
            </div>

            <div>
              <div style={styles.statLabel}>
                THẤT BẠI
              </div>

              <div style={styles.statValue}>
                {failedCount}
              </div>
            </div>
          </div>
        </div>

        {/* BỘ LỌC */}

        <div style={styles.filterBox}>
          <button
            onClick={() => setFilter("pending")}
            style={
              filter === "pending"
                ? styles.filterActive
                : styles.filter
            }
          >
            Đang chờ
          </button>

          <button
            onClick={() => setFilter("completed")}
            style={
              filter === "completed"
                ? styles.filterActive
                : styles.filter
            }
          >
            Hoàn thành
          </button>

          <button
            onClick={() => setFilter("failed")}
            style={
              filter === "failed"
                ? styles.filterActive
                : styles.filter
            }
          >
            Thất bại
          </button>

          <button
            onClick={() => setFilter("all")}
            style={
              filter === "all"
                ? styles.filterActive
                : styles.filter
            }
          >
            Tất cả
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div style={styles.error}>
            {message}
          </div>
        )}

        {/* DANH SÁCH */}

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                DANH SÁCH ĐƠN NẠP
              </h2>

              <div style={styles.count}>
                {filteredDeposits.length} đơn
              </div>
            </div>
          </div>

          {loading ? (
            <div style={styles.empty}>
              Đang tải...
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div style={styles.empty}>
              Không có đơn nạp nào.
            </div>
          ) : (
            <div style={styles.list}>
              {filteredDeposits.map((item) => (
                <DepositCard
                  key={item.id}
                  item={item}
                  processingId={processingId}
                  approveDeposit={
                    approveDeposit
                  }
                  rejectDeposit={
                    rejectDeposit
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DepositCard({
  item,
  processingId,
  approveDeposit,
  rejectDeposit,
}) {
  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleString(
      "vi-VN"
    );
  }

  const statusText =
    item.status === "pending"
      ? "ĐANG CHỜ"
      : item.status === "completed"
      ? "HOÀN THÀNH"
      : item.status === "failed"
      ? "THẤT BẠI"
      : item.status;

  const statusColor =
    item.status === "pending"
      ? "#e9c34a"
      : item.status === "completed"
      ? "#00e676"
      : "#ff5252";

  const isProcessing =
    processingId === item.id;

  return (
    <div style={styles.depositCard}>

      <div style={styles.depositTop}>
        <div>
          <div style={styles.depositId}>
            ĐƠN #{item.id}
          </div>

          <div style={styles.date}>
            {formatDate(item.created_at)}
          </div>
        </div>

        <div
          style={{
            ...styles.status,
            color: statusColor,
          }}
        >
          {statusText}
        </div>
      </div>

      <div style={styles.amount}>
        {formatMoney(item.amount)}
      </div>

      <div style={styles.infoGrid}>

        <div style={styles.infoBox}>
          <span style={styles.infoLabel}>
            USER ID
          </span>

          <strong style={styles.userId}>
            {item.user_id || "-"}
          </strong>
        </div>

        <div style={styles.infoBox}>
          <span style={styles.infoLabel}>
            NỘI DUNG CHUYỂN KHOẢN
          </span>

          <strong
            style={styles.transferContent}
          >
            {item.transfer_content ||
              "Chưa có"}
          </strong>
        </div>

      </div>

      {item.updated_at && (
        <div style={styles.updated}>
          Cập nhật:{" "}
          {formatDate(item.updated_at)}
        </div>
      )}

      {/* ĐƠN ĐANG CHỜ */}

      {item.status === "pending" && (
        <div style={styles.pendingArea}>

          <div style={styles.pendingNote}>
            ⏳ Đơn đang chờ xử lý.
          </div>

          <div style={styles.actionRow}>

            <button
              onClick={() =>
                approveDeposit(item.id)
              }
              disabled={!!processingId}
              style={{
                ...styles.approveButton,
                opacity: processingId
                  ? 0.6
                  : 1,
                cursor: processingId
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isProcessing
                ? "⏳ ĐANG DUYỆT..."
                : "✓ DUYỆT + CỘNG TIỀN"}
            </button>

            <button
              onClick={() =>
                rejectDeposit(item.id)
              }
              disabled={!!processingId}
              style={{
                ...styles.rejectButton,
                opacity: processingId
                  ? 0.6
                  : 1,
                cursor: processingId
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isProcessing
                ? "⏳ ĐANG XỬ LÝ..."
                : "✕ TỪ CHỐI"}
            </button>

          </div>

        </div>
      )}

      {/* ĐÃ DUYỆT */}

      {item.status === "completed" && (
        <div style={styles.completedNote}>
          ✅ Đã duyệt và tiền đã được cộng vào ví.
        </div>
      )}

      {/* ĐÃ TỪ CHỐI */}

      {item.status === "failed" && (
        <div style={styles.failedNote}>
          ❌ Đơn nạp đã bị từ chối.
        </div>
      )}

    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #151515 0%, #050505 45%, #000 100%)",
    color: "#fff",
    padding: "25px 14px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },

  back: {
    display: "inline-block",
    color: "#888",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "12px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "4px",
  },

  title: {
    margin: "5px 0",
    fontSize: "28px",
    fontWeight: "900",
  },

  subtitle: {
    margin: 0,
    color: "#666",
    fontSize: "13px",
  },

  refreshButton: {
    border: "1px solid #292929",
    background: "#111",
    color: "#fff",
    borderRadius: "9px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: "800",
  },

  menu: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "20px",
  },

  menuItem: {
    textDecoration: "none",
    color: "#aaa",
    background: "#101010",
    border: "1px solid #222",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "800",
  },

  menuActive: {
    textDecoration: "none",
    color: "#fff",
    background:
      "linear-gradient(135deg, #6b3cff, #8b4dff)",
    border: "1px solid #8050ff",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "900",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
    marginBottom: "15px",
  },

  stat: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background:
      "linear-gradient(145deg, #151515, #0b0b0b)",
    border: "1px solid #242424",
    borderRadius: "13px",
    padding: "15px",
  },

  statIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#1c1c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  statLabel: {
    color: "#777",
    fontSize: "9px",
    fontWeight: "900",
  },

  statValue: {
    marginTop: "4px",
    fontSize: "18px",
    fontWeight: "900",
  },

  filterBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "15px",
  },

  filter: {
    border: "1px solid #292929",
    background: "#111",
    color: "#aaa",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "12px",
  },

  filterActive: {
    border: "1px solid #8050ff",
    background:
      "linear-gradient(135deg, #6b3cff, #8b4dff)",
    color: "#fff",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "12px",
  },

  error: {
    background: "#2a1010",
    border: "1px solid #5b2020",
    color: "#ff8585",
    padding: "13px",
    borderRadius: "10px",
    marginBottom: "15px",
    fontSize: "13px",
  },

  section: {
    background: "#0b0b0b",
    border: "1px solid #202020",
    borderRadius: "15px",
    padding: "18px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "900",
  },

  count: {
    marginTop: "4px",
    color: "#666",
    fontSize: "11px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  depositCard: {
    background: "#111",
    border: "1px solid #242424",
    borderRadius: "12px",
    padding: "16px",
  },

  depositTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  depositId: {
    fontSize: "13px",
    fontWeight: "900",
    wordBreak: "break-all",
  },

  date: {
    marginTop: "5px",
    color: "#666",
    fontSize: "11px",
  },

  status: {
    fontSize: "10px",
    fontWeight: "900",
  },

  amount: {
    marginTop: "15px",
    fontSize: "24px",
    fontWeight: "900",
    color: "#00e676",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "8px",
    marginTop: "14px",
  },

  infoBox: {
    background: "#090909",
    border: "1px solid #1d1d1d",
    borderRadius: "8px",
    padding: "10px",
  },

  infoLabel: {
    display: "block",
    color: "#666",
    fontSize: "9px",
    fontWeight: "900",
    marginBottom: "6px",
  },

  userId: {
    display: "block",
    color: "#bbb",
    fontSize: "10px",
    wordBreak: "break-all",
  },

  transferContent: {
    display: "block",
    color: "#72e69a",
    fontSize: "14px",
    letterSpacing: "1px",
    wordBreak: "break-all",
  },

  updated: {
    color: "#555",
    fontSize: "10px",
    marginTop: "10px",
  },

  pendingArea: {
    marginTop: "12px",
  },

  pendingNote: {
    padding: "9px",
    borderRadius: "7px",
    background: "#211b0b",
    border: "1px solid #4d3b10",
    color: "#e8d28a",
    fontSize: "11px",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 150px",
    gap: "8px",
    marginTop: "9px",
  },

  approveButton: {
    width: "100%",
    border: "none",
    borderRadius: "9px",
    padding: "13px",
    background:
      "linear-gradient(135deg, #00a844, #00c853)",
    color: "#fff",
    fontWeight: "900",
    fontSize: "13px",
  },

  rejectButton: {
    width: "100%",
    border: "1px solid #7a2020",
    borderRadius: "9px",
    padding: "13px",
    background: "#2a0d0d",
    color: "#ff6565",
    fontWeight: "900",
    fontSize: "13px",
  },

  completedNote: {
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
    background: "#092016",
    border: "1px solid #124d2b",
    color: "#55e58a",
    fontSize: "11px",
  },

  failedNote: {
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
    background: "#241010",
    border: "1px solid #4d1d1d",
    color: "#ff7777",
    fontSize: "11px",
  },

  empty: {
    textAlign: "center",
    color: "#555",
    padding: "45px 20px",
    fontSize: "13px",
  },
};
