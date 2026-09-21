"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    availableKeys: 0,
    soldKeys: 0,
    orders: 0,

    todayRevenue: 0,
    todaySoldKeys: 0,
    todayOrders: 0,
    todayUsers: 0,

    totalRevenue: 0,
  });

  const [products, setProducts] = useState([]);

  // =========================
  // FORM TẠO SẢN PHẨM
  // =========================

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [keyText, setKeyText] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================
  // THỜI GIAN HÔM NAY
  // =========================

  function getTodayRange() {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // =========================
  // LOAD DASHBOARD
  // =========================

  async function loadDashboard() {
    setLoading(true);

    try {
      const {
        start: todayStart,
        end: tomorrowStart,
      } = getTodayRange();

      const [
        usersResult,
        productsResult,
        availableKeysResult,
        soldKeysResult,
        ordersResult,

        allCompletedOrdersResult,
        todayCompletedOrdersResult,

        todaySoldKeysResult,
        todayUsersResult,
      ] = await Promise.all([
        // =========================
        // TỔNG THÀNH VIÊN
        // =========================

        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          }),

        // =========================
        // SẢN PHẨM
        // =========================

        supabase
          .from("products")
          .select("*")
          .order("id", {
            ascending: true,
          }),

        // =========================
        // KEY TRONG KHO
        // =========================

        supabase
          .from("keys")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "available"),

        // =========================
        // KEY ĐÃ BÁN
        // =========================

        supabase
          .from("keys")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "sold"),

        // =========================
        // TỔNG ĐƠN
        // =========================

        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          }),

        // =========================
        // ĐƠN ĐÃ HOÀN THÀNH
        // =========================

        supabase
          .from("orders")
          .select("amount")
          .eq("status", "completed"),

        // =========================
        // ĐƠN HOÀN THÀNH HÔM NAY
        // =========================

        supabase
          .from("orders")
          .select("id, amount, updated_at")
          .eq("status", "completed")
          .gte("updated_at", todayStart)
          .lt("updated_at", tomorrowStart),

        // =========================
        // KEY BÁN HÔM NAY
        // =========================

        supabase
          .from("keys")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "sold")
          .gte("sold_at", todayStart)
          .lt("sold_at", tomorrowStart),

        // =========================
        // MEMBER MỚI HÔM NAY
        // =========================

        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          })
          .gte("created_at", todayStart)
          .lt("created_at", tomorrowStart),
      ]);

      // =========================
      // DOANH THU TỔNG
      // =========================

      const totalRevenue = (
        allCompletedOrdersResult.data || []
      ).reduce((total, order) => {
        return total + Number(order.amount || 0);
      }, 0);

      // =========================
      // DOANH THU HÔM NAY
      // =========================

      const todayRevenue = (
        todayCompletedOrdersResult.data || []
      ).reduce((total, order) => {
        return total + Number(order.amount || 0);
      }, 0);

      // =========================
      // CẬP NHẬT STATS
      // =========================

      setStats({
        users: usersResult.count || 0,

        products:
          productsResult.data?.length || 0,

        availableKeys:
          availableKeysResult.count || 0,

        soldKeys:
          soldKeysResult.count || 0,

        orders:
          ordersResult.count || 0,

        todayRevenue,

        todaySoldKeys:
          todaySoldKeysResult.count || 0,

        todayOrders:
          todayCompletedOrdersResult.data?.length || 0,

        todayUsers:
          todayUsersResult.count || 0,

        totalRevenue,
      });

      setProducts(productsResult.data || []);
    } catch (error) {
      console.error(
        "ADMIN DASHBOARD ERROR:",
        error
      );
    }

    setLoading(false);
  }

  // =========================
  // TẠO SẢN PHẨM + KHO KEY
  // =========================

  async function createProduct() {
    if (saving) return;

    if (!name.trim()) {
      alert("Vui lòng nhập tên sản phẩm");
      return;
    }

    if (!price || Number(price) <= 0) {
      alert("Vui lòng nhập giá sản phẩm");
      return;
    }

    if (
      !durationDays ||
      Number(durationDays) <= 0
    ) {
      alert("Vui lòng nhập thời hạn KEY");
      return;
    }

    const keys = keyText
      .split("\n")
      .map((key) => key.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      alert("Vui lòng nhập ít nhất 1 KEY");
      return;
    }

    setSaving(true);

    try {
      // =========================
      // TẠO SẢN PHẨM
      // =========================

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          duration_days: Number(durationDays),
          active: true,
          is_active: true,
        })
        .select()
        .single();

      if (productError) {
        console.error(productError);

        alert(
          "Không thể tạo sản phẩm:\n" +
            productError.message
        );

        return;
      }

      // =========================
      // TẠO KHO KEY
      // =========================

      const keyRows = keys.map(
        (keyCode) => ({
          key_code: keyCode,
          product_id: product.id,
          user_id: null,
          order_id: null,
          expires_at: null,
          sold_at: null,
          status: "available",
        })
      );

      const {
        error: keyError,
      } = await supabase
        .from("keys")
        .insert(keyRows);

      if (keyError) {
        console.error(keyError);

        await supabase
          .from("products")
          .delete()
          .eq("id", product.id);

        alert(
          "Tạo sản phẩm thành công nhưng thêm KEY thất bại:\n" +
            keyError.message
        );

        return;
      }

      alert(
        `Đã tạo sản phẩm thành công!\n\n` +
          `Sản phẩm: ${product.name}\n` +
          `Số KEY: ${keys.length}`
      );

      // =========================
      // RESET FORM
      // =========================

      setName("");
      setDescription("");
      setPrice("");
      setDurationDays("");
      setKeyText("");

      await loadDashboard();
    } catch (error) {
      console.error(
        "CREATE PRODUCT ERROR:",
        error
      );

      alert(
        "Có lỗi xảy ra:\n" +
          error.message
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // FORMAT TIỀN
  // =========================

  function formatMoney(value) {
    return (
      Number(value || 0).toLocaleString(
        "vi-VN"
      ) + "đ"
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* =========================
            HEADER
        ========================= */}

        <div style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              ADMIN DASHBOARD
            </h1>

            <p style={styles.subtitle}>
              Quản lý sản phẩm, kho KEY,
              đơn hàng và nạp tiền
            </p>
          </div>

          <button
            onClick={loadDashboard}
            style={styles.refreshButton}
          >
            ↻ Làm mới
          </button>
        </div>

        {/* =========================
            MENU
        ========================= */}

        <div style={styles.menu}>
          <Link
            href="/admin"
            style={styles.menuActive}
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
            style={styles.menuItemDeposit}
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

        {/* =========================
            THỐNG KÊ
        ========================= */}

        <section style={styles.statsGrid}>

          <StatCard
            icon="💰"
            title="DOANH THU HÔM NAY"
            value={
              loading
                ? "..."
                : formatMoney(
                    stats.todayRevenue
                  )
            }
          />

          <StatCard
            icon="🔑"
            title="KEY BÁN HÔM NAY"
            value={
              loading
                ? "..."
                : stats.todaySoldKeys
            }
          />

          <StatCard
            icon="🧾"
            title="ĐƠN HOÀN THÀNH HÔM NAY"
            value={
              loading
                ? "..."
                : stats.todayOrders
            }
          />

          <StatCard
            icon="👤"
            title="MEMBER MỚI HÔM NAY"
            value={
              loading
                ? "..."
                : stats.todayUsers
            }
          />

          <StatCard
            icon="💵"
            title="DOANH THU TỔNG"
            value={
              loading
                ? "..."
                : formatMoney(
                    stats.totalRevenue
                  )
            }
          />

          <StatCard
            icon="🔐"
            title="KEY ĐÃ BÁN"
            value={
              loading
                ? "..."
                : stats.soldKeys
            }
          />

          <StatCard
            icon="📦"
            title="KEY TRONG KHO"
            value={
              loading
                ? "..."
                : stats.availableKeys
            }
          />

          <StatCard
            icon="👥"
            title="TỔNG THÀNH VIÊN"
            value={
              loading
                ? "..."
                : stats.users
            }
          />

        </section>

        {/* =========================
            TẠO SẢN PHẨM
        ========================= */}

        <section style={styles.createBox}>

          <h2 style={styles.createTitle}>
            TẠO SẢN PHẨM
          </h2>

          <label style={styles.label}>
            Tên sản phẩm
          </label>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="KEY 1 NGÀY"
            style={styles.input}
          />

          <label style={styles.label}>
            Mô tả
          </label>

          <input
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Dùng 24h"
            style={styles.input}
          />

          <label style={styles.label}>
            Giá
          </label>

          <input
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            placeholder="10000"
            type="number"
            style={styles.input}
          />

          <label style={styles.label}>
            Thời hạn KEY
          </label>

          <input
            value={durationDays}
            onChange={(e) =>
              setDurationDays(
                e.target.value
              )
            }
            placeholder="1"
            type="number"
            style={styles.input}
          />

          <div style={styles.durationHint}>
            Ví dụ: 1 = 1 ngày, 7 = 7 ngày
          </div>

          <label style={styles.label}>
            KEY CÓ SẴN
          </label>

          <textarea
            value={keyText}
            onChange={(e) =>
              setKeyText(e.target.value)
            }
            placeholder={
              "KEY-AAA\nKEY-BBB\nKEY-CCC"
            }
            style={styles.textarea}
          />

          <div style={styles.keyHint}>
            Mỗi dòng nhập 1 KEY
          </div>

          {keyText.trim() && (
            <div style={styles.previewBox}>

              <div style={styles.previewTitle}>
                KHO KEY SẼ TẠO
              </div>

              {keyText
                .split("\n")
                .map((key) =>
                  key.trim()
                )
                .filter(Boolean)
                .map(
                  (key, index) => (
                    <div
                      key={index}
                      style={
                        styles.previewKey
                      }
                    >
                      🔑 {key}
                    </div>
                  )
                )}

            </div>
          )}

          <button
            onClick={createProduct}
            disabled={saving}
            style={{
              ...styles.createButton,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? "ĐANG TẠO..."
              : "THÊM SẢN PHẨM"}
          </button>

        </section>

        {/* =========================
            DANH SÁCH SẢN PHẨM
        ========================= */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              SẢN PHẨM HIỆN CÓ
            </h2>

            <Link
              href="/admin/products"
              style={styles.viewAll}
            >
              Quản lý →
            </Link>
          </div>

          {products.length === 0 ? (
            <div style={styles.empty}>
              Chưa có sản phẩm
            </div>
          ) : (
            <div style={styles.productList}>

              {products.map(
                (product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                  />
                )
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

// =========================
// STAT CARD
// =========================

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div style={styles.statCard}>

      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statTitle}>
          {title}
        </div>

        <div style={styles.statValue}>
          {value}
        </div>
      </div>

    </div>
  );
}

// =========================
// PRODUCT ROW
// =========================

function ProductRow({
  product,
}) {
  const [stock, setStock] =
    useState("...");

  useEffect(() => {
    loadStock();
  }, []);

  async function loadStock() {
    const { count } =
      await supabase
        .from("keys")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "product_id",
          product.id
        )
        .eq(
          "status",
          "available"
        );

    setStock(count || 0);
  }

  const active =
    product.active !== false &&
    product.is_active !== false;

  return (
    <div style={styles.productRow}>

      <div>
        <div style={styles.productName}>
          {product.name}
        </div>

        <div
          style={
            styles.productDescription
          }
        >
          {product.description ||
            "Không có mô tả"}
        </div>
      </div>

      <div style={styles.productPrice}>
        {Number(
          product.price || 0
        ).toLocaleString(
          "vi-VN"
        )}
        đ
      </div>

      <div
        style={
          styles.productDuration
        }
      >
        {product.duration_days ||
          0}{" "}
        ngày
      </div>

      <div
        style={{
          ...styles.status,
          color: active
            ? "#00e676"
            : "#ff1744",
        }}
      >
        {active
          ? "ĐANG BÁN"
          : "TẮT"}
      </div>

      <div style={styles.stock}>
        Kho: <b>{stock}</b>
      </div>

    </div>
  );
}

// =========================
// STYLES
// =========================

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
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "22px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "4px",
  },

  title: {
    margin: "6px 0 0",
    fontSize: "28px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    margin: "6px 0 0",
    fontSize: "13px",
  },

  refreshButton: {
    background: "#151515",
    color: "#fff",
    border:
      "1px solid #292929",
    borderRadius: "9px",
    padding: "11px 15px",
    fontWeight: "800",
    cursor: "pointer",
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
    border:
      "1px solid #222",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "800",
  },

  menuItemDeposit: {
    textDecoration: "none",
    color: "#fff",
    background:
      "linear-gradient(135deg, #6b3cff, #8b4dff)",
    border:
      "1px solid #8050ff",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "900",
  },

  menuActive: {
    textDecoration: "none",
    color: "#fff",
    background: "#e50932",
    border:
      "1px solid #e50932",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "900",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
  },

  statCard: {
    background:
      "linear-gradient(145deg, #151515, #0b0b0b)",
    border:
      "1px solid #242424",
    borderRadius: "13px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    background: "#1c1c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },

  statTitle: {
    color: "#777",
    fontSize: "10px",
    fontWeight: "900",
  },

  statValue: {
    fontSize: "20px",
    fontWeight: "900",
    marginTop: "4px",
  },

  createBox: {
    marginTop: "22px",
    background: "#0b0b0b",
    border:
      "1px solid #252525",
    borderRadius: "15px",
    padding: "20px",
  },

  createTitle: {
    margin: "0 0 20px",
    fontSize: "18px",
    fontWeight: "900",
  },

  label: {
    display: "block",
    color: "#aaa",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "7px",
    marginTop: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#111",
    color: "#fff",
    border:
      "1px solid #292929",
    borderRadius: "9px",
    padding: "13px",
    outline: "none",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    minHeight: "130px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#111",
    color: "#fff",
    border:
      "1px solid #292929",
    borderRadius: "9px",
    padding: "13px",
    outline: "none",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  durationHint: {
    color: "#555",
    fontSize: "11px",
    marginTop: "5px",
  },

  keyHint: {
    color: "#555",
    fontSize: "11px",
    marginTop: "5px",
  },

  previewBox: {
    marginTop: "15px",
    background: "#080808",
    border:
      "1px solid #222",
    borderRadius: "10px",
    padding: "12px",
  },

  previewTitle: {
    color: "#777",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "8px",
  },

  previewKey: {
    background: "#111",
    border:
      "1px solid #1f1f1f",
    borderRadius: "7px",
    padding: "8px 10px",
    marginBottom: "5px",
    fontSize: "12px",
    color: "#ddd",
  },

  createButton: {
    width: "100%",
    marginTop: "18px",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    background: "#e50932",
    color: "#fff",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer",
  },

  section: {
    marginTop: "22px",
    background: "#0b0b0b",
    border:
      "1px solid #202020",
    borderRadius: "15px",
    padding: "18px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "900",
  },

  viewAll: {
    color: "#ff1744",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "900",
  },

  productList: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  productRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(170px, 1fr) 100px 80px 90px 70px",
    gap: "10px",
    alignItems: "center",
    background: "#111",
    border:
      "1px solid #1d1d1d",
    borderRadius: "9px",
    padding: "12px",
  },

  productName: {
    fontWeight: "900",
    fontSize: "13px",
  },

  productDescription: {
    color: "#666",
    fontSize: "11px",
    marginTop: "3px",
  },

  productPrice: {
    color: "#00e676",
    fontWeight: "900",
    fontSize: "13px",
  },

  productDuration: {
    color: "#aaa",
    fontSize: "12px",
  },

  status: {
    fontSize: "9px",
    fontWeight: "900",
  },

  stock: {
    color: "#aaa",
    fontSize: "11px",
  },

  empty: {
    textAlign: "center",
    color: "#555",
    padding: "25px",
  },
};
