"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadMyKeys();
  }, []);

  async function loadMyKeys() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Vui lòng đăng nhập để xem KEY của bạn.");
        setLoading(false);
        return;
      }

      const {
        data: keyData,
        error: keyError,
      } = await supabase
        .from("keys")
        .select(
          "id, key_code, product_id, user_id, order_id, status, created_at, sold_at, expires_at"
        )
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (keyError) {
        console.error("LOAD KEYS ERROR:", keyError);
        setError("Không thể tải danh sách KEY.");
        setLoading(false);
        return;
      }

      if (!keyData || keyData.length === 0) {
        setKeys([]);
        setLoading(false);
        return;
      }

      const productIds = [
        ...new Set(keyData.map((item) => item.product_id)),
      ];

      const {
        data: products,
        error: productError,
      } = await supabase
        .from("products")
        .select("id, name, price, duration_days")
        .in("id", productIds);

      if (productError) {
        console.error("LOAD PRODUCTS ERROR:", productError);
      }

      const productMap = {};

      (products || []).forEach((product) => {
        productMap[product.id] = product;
      });

      const result = keyData.map((item) => ({
        ...item,
        product: productMap[item.product_id] || null,
      }));

      setKeys(result);
    } catch (err) {
      console.error("MY KEYS ERROR:", err);
      setError("Đã xảy ra lỗi khi tải KEY.");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey(keyCode, id) {
    try {
      await navigator.clipboard.writeText(keyCode);

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (err) {
      console.error("COPY ERROR:", err);

      try {
        const textarea = document.createElement("textarea");
        textarea.value = keyCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();

        setCopiedId(id);

        setTimeout(() => {
          setCopiedId(null);
        }, 1500);
      } catch {
        alert("Không thể copy KEY.");
      }
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "—";
    }

    return d.toLocaleString("vi-VN");
  }

  function getStatus(item) {
    if (item.status === "sold") {
      if (item.expires_at) {
        const expired =
          new Date(item.expires_at).getTime() <= Date.now();

        if (expired) {
          return {
            text: "ĐÃ HẾT HẠN",
            className: "expired",
          };
        }
      }

      return {
        text: "ĐANG HOẠT ĐỘNG",
        className: "active",
      };
    }

    if (item.status === "available") {
      return {
        text: "CHƯA BÁN",
        className: "available",
      };
    }

    return {
      text: item.status || "KHÔNG XÁC ĐỊNH",
      className: "other",
    };
  }

  return (
    <main className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>🔑 KEY CỦA TÔI</h1>
            <p>Danh sách KEY bạn đã mua</p>
          </div>

          <button
            className="refresh"
            onClick={loadMyKeys}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
        </div>

        {loading && (
          <div className="box">
            <div className="loading">
              Đang tải KEY...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="box errorBox">
            <div className="error">
              {error}
            </div>

            <button
              className="retry"
              onClick={loadMyKeys}
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && keys.length === 0 && (
          <div className="box empty">
            <div className="emptyIcon">🔑</div>

            <h2>Bạn chưa có KEY nào</h2>

            <p>
              Hãy mua một sản phẩm để KEY của bạn xuất hiện tại đây.
            </p>

            {/* ĐÃ SỬA: /products → /shop */}
            <a href="/shop" className="buyButton">
              🛒 MUA KEY
            </a>
          </div>
        )}

        {!loading && !error && keys.length > 0 && (
          <div className="keys">
            {keys.map((item) => {
              const status = getStatus(item);

              return (
                <div className="keyCard" key={item.id}>
                  <div className="cardTop">
                    <div>
                      <span className="label">
                        SẢN PHẨM
                      </span>

                      <h2>
                        {item.product?.name ||
                          `Sản phẩm #${item.product_id}`}
                      </h2>
                    </div>

                    <span
                      className={`status ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </div>

                  <div className="keyArea">
                    <span className="label">
                      KEY CỦA BẠN
                    </span>

                    <div className="keyRow">
                      <code>{item.key_code}</code>

                      <button
                        className="copyButton"
                        onClick={() =>
                          copyKey(item.key_code, item.id)
                        }
                      >
                        {copiedId === item.id
                          ? "✓ Đã copy"
                          : "📋 Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="infoGrid">
                    <div className="info">
                      <span>💰 Giá mua</span>
                      <strong>
                        {Number(
                          item.product?.price || 0
                        ).toLocaleString("vi-VN")}
                        đ
                      </strong>
                    </div>

                    <div className="info">
                      <span>⏱ Thời hạn</span>
                      <strong>
                        {item.product?.duration_days
                          ? `${item.product.duration_days} ngày`
                          : "—"}
                      </strong>
                    </div>

                    <div className="info">
                      <span>📅 Ngày mua</span>
                      <strong>
                        {formatDate(
                          item.sold_at || item.created_at
                        )}
                      </strong>
                    </div>

                    <div className="info">
                      <span>⌛ Hết hạn</span>
                      <strong>
                        {formatDate(item.expires_at)}
                      </strong>
                    </div>
                  </div>

                  {item.order_id && (
                    <div className="orderId">
                      Mã đơn hàng: #{item.order_id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              #172033 0%,
              #090d16 45%,
              #05070b 100%
            );
          color: #fff;
          padding: 30px 16px 60px;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 25px;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .header p {
          margin: 7px 0 0;
          color: #9da7b8;
          font-size: 14px;
        }

        .refresh {
          border: 1px solid #303b50;
          background: #121927;
          color: #fff;
          border-radius: 10px;
          padding: 11px 15px;
          cursor: pointer;
          font-weight: 700;
        }

        .refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .box {
          background: rgba(14, 20, 32, 0.9);
          border: 1px solid #273247;
          border-radius: 16px;
          padding: 35px 20px;
        }

        .loading {
          text-align: center;
          color: #aeb8c9;
        }

        .errorBox {
          text-align: center;
        }

        .error {
          color: #ff7777;
          margin-bottom: 18px;
        }

        .retry,
        .buyButton {
          display: inline-block;
          border: 0;
          border-radius: 10px;
          padding: 11px 18px;
          background: #fff;
          color: #080b12;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .empty {
          text-align: center;
        }

        .emptyIcon {
          font-size: 50px;
          margin-bottom: 10px;
        }

        .empty h2 {
          margin: 0 0 8px;
        }

        .empty p {
          color: #929daf;
          margin: 0 0 22px;
        }

        .keys {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .keyCard {
          background: rgba(13, 19, 30, 0.95);
          border: 1px solid #273247;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.18);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .label {
          display: block;
          color: #7e899c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }

        .cardTop h2 {
          margin: 0;
          font-size: 20px;
        }

        .status {
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status.active {
          background: rgba(34, 197, 94, 0.13);
          color: #5ee58a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .status.expired {
          background: rgba(239, 68, 68, 0.13);
          color: #ff7777;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .status.available {
          background: rgba(59, 130, 246, 0.13);
          color: #70a9ff;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }

        .status.other {
          background: rgba(148, 163, 184, 0.13);
          color: #aeb8c9;
        }

        .keyArea {
          margin-bottom: 20px;
        }

        .keyRow {
          display: flex;
          gap: 10px;
          align-items: center;
          background: #080c14;
          border: 1px solid #202b3d;
          border-radius: 11px;
          padding: 12px;
        }

        .keyRow code {
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          word-break: break-all;
        }

        .copyButton {
          flex-shrink: 0;
          border: 0;
          border-radius: 8px;
          padding: 9px 12px;
          background: #fff;
          color: #080b12;
          font-weight: 800;
          cursor: pointer;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .info {
          background: #0a0f19;
          border: 1px solid #1e2939;
          border-radius: 10px;
          padding: 12px;
        }

        .info span {
          display: block;
          color: #7e899c;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .info strong {
          font-size: 13px;
          color: #e8edf5;
        }

        .orderId {
          margin-top: 15px;
          padding-top: 13px;
          border-top: 1px solid #202b3d;
          color: #727e92;
          font-size: 12px;
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px 12px 40px;
          }

          .header {
            align-items: flex-start;
          }

          h1 {
            font-size: 22px;
          }

          .refresh {
            padding: 9px 11px;
            font-size: 12px;
          }

          .keyCard {
            padding: 15px;
          }

          .cardTop {
            flex-direction: column;
          }

          .status {
            align-self: flex-start;
          }

          .keyRow {
            flex-direction: column;
            align-items: stretch;
          }

          .copyButton {
            width: 100%;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
