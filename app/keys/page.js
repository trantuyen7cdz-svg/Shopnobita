"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function KeysPage() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setError("Bạn cần đăng nhập để xem KEY.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data: keyData, error: keyError } = await supabase
        .from("keys")
        .select(
          `
          id,
          key_code,
          product_id,
          user_id,
          expires_at,
          status,
          created_at,
          order_id,
          sold_at
        `
        )
        .eq("user_id", currentUser.id)
        .order("id", { ascending: false });

      if (keyError) {
        console.error("LOAD KEYS ERROR:", keyError);
        setError("Không thể tải danh sách KEY.");
        setLoading(false);
        return;
      }

      const userKeys = keyData || [];
      setKeys(userKeys);

      const productIds = [
        ...new Set(
          userKeys
            .map((item) => item.product_id)
            .filter((id) => id !== null && id !== undefined)
        ),
      ];

      if (productIds.length > 0) {
        const { data: productData, error: productError } =
          await supabase
            .from("products")
            .select("id,name,description,price,duration_days")
            .in("id", productIds);

        if (!productError && productData) {
          const productMap = {};

          for (const product of productData) {
            productMap[product.id] = product;
          }

          setProducts(productMap);
        }
      }
    } catch (err) {
      console.error("KEY PAGE ERROR:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
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
      }, 1800);
    } catch (error) {
      console.error("COPY KEY ERROR:", error);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "—";
    }

    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(date) {
    if (!date) return false;

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return false;
    }

    return d.getTime() < Date.now();
  }

  function getStatus(key) {
    if (key.status === "sold" && isExpired(key.expires_at)) {
      return {
        text: "Đã hết hạn",
        className: "expired",
      };
    }

    if (key.status === "sold") {
      return {
        text: "Đang hoạt động",
        className: "active",
      };
    }

    return {
      text: key.status || "Không xác định",
      className: "other",
    };
  }

  if (loading) {
    return (
      <>
        <Header />

        <main className="page">
          <div className="loadingBox">
            <div className="spinner"></div>
            <p>Đang tải KEY...</p>
          </div>
        </main>

        <style jsx>{styles}</style>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />

        <main className="page">
          <section className="emptyBox">
            <div className="bigIcon">🔐</div>

            <h1>KEY CỦA TÔI</h1>

            <p>
              Bạn cần đăng nhập để xem những KEY đã mua.
            </p>

            <Link href="/login" className="mainButton">
              ĐĂNG NHẬP
            </Link>
          </section>
        </main>

        <style jsx>{styles}</style>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="page">
        <div className="container">
          <div className="breadcrumb">
            Trang chủ <span>›</span> KEY của tôi
          </div>

          <div className="pageHeading">
            <div>
              <div className="pinkLabel">XENOVA PLAY</div>

              <h1>🔑 KEY CỦA TÔI</h1>

              <p>
                Quản lý và sao chép những KEY bạn đã mua.
              </p>
            </div>

            <Link href="/shop" className="shopButton">
              🛒 MUA KEY
            </Link>
          </div>

          {error && <div className="errorBox">{error}</div>}

          {!error && keys.length === 0 && (
            <section className="emptyBox">
              <div className="emptyIcon">🔑</div>

              <h2>Bạn chưa có KEY nào</h2>

              <p>
                Sau khi mua KEY thành công, KEY sẽ xuất hiện
                tại đây.
              </p>

              <Link href="/shop" className="mainButton">
                🛒 ĐẾN CỬA HÀNG
              </Link>
            </section>
          )}

          {keys.length > 0 && (
            <div className="keyList">
              {keys.map((key) => {
                const product = products[key.product_id];
                const status = getStatus(key);

                return (
                  <section className="keyCard" key={key.id}>
                    <div className="cardTop">
                      <div className="productInfo">
                        <div className="productIcon">
                          🔑
                        </div>

                        <div>
                          <div className="productName">
                            {product?.name || "Sản phẩm"}
                          </div>

                          <div className="orderText">
                            Đơn hàng #
                            {key.order_id || "—"}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`status ${status.className}`}
                      >
                        <i></i>
                        {status.text}
                      </span>
                    </div>

                    <div className="keyArea">
                      <div className="label">
                        KEY CỦA BẠN
                      </div>

                      <div className="keyRow">
                        <div className="keyCode">
                          {key.key_code}
                        </div>

                        <button
                          type="button"
                          className={`copyButton ${
                            copiedId === key.id
                              ? "copied"
                              : ""
                          }`}
                          onClick={() =>
                            copyKey(
                              key.key_code,
                              key.id
                            )
                          }
                        >
                          {copiedId === key.id
                            ? "✓ Đã copy"
                            : "📋 Copy KEY"}
                        </button>
                      </div>
                    </div>

                    <div className="infoGrid">
                      <div className="infoItem">
                        <span>GIÁ</span>

                        <strong>
                          {product?.price
                            ? Number(
                                product.price
                              ).toLocaleString(
                                "vi-VN"
                              ) + "đ"
                            : "—"}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>THỜI HẠN</span>

                        <strong>
                          {product?.duration_days
                            ? `${product.duration_days} ngày`
                            : "—"}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>NGÀY MUA</span>

                        <strong>
                          {formatDate(
                            key.sold_at ||
                              key.created_at
                          )}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>HẾT HẠN</span>

                        <strong
                          className={
                            status.className ===
                            "expired"
                              ? "redText"
                              : ""
                          }
                        >
                          {formatDate(
                            key.expires_at
                          )}
                        </strong>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="bottomActions">
            <Link href="/dashboard">
              ← Về Dashboard
            </Link>

            <Link href="/orders">
              Xem đơn hàng →
            </Link>
          </div>
        </div>
      </main>

      <MobileNav />

      <style jsx>{styles}</style>
    </>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="headerInner">
        <Link href="/" className="logo">
          <div className="logoMark">X</div>

          <div>
            <div className="logoName">
              XENOVA <span>PLAY</span>
            </div>

            <div className="logoSub">
              PREMIUM STORE
            </div>
          </div>
        </Link>

        <nav className="nav">
          <Link href="/">Trang chủ</Link>
          <Link href="/shop">Cửa hàng</Link>
          <Link href="/deposit">Nạp tiền</Link>
          <Link
            href="/keys"
            className="active"
          >
            KEY của tôi
          </Link>
          <Link href="/orders">Đơn hàng</Link>
          <Link href="/dashboard">Tài khoản</Link>
          <Link href="/settings">Cài đặt</Link>
        </nav>

        <Link href="/deposit" className="wallet">
          <span>💰</span>
          <span>Nạp tiền</span>
        </Link>
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="mobileNav">
      <Link href="/">
        <span>⌂</span>
        Trang chủ
      </Link>

      <Link href="/shop">
        <span>🛒</span>
        Shop
      </Link>

      <Link href="/keys" className="active">
        <span>🔑</span>
        KEY
      </Link>

      <Link href="/orders">
        <span>📦</span>
        Đơn hàng
      </Link>

      <Link href="/dashboard">
        <span>👤</span>
        Tài khoản
      </Link>
    </nav>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    height: 72px;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid #f0e7eb;
    backdrop-filter: blur(14px);
  }

  .headerInner {
    width: 100%;
    max-width: 1240px;
    height: 100%;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #222;
    text-decoration: none;
    flex-shrink: 0;
  }

  .logoMark {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 19px;
    font-weight: 1000;
    background: linear-gradient(
      135deg,
      #ff76a9,
      #ff3f83
    );
    box-shadow: 0 7px 20px rgba(255, 70, 130, 0.22);
  }

  .logoName {
    font-size: 16px;
    line-height: 16px;
    font-weight: 1000;
    letter-spacing: -0.4px;
  }

  .logoName span {
    color: #ff4c8a;
  }

  .logoSub {
    margin-top: 3px;
    color: #aaa;
    font-size: 7px;
    letter-spacing: 1.4px;
    font-weight: 800;
  }

  .nav {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .nav a {
    position: relative;
    padding: 10px 11px;
    border-radius: 10px;
    color: #777;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .nav a:hover {
    color: #ff4c8a;
    background: #fff3f7;
  }

  .nav a.active {
    color: #ff4284;
    background: #fff0f5;
  }

  .wallet {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 13px;
    border-radius: 12px;
    background: #fff1f6;
    border: 1px solid #ffd8e6;
    color: #ff4385;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
  }

  .page {
    min-height: calc(100vh - 72px);
    padding: 26px 18px 90px;
    background:
      radial-gradient(
        circle at 15% 0%,
        rgba(255, 121, 168, 0.12),
        transparent 30%
      ),
      radial-gradient(
        circle at 90% 15%,
        rgba(255, 190, 214, 0.15),
        transparent 28%
      ),
      #fff;
    color: #29252a;
  }

  .container {
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;
  }

  .breadcrumb {
    color: #aaa;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 22px;
  }

  .breadcrumb span {
    margin: 0 8px;
    color: #ff8eb5;
  }

  .pageHeading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }

  .pinkLabel {
    margin-bottom: 7px;
    color: #ff4b89;
    font-size: 11px;
    font-weight: 1000;
    letter-spacing: 2px;
  }

  h1 {
    margin: 0;
    color: #29252a;
    font-size: 29px;
    line-height: 1.15;
    font-weight: 1000;
    letter-spacing: -0.7px;
  }

  .pageHeading p {
    margin: 8px 0 0;
    color: #999399;
    font-size: 13px;
  }

  .shopButton {
    flex-shrink: 0;
    padding: 13px 19px;
    border-radius: 13px;
    background: linear-gradient(
      135deg,
      #ff72a6,
      #ff3e82
    );
    color: #fff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 1000;
    box-shadow: 0 9px 25px rgba(255, 65, 130, 0.2);
  }

  .shopButton:hover {
    transform: translateY(-1px);
  }

  .errorBox {
    margin-bottom: 18px;
    padding: 14px 16px;
    border-radius: 13px;
    background: #fff2f3;
    border: 1px solid #ffd6da;
    color: #e15d69;
    font-size: 13px;
    font-weight: 700;
  }

  .keyList {
    display: grid;
    gap: 16px;
  }

  .keyCard {
    padding: 19px;
    border: 1px solid #f0e4e9;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.95);
    box-shadow:
      0 10px 30px rgba(54, 25, 38, 0.06),
      0 2px 7px rgba(54, 25, 38, 0.025);
  }

  .cardTop {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .productInfo {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .productIcon {
    width: 39px;
    height: 39px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #fff0f5;
    border: 1px solid #ffd9e7;
    font-size: 18px;
  }

  .productName {
    color: #302a2e;
    font-size: 16px;
    font-weight: 1000;
  }

  .orderText {
    margin-top: 4px;
    color: #aaa1a6;
    font-size: 11px;
  }

  .status {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 900;
  }

  .status i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: block;
  }

  .status.active {
    color: #20a56d;
    background: #edfff7;
    border: 1px solid #d1f5e5;
  }

  .status.active i {
    background: #28c985;
  }

  .status.expired {
    color: #df5a67;
    background: #fff1f2;
    border: 1px solid #ffd9dc;
  }

  .status.expired i {
    background: #f16b76;
  }

  .status.other {
    color: #8c858a;
    background: #f7f5f6;
    border: 1px solid #ebe7e9;
  }

  .status.other i {
    background: #aaa3a7;
  }

  .keyArea {
    padding: 14px;
    border-radius: 14px;
    background: #fff8fa;
    border: 1px solid #f8e5ec;
    margin-bottom: 13px;
  }

  .label {
    margin-bottom: 8px;
    color: #b39ca5;
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: 1.4px;
  }

  .keyRow {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .keyCode {
    flex: 1;
    min-width: 0;
    padding: 10px 11px;
    overflow-x: auto;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #f0dfe6;
    color: #3c3539;
    font-family: monospace;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
  }

  .copyButton {
    flex-shrink: 0;
    border: 0;
    border-radius: 10px;
    padding: 11px 14px;
    background: linear-gradient(
      135deg,
      #ff70a5,
      #ff4083
    );
    color: white;
    cursor: pointer;
    font-size: 11px;
    font-weight: 1000;
    box-shadow: 0 6px 15px rgba(255, 65, 130, 0.15);
  }

  .copyButton.copied {
    background: #27b979;
  }

  .infoGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
  }

  .infoItem {
    min-width: 0;
    padding: 12px;
    border-radius: 12px;
    background: #faf8f9;
    border: 1px solid #f1eaed;
  }

  .infoItem span {
    display: block;
    margin-bottom: 5px;
    color: #aaa1a6;
    font-size: 9px;
    font-weight: 800;
  }

  .infoItem strong {
    display: block;
    overflow: hidden;
    color: #40393d;
    font-size: 12px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .redText {
    color: #e75b68 !important;
  }

  .emptyBox,
  .loadingBox {
    max-width: 560px;
    margin: 65px auto 0;
    padding: 38px 25px;
    text-align: center;
    border: 1px solid #f0e3e8;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 14px 40px rgba(54, 25, 38, 0.06);
  }

  .bigIcon,
  .emptyIcon {
    width: 65px;
    height: 65px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: #fff0f5;
    border: 1px solid #ffdce9;
    font-size: 29px;
  }

  .emptyBox h1,
  .emptyBox h2 {
    margin: 0;
    color: #322c30;
    font-weight: 1000;
  }

  .emptyBox p {
    max-width: 430px;
    margin: 11px auto 22px;
    color: #999096;
    font-size: 13px;
    line-height: 1.7;
  }

  .mainButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 19px;
    border-radius: 12px;
    background: linear-gradient(
      135deg,
      #ff72a6,
      #ff3f82
    );
    color: #fff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 1000;
    box-shadow: 0 8px 22px rgba(255, 64, 130, 0.18);
  }

  .loadingBox p {
    margin: 0;
    color: #9d969a;
    font-size: 13px;
  }

  .spinner {
    width: 34px;
    height: 34px;
    margin: 0 auto 14px;
    border-radius: 50%;
    border: 3px solid #ffe3ed;
    border-top-color: #ff4c89;
    animation: spin 0.8s linear infinite;
  }

  .bottomActions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 20px;
  }

  .bottomActions a {
    color: #e85a91;
    text-decoration: none;
    font-size: 12px;
    font-weight: 800;
  }

  .mobileNav {
    display: none;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1000px) {
    .nav {
      gap: 0;
    }

    .nav a {
      padding: 9px 7px;
      font-size: 11px;
    }

    .headerInner {
      gap: 15px;
    }

    .infoGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 760px) {
    .header {
      height: 64px;
    }

    .headerInner {
      padding: 0 14px;
    }

    .nav {
      display: none;
    }

    .wallet {
      margin-left: auto;
    }

    .logoSub {
      display: none;
    }

    .page {
      min-height: calc(100vh - 64px);
      padding: 20px 12px 85px;
    }

    .pageHeading {
      align-items: stretch;
      flex-direction: column;
    }

    .shopButton {
      width: 100%;
      text-align: center;
    }

    .keyCard {
      padding: 15px;
    }

    .mobileNav {
      position: fixed;
      left: 10px;
      right: 10px;
      bottom: 10px;
      z-index: 200;
      height: 63px;
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      border: 1px solid #f0dfe6;
      border-radius: 17px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 10px 35px rgba(50, 20, 35, 0.13);
      backdrop-filter: blur(15px);
    }

    .mobileNav a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: #aaa2a7;
      text-decoration: none;
      font-size: 9px;
      font-weight: 800;
    }

    .mobileNav a span {
      font-size: 17px;
      line-height: 18px;
    }

    .mobileNav a.active {
      color: #ff4786;
    }
  }

  @media (max-width: 520px) {
    .logoName {
      font-size: 14px;
    }

    .logoMark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }

    .wallet {
      padding: 9px 10px;
      font-size: 10px;
    }

    h1 {
      font-size: 24px;
    }

    .productName {
      font-size: 15px;
    }

    .cardTop {
      align-items: flex-start;
    }

    .status {
      padding: 6px 8px;
      font-size: 9px;
    }

    .keyRow {
      flex-direction: column;
      align-items: stretch;
    }

    .copyButton {
      width: 100%;
    }

    .infoGrid {
      grid-template-columns: 1fr 1fr;
    }

    .infoItem {
      padding: 10px;
    }

    .infoItem strong {
      font-size: 11px;
    }

    .bottomActions {
      flex-direction: column;
      align-items: stretch;
    }

    .bottomActions a {
      padding: 10px 12px;
      text-align: center;
      border-radius: 10px;
      background: #fff4f7;
    }
  }

  @media (max-width: 370px) {
    .infoGrid {
      grid-template-columns: 1fr;
    }

    .wallet span:last-child {
      display: none;
    }
  }
`;
