"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentPage() {
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [order, setOrder] = useState(null);
  const [purchasedKey, setPurchasedKey] = useState(null);

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPayment();
  }, []);

  async function loadPayment() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const params = new URLSearchParams(window.location.search);
      const productId = params.get("product");
      const orderId = params.get("id");

      // Lấy ví
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("id,user_id,balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.error("WALLET ERROR:", walletError);
      }

      setWallet(walletData || { balance: 0 });

      // Nếu đã có mã đơn
      if (orderId) {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            user_id,
            product_id,
            amount,
            status,
            created_at,
            updated_at,
            products (
              id,
              name,
              description,
              price,
              duration_days
            )
            `
          )
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();

        if (error || !data) {
          console.error(error);
          setMessage("Không tìm thấy đơn hàng.");
          setLoading(false);
          return;
        }

        setOrder(data);
        setProduct(data.products);
        setLoading(false);
        return;
      }

      // Đi trực tiếp từ Shop
      if (productId) {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,name,description,price,duration_days,active,is_active"
          )
          .eq("id", productId)
          .eq("active", true)
          .eq("is_active", true)
          .single();

        if (error || !data) {
          console.error(error);
          setMessage(
            "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán."
          );
          setLoading(false);
          return;
        }

        setProduct(data);
        setLoading(false);
        return;
      }

      setMessage("Không tìm thấy mã sản phẩm.");
      setLoading(false);
    } catch (error) {
      console.error(error);

      setMessage("Đã xảy ra lỗi khi tải trang mua hàng.");
      setLoading(false);
    }
  }

  async function createOrder() {
    if (!user || !product || buying) return;

    const balance = Number(wallet?.balance || 0);
    const price = Number(product.price || 0);

    if (balance < price) {
      setSuccess(false);
      setMessage(
        `Số dư ví không đủ. Bạn cần ${price.toLocaleString(
          "vi-VN"
        )}đ nhưng ví hiện có ${balance.toLocaleString("vi-VN")}đ.`
      );
      return;
    }

    const confirmedBuy = window.confirm(
      `Xác nhận mua "${product.name}" với giá ${price.toLocaleString(
        "vi-VN"
      )}đ?\n\nSố dư hiện tại: ${balance.toLocaleString(
        "vi-VN"
      )}đ\nSố dư sau khi mua: ${(balance - price).toLocaleString(
        "vi-VN"
      )}đ`
    );

    if (!confirmedBuy) return;

    setBuying(true);
    setMessage("");
    setSuccess(false);
    setPurchasedKey(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/buy-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productId: Number(product.id),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSuccess(false);
        setMessage(
          data?.message || "Mua KEY thất bại."
        );
        setBuying(false);
        return;
      }

      setPurchasedKey(data);

      setOrder({
        id: data.order_id,
        user_id: user.id,
        product_id: data.product_id,
        amount: data.amount,
        status: "completed",
        created_at: new Date().toISOString(),
      });

      setWallet((current) => ({
        ...(current || {}),
        balance:
          Number(current?.balance || 0) -
          Number(data.amount || 0),
      }));

      setSuccess(true);
      setMessage("Mua KEY thành công!");

      window.history.replaceState(
        {},
        "",
        "/payment?id=" + data.order_id
      );
    } catch (error) {
      console.error("BUY KEY ERROR:", error);

      setSuccess(false);
      setMessage(
        "Không thể kết nối đến hệ thống mua KEY."
      );
    } finally {
      setBuying(false);
    }
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleString("vi-VN");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          ĐANG TẢI TRANG MUA HÀNG...
        </div>
      </main>
    );
  }

  const balance = Number(wallet?.balance || 0);
  const price = Number(product?.price || 0);
  const enoughBalance = balance >= price;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <a href="/shop" style={styles.back}>
          ← QUAY LẠI SHOP
        </a>

        <header style={styles.header}>
          <div style={styles.logo}>XENOVA PLAY</div>

          <h1 style={styles.title}>
            MUA ĐƠN HÀNG
          </h1>

          <p style={styles.subtitle}>
            Thanh toán bằng số dư ví
          </p>
        </header>

        {message && (
          <div
            style={{
              ...styles.message,
              color: success ? "#69ff96" : "#ff7777",
              borderColor: success
                ? "#176b35"
                : "#632020",
              background: success
                ? "#0c2113"
                : "#210d0d",
            }}
          >
            {success ? "✅ " : "❌ "}
            {message}
          </div>
        )}

        {/* VÍ */}
        <section style={styles.walletCard}>
          <div>
            <div style={styles.walletLabel}>
              SỐ DƯ VÍ
            </div>

            <div style={styles.walletBalance}>
              {balance.toLocaleString("vi-VN")}₫
            </div>
          </div>

          <a href="/deposit" style={styles.depositButton}>
            + NẠP TIỀN
          </a>
        </section>

        {product && (
          <>
            {/* SẢN PHẨM */}
            <section style={styles.card}>
              <div style={styles.label}>
                XENOVA KEY
              </div>

              <h2 style={styles.productName}>
                {product.name}
              </h2>

              <p style={styles.description}>
                {product.description ||
                  "Key sử dụng cho XENOVA PLAY"}
              </p>

              <div style={styles.price}>
                {price.toLocaleString("vi-VN")}₫
              </div>

              <div style={styles.duration}>
                Thời hạn:{" "}
                <b>
                  {product.duration_days} ngày
                </b>
              </div>
            </section>

            {/* THANH TOÁN */}
            {!purchasedKey && (
              <section style={styles.card}>
                <h2 style={styles.sectionTitle}>
                  🛒 XÁC NHẬN MUA HÀNG
                </h2>

                <div style={styles.summary}>
                  <div style={styles.summaryRow}>
                    <span>Sản phẩm</span>
                    <strong>
                      {product.name}
                    </strong>
                  </div>

                  <div style={styles.summaryRow}>
                    <span>Giá</span>
                    <strong style={styles.red}>
                      {price.toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </strong>
                  </div>

                  <div style={styles.summaryRow}>
                    <span>Số dư hiện tại</span>
                    <strong>
                      {balance.toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </strong>
                  </div>

                  <div style={styles.summaryRow}>
                    <span>Số dư sau khi mua</span>

                    <strong
                      style={{
                        color: enoughBalance
                          ? "#69ff96"
                          : "#ff5555",
                      }}
                    >
                      {Math.max(
                        0,
                        balance - price
                      ).toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </strong>
                  </div>
                </div>

                {!enoughBalance && (
                  <div style={styles.warning}>
                    ⚠️ Số dư ví không đủ để mua
                    sản phẩm này.
                    <br />
                    Vui lòng nạp thêm tiền vào ví.
                  </div>
                )}

                <button
                  onClick={createOrder}
                  disabled={
                    buying || !enoughBalance
                  }
                  style={{
                    ...styles.button,
                    opacity:
                      buying || !enoughBalance
                        ? 0.5
                        : 1,
                  }}
                >
                  {buying
                    ? "ĐANG XỬ LÝ..."
                    : enoughBalance
                    ? "💳 MUA NGAY BẰNG SỐ DƯ VÍ"
                    : "KHÔNG ĐỦ SỐ DƯ"}
                </button>
              </section>
            )}

            {/* KEY ĐÃ MUA */}
            {purchasedKey && (
              <section style={styles.successCard}>
                <div style={styles.successIcon}>
                  ✓
                </div>

                <h2 style={styles.successTitle}>
                  MUA KEY THÀNH CÔNG
                </h2>

                <p style={styles.successText}>
                  Tiền đã được trừ trực tiếp
                  từ số dư ví.
                </p>

                <div style={styles.keyBox}>
                  <div style={styles.keyLabel}>
                    KEY CỦA BẠN
                  </div>

                  <div style={styles.keyCode}>
                    {purchasedKey.key_code}
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={styles.infoRow}>
                    <span>MÃ ĐƠN</span>
                    <strong>
                      #{purchasedKey.order_id}
                    </strong>
                  </div>

                  <div style={styles.infoRow}>
                    <span>ĐÃ THANH TOÁN</span>
                    <strong>
                      {Number(
                        purchasedKey.amount || 0
                      ).toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </strong>
                  </div>

                  <div style={styles.infoRow}>
                    <span>THỜI HẠN</span>
                    <strong>
                      {purchasedKey.duration_days}{" "}
                      ngày
                    </strong>
                  </div>

                  <div style={styles.infoRow}>
                    <span>HẾT HẠN</span>
                    <strong>
                      {formatDate(
                        purchasedKey.expires_at
                      )}
                    </strong>
                  </div>
                </div>

                <a
                  href="/keys"
                  style={styles.keysButton}
                >
                  🔑 XEM KEY CỦA TÔI
                </a>
              </section>
            )}

            {/* ĐƠN ĐÃ HOÀN THÀNH */}
            {order &&
              !purchasedKey &&
              order.status === "completed" && (
                <section style={styles.card}>
                  <div style={styles.orderBox}>
                    <span>MÃ ĐƠN HÀNG</span>
                    <strong>
                      #{order.id}
                    </strong>
                  </div>

                  <div style={styles.statusSuccess}>
                    ✓ ĐƠN HÀNG ĐÃ HOÀN THÀNH
                  </div>

                  <div style={styles.created}>
                    Tạo đơn:{" "}
                    {formatDate(
                      order.created_at
                    )}
                  </div>
                </section>
              )}
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #25060d, #080808 45%, #030303)",
    color: "#fff",
    padding: "25px 15px 60px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "650px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ff1744",
    fontWeight: "900",
  },

  back: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "700",
  },

  header: {
    marginTop: "30px",
    marginBottom: "20px",
  },

  logo: {
    color: "#ff1744",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  title: {
    margin: "7px 0",
    fontSize: "38px",
    fontWeight: "900",
  },

  subtitle: {
    color: "#777",
    margin: 0,
  },

  message: {
    marginBottom: "15px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid",
    lineHeight: 1.5,
  },

  walletCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginTop: "15px",
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid #3a161d",
    background:
      "linear-gradient(135deg, #16090c, #0e0e0e)",
  },

  walletLabel: {
    color: "#888",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  walletBalance: {
    marginTop: "7px",
    color: "#69ff96",
    fontSize: "28px",
    fontWeight: "900",
  },

  depositButton: {
    padding: "12px 15px",
    borderRadius: "10px",
    background: "#211014",
    border: "1px solid #54202b",
    color: "#ff1744",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  card: {
    marginTop: "15px",
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid #292929",
    background: "#101010",
  },

  label: {
    color: "#ff1744",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  productName: {
    margin: "10px 0 8px",
    fontSize: "25px",
    fontWeight: "900",
  },

  description: {
    color: "#888",
    lineHeight: 1.6,
    margin: 0,
  },

  price: {
    marginTop: "18px",
    color: "#ff1744",
    fontSize: "32px",
    fontWeight: "900",
  },

  duration: {
    marginTop: "8px",
    color: "#777",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: "20px",
    fontWeight: "900",
  },

  summary: {
    border: "1px solid #292929",
    borderRadius: "12px",
    overflow: "hidden",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "14px",
    borderBottom: "1px solid #222",
    color: "#888",
    fontSize: "13px",
  },

  red: {
    color: "#ff1744",
  },

  warning: {
    marginTop: "15px",
    padding: "14px",
    borderRadius: "10px",
    background: "#241b08",
    border: "1px solid #554014",
    color: "#ffc857",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  button: {
    width: "100%",
    marginTop: "18px",
    padding: "16px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },

  successCard: {
    marginTop: "15px",
    padding: "25px 22px",
    borderRadius: "18px",
    border: "1px solid #176b35",
    background:
      "linear-gradient(145deg, #0d2113, #101010)",
    textAlign: "center",
  },

  successIcon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 12px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#164d29",
    color: "#69ff96",
    fontSize: "32px",
    fontWeight: "900",
  },

  successTitle: {
    margin: 0,
    color: "#69ff96",
    fontSize: "23px",
    fontWeight: "900",
  },

  successText: {
    color: "#888",
    fontSize: "13px",
  },

  keyBox: {
    marginTop: "20px",
    padding: "18px",
    borderRadius: "12px",
    background: "#080808",
    border: "1px solid #292929",
  },

  keyLabel: {
    color: "#777",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "2px",
  },

  keyCode: {
    marginTop: "10px",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "900",
    wordBreak: "break-all",
    letterSpacing: "1px",
  },

  infoBox: {
    marginTop: "15px",
    border: "1px solid #292929",
    borderRadius: "12px",
    overflow: "hidden",
    textAlign: "left",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "13px",
    borderBottom: "1px solid #222",
    color: "#777",
    fontSize: "12px",
  },

  keysButton: {
    display: "block",
    marginTop: "18px",
    padding: "15px",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #ff1744, #d50032)",
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "900",
  },

  orderBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "13px 15px",
    marginBottom: "15px",
    borderRadius: "10px",
    background: "#181818",
    border: "1px solid #292929",
  },

  statusSuccess: {
    padding: "15px",
    borderRadius: "10px",
    background: "#0c2113",
    border: "1px solid #176b35",
    color: "#69ff96",
    textAlign: "center",
    fontWeight: "900",
  },

  created: {
    marginTop: "15px",
    color: "#555",
    fontSize: "12px",
    textAlign: "center",
  },
};
