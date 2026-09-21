"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrdersPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    setUser(user);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        product_id,
        amount,
        status,
        created_at,
        updated_at,
        products (
          id,
          name,
          duration_days
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (!error && data) {
      const ordersWithKeys = await Promise.all(
        data.map(async (order) => {
          const { data: keys } = await supabase
            .from("keys")
            .select(`
              id,
              key_code,
              status,
              expires_at,
              created_at
            `)
            .eq("user_id", user.id)
            .eq("order_id", order.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(1);

          return {
            ...order,
            key: keys?.[0] || null,
          };
        })
      );

      setOrders(ordersWithKeys);
    }

    setLoading(false);
  }

  async function copyKey(key, orderId) {
    try {
      await navigator.clipboard.writeText(
        key.key_code
      );

      setCopiedId(orderId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Không thể copy KEY.");
    }
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString(
      "vi-VN"
    ) + "đ";
  }

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString(
      "vi-VN"
    );
  }

  function getStatus(status) {
    if (status === "paid") {
      return {
        text: "ĐÃ THANH TOÁN",
        color: "#00c853",
      };
    }

    if (status === "rejected") {
      return {
        text: "ĐÃ TỪ CHỐI",
        color: "#ff1744",
      };
    }

    return {
      text: "ĐANG CHỜ",
      color: "#ffc107",
    };
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        ĐANG TẢI ĐƠN HÀNG...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              LỊCH SỬ ĐƠN HÀNG
            </h1>

            <p style={styles.email}>
              {user?.email}
            </p>
          </div>

          <button
            style={styles.backButton}
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
          >
            ← DASHBOARD
          </button>
        </header>

        {orders.length === 0 ? (
          <section style={styles.empty}>
            <div style={styles.emptyIcon}>
              🧾
            </div>

            <h2>CHƯA CÓ ĐƠN HÀNG</h2>

            <p>
              Bạn chưa có đơn hàng nào.
            </p>

            <button
              style={styles.buyButton}
              onClick={() => {
                window.location.href =
                  "/shop";
              }}
            >
              🛒 MUA KEY
            </button>
          </section>
        ) : (
          <section style={styles.list}>
            {orders.map((order) => {
              const status = getStatus(
                order.status
              );

              return (
                <div
                  key={order.id}
                  style={styles.order}
                >
                  <div style={styles.orderHeader}>
                    <div>
                      <span style={styles.orderLabel}>
                        ĐƠN HÀNG
                      </span>

                      <strong
                        style={styles.orderId}
                      >
                        #{order.id}
                      </strong>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        color: status.color,
                        borderColor:
                          status.color,
                      }}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div style={styles.product}>
                    <span>SẢN PHẨM</span>

                    <strong>
                      {order.products?.name ||
                        "Sản phẩm"}
                    </strong>
                  </div>

                  <div style={styles.details}>
                    <div>
                      <span>SỐ TIỀN</span>

                      <strong>
                        {formatMoney(
                          order.amount
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>THỜI HẠN</span>

                      <strong>
                        {order.products
                          ?.duration_days
                          ? `${order.products.duration_days} ngày`
                          : "-"}
                      </strong>
                    </div>

                    <div>
                      <span>NGÀY ĐẶT</span>

                      <strong>
                        {formatDate(
                          order.created_at
                        )}
                      </strong>
                    </div>
                  </div>

                  {order.key ? (
                    <div style={styles.keySection}>
                      <div style={styles.keyTitle}>
                        🔑 KEY CỦA BẠN
                      </div>

                      <div style={styles.keyBox}>
                        <code
                          style={styles.keyCode}
                        >
                          {order.key.key_code}
                        </code>

                        <button
                          style={styles.copyButton}
                          onClick={() =>
                            copyKey(
                              order.key,
                              order.id
                            )
                          }
                        >
                          {copiedId === order.id
                            ? "✓ ĐÃ COPY"
                            : "COPY"}
                        </button>
                      </div>

                      <div style={styles.expire}>
                        Hết hạn:{" "}
                        {formatDate(
                          order.key.expires_at
                        )}
                      </div>
                    </div>
                  ) : order.status === "paid" ? (
                    <div style={styles.waiting}>
                      ✓ Đơn đã thanh toán.
                      <br />
                      KEY đang chờ hệ thống cấp.
                    </div>
                  ) : order.status ===
                    "rejected" ? (
                    <div style={styles.rejected}>
                      Đơn hàng đã bị từ chối.
                    </div>
                  ) : (
                    <div style={styles.pending}>
                      Đang chờ Admin duyệt đơn.
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #260914, #080808 50%, #030303)",
    color: "#fff",
    padding: "30px 16px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ff1744",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  logo: {
    color: "#ff1744",
    fontWeight: "900",
    letterSpacing: "3px",
    fontSize: "13px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "900",
  },

  email: {
    color: "#777",
    marginTop: "8px",
  },

  backButton: {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    padding: "12px 15px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  list: {
    display: "grid",
    gap: "15px",
  },

  order: {
    background: "#0c0c0c",
    border: "1px solid #242424",
    borderRadius: "17px",
    padding: "20px",
  },

  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    paddingBottom: "15px",
    borderBottom: "1px solid #1c1c1c",
  },

  orderLabel: {
    display: "block",
    color: "#777",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "4px",
  },

  orderId: {
    fontSize: "20px",
  },

  status: {
    border: "1px solid",
    borderRadius: "7px",
    padding: "6px 9px",
    fontSize: "9px",
    fontWeight: "900",
  },

  product: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "17px 0",
  },

  details: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
    paddingTop: "15px",
    borderTop: "1px solid #1c1c1c",
  },

  details: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
    paddingTop: "15px",
    borderTop: "1px solid #1c1c1c",
  },

  product: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "17px 0",
  },

  details: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
    paddingTop: "15px",
    borderTop: "1px solid #1c1c1c",
  },

  empty: {
    background: "#0c0c0c",
    border: "1px solid #242424",
    borderRadius: "18px",
    textAlign: "center",
    padding: "60px 20px",
    color: "#777",
  },

  emptyIcon: {
    fontSize: "50px",
  },

  buyButton: {
    marginTop: "15px",
    background: "#ff1744",
    border: "none",
    color: "#fff",
    padding: "13px 22px",
    borderRadius: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  keySection: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid #222",
  },

  keyTitle: {
    fontWeight: "900",
    marginBottom: "10px",
  },

  keyBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#050505",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "10px",
  },

  keyCode: {
    flex: 1,
    color: "#ff1744",
    fontWeight: "900",
    wordBreak: "break-all",
  },

  copyButton: {
    background: "#ff1744",
    border: "none",
    color: "#fff",
    padding: "9px 13px",
    borderRadius: "8px",
    fontWeight: "900",
    cursor: "pointer",
  },

  expire: {
    color: "#777",
    fontSize: "12px",
    marginTop: "9px",
  },

  waiting: {
    marginTop: "18px",
    padding: "13px",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "9px",
    color: "#00c853",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  pending: {
    marginTop: "18px",
    padding: "13px",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "9px",
    color: "#ffc107",
    fontSize: "13px",
  },

  rejected: {
    marginTop: "18px",
    padding: "13px",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "9px",
    color: "#ff1744",
    fontSize: "13px",
  },
};
