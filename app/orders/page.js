"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Vui lòng đăng nhập để xem đơn hàng.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          user_id,
          product_id,
          amount,
          status,
          created_at,
          updated_at,
          transaction_id,
          products (
            id,
            name,
            price,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (error) {
        console.error("ORDERS ERROR:", error);
        setMessage("Không thể tải lịch sử đơn hàng.");
        setLoading(false);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error(error);
      setMessage("Đã xảy ra lỗi.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function getStatus(status) {
    switch (status) {
      case "completed":
        return {
          text: "ĐÃ HOÀN TẤT",
          className: "completed",
        };

      case "pending":
      case "waiting":
        return {
          text: "ĐANG XỬ LÝ",
          className: "pending",
        };

      case "failed":
      case "rejected":
        return {
          text: "ĐÃ HỦY",
          className: "failed",
        };

      default:
        return {
          text: status || "KHÔNG RÕ",
          className: "unknown",
        };
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main className="page">
          <div className="loadingBox">
            <div className="spinner"></div>
            <p>Đang tải đơn hàng...</p>
          </div>
        </main>

        <style jsx>{styles}</style>
      </>
    );
  }

  if (message) {
    return (
      <>
        <Header />

        <main className="page">
          <div className="container">
            <div className="errorBox">
              <div className="errorIcon">!</div>
              <h2>{message}</h2>

              <Link href="/login" className="mainButton">
                ĐĂNG NHẬP
              </Link>
            </div>
          </div>
        </main>

        <MobileNav />

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
            Trang chủ <span>›</span> Đơn hàng
          </div>

          <div className="pageHeading">
            <div>
              <div className="pinkLabel">
                XENOVA PLAY
              </div>

              <h1>📦 ĐƠN HÀNG CỦA TÔI</h1>

              <p>
                Xem lại toàn bộ lịch sử mua KEY của bạn.
              </p>
            </div>

            <Link href="/shop" className="shopButton">
              🛒 CỬA HÀNG
            </Link>
          </div>

          {orders.length === 0 && (
            <section className="emptyBox">
              <div className="emptyIcon">📦</div>

              <h2>Chưa có đơn hàng</h2>

              <p>
                Bạn chưa mua KEY nào. Hãy đến cửa hàng
                để lựa chọn sản phẩm.
              </p>

              <Link
                href="/shop"
                className="mainButton"
              >
                🛒 ĐI ĐẾN CỬA HÀNG
              </Link>
            </section>
          )}

          {orders.length > 0 && (
            <>
              <div className="summary">
                <div className="summaryIcon">
                  📦
                </div>

                <div>
                  <strong>
                    {orders.length} đơn hàng
                  </strong>

                  <span>
                    Lịch sử giao dịch của tài khoản
                  </span>
                </div>
              </div>

              <div className="orderList">
                {orders.map((order) => {
                  const status = getStatus(order.status);

                  return (
                    <section
                      key={order.id}
                      className="orderCard"
                    >
                      <div className="cardHeader">
                        <div className="orderIdentity">
                          <div className="orderIcon">
                            #
                          </div>

                          <div>
                            <div className="orderLabel">
                              MÃ ĐƠN
                            </div>

                            <div className="orderId">
                              #{order.id}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`status ${status.className}`}
                        >
                          <i></i>
                          {status.text}
                        </div>
                      </div>

                      <div className="divider"></div>

                      <div className="productRow">
                        <div className="productIcon">
                          🔑
                        </div>

                        <div className="productDetails">
                          <div className="productName">
                            {order.products?.name ||
                              `Sản phẩm #${order.product_id}`}
                          </div>

                          <div className="productInfo">
                            {order.products
                              ?.duration_days
                              ? `Thời hạn ${order.products.duration_days} ngày`
                              : "KEY"}
                          </div>
                        </div>

                        <div className="amount">
                          {formatMoney(order.amount)}
                        </div>
                      </div>

                      <div className="infoGrid">
                        <div className="infoItem">
                          <span>NGÀY MUA</span>

                          <strong>
                            {formatDate(
                              order.created_at
                            )}
                          </strong>
                        </div>

                        <div className="infoItem">
                          <span>CẬP NHẬT</span>

                          <strong>
                            {formatDate(
                              order.updated_at
                            )}
                          </strong>
                        </div>

                        <div className="infoItem">
                          <span>GIÁ SẢN PHẨM</span>

                          <strong>
                            {formatMoney(
                              order.products?.price ||
                                order.amount
                            )}
                          </strong>
                        </div>

                        <div className="infoItem">
                          <span>GIAO DỊCH</span>

                          <strong
                            className={
                              order.transaction_id
                                ? "greenText"
                                : ""
                            }
                          >
                            {order.transaction_id
                              ? "Đã tạo"
                              : "—"}
                          </strong>
                        </div>
                      </div>

                      <div className="footer">
                        <div className="footerMessage">
                          <span className="footerDot">
                            {order.status ===
                            "completed"
                              ? "✓"
                              : "!"}
                          </span>

                          <span>
                            {order.status ===
                            "completed"
                              ? "KEY đã được cấp vào tài khoản."
                              : "Đơn hàng chưa hoàn tất."}
                          </span>
                        </div>

                        {order.status ===
                          "completed" && (
                          <Link
                            href="/keys"
                            className="keyButton"
                          >
                            🔑 XEM KEY
                          </Link>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}

          <div className="bottomActions">
            <Link href="/dashboard">
              ← Tài khoản
            </Link>

            <Link href="/keys">
              🔑 KEY của tôi
            </Link>

            <Link href="/deposit">
              💰 Nạp tiền
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
          <Link href="/keys">KEY của tôi</Link>
          <Link
            href="/orders"
            className="active"
          >
            Đơn hàng
          </Link>
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

      <Link href="/keys">
        <span>🔑</span>
        KEY
      </Link>

      <Link
        href="/orders"
        className="active"
      >
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
    background: rgba(255,255,255,.97);
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
    color: #fff;
    font-size: 19px;
    font-weight: 1000;
    background: linear-gradient(135deg,#ff76a9,#ff3f83);
    box-shadow: 0 7px 20px rgba(255,70,130,.22);
  }

  .logoName {
    font-size: 16px;
    line-height: 16px;
    font-weight: 1000;
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
      radial-gradient(circle at 15% 0%,
        rgba(255,121,168,.12),
        transparent 30%),
      radial-gradient(circle at 90% 15%,
        rgba(255,190,214,.15),
        transparent 28%),
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
    margin-bottom: 22px;
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
    letter-spacing: -.7px;
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
    background: linear-gradient(135deg,#ff72a6,#ff3e82);
    color: #fff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 1000;
    box-shadow: 0 9px 25px rgba(255,65,130,.2);
  }

  .summary {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
    padding: 13px 15px;
    border: 1px solid #f0e3e8;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 6px 20px rgba(54,25,38,.04);
  }

  .summaryIcon {
    width: 37px;
    height: 37px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #fff0f5;
    border: 1px solid #ffdce9;
  }

  .summary strong,
  .summary span {
    display: block;
  }

  .summary strong {
    color: #40383d;
    font-size: 13px;
    font-weight: 900;
  }

  .summary span {
    margin-top: 2px;
    color: #aaa0a5;
    font-size: 10px;
  }

  .orderList {
    display: grid;
    gap: 15px;
  }

  .orderCard {
    padding: 19px;
    border: 1px solid #f0e4e9;
    border-radius: 18px;
    background: #fff;
    box-shadow:
      0 10px 30px rgba(54,25,38,.06),
      0 2px 7px rgba(54,25,38,.025);
  }

  .cardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .orderIdentity {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .orderIcon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #fff0f5;
    border: 1px solid #ffdce9;
    color: #ff4b88;
    font-weight: 1000;
  }

  .orderLabel {
    color: #aaa1a6;
    font-size: 9px;
    font-weight: 900;
  }

  .orderId {
    margin-top: 3px;
    color: #302a2e;
    font-size: 17px;
    font-weight: 1000;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 1000;
  }

  .status i {
    width: 6px;
    height: 6px;
    display: block;
    border-radius: 50%;
  }

  .status.completed {
    color: #1b9c66;
    background: #edfff7;
    border: 1px solid #d2f4e4;
  }

  .status.completed i {
    background: #26c985;
  }

  .status.pending {
    color: #bd8b20;
    background: #fff9e9;
    border: 1px solid #f7e9b8;
  }

  .status.pending i {
    background: #e9b93d;
  }

  .status.failed {
    color: #d75a66;
    background: #fff1f2;
    border: 1px solid #ffd8dc;
  }

  .status.failed i {
    background: #ed6873;
  }

  .status.unknown {
    color: #888087;
    background: #f7f5f6;
    border: 1px solid #ebe7e9;
  }

  .status.unknown i {
    background: #aaa3a7;
  }

  .divider {
    height: 1px;
    margin: 16px 0;
    background: #f1e9ed;
  }

  .productRow {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .productIcon {
    width: 45px;
    height: 45px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #fff4f7;
    border: 1px solid #f9dfe8;
    font-size: 20px;
  }

  .productDetails {
    flex: 1;
    min-width: 0;
  }

  .productName {
    color: #342e32;
    font-size: 15px;
    font-weight: 900;
  }

  .productInfo {
    margin-top: 4px;
    color: #aaa0a6;
    font-size: 11px;
  }

  .amount {
    color: #ff4385;
    font-size: 16px;
    font-weight: 1000;
    white-space: nowrap;
  }

  .infoGrid {
    display: grid;
    grid-template-columns: repeat(4,1fr);
    gap: 9px;
    margin-top: 16px;
  }

  .infoItem {
    min-width: 0;
    padding: 11px;
    border-radius: 11px;
    background: #faf8f9;
    border: 1px solid #f1eaed;
  }

  .infoItem span {
    display: block;
    margin-bottom: 5px;
    color: #aaa1a6;
    font-size: 8px;
    font-weight: 900;
  }

  .infoItem strong {
    display: block;
    overflow: hidden;
    color: #40393d;
    font-size: 11px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .greenText {
    color: #1eae70 !important;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #f1e9ed;
  }

  .footerMessage {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #999197;
    font-size: 11px;
  }

  .footerDot {
    width: 19px;
    height: 19px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fff0f5;
    color: #ff4a88;
    font-size: 10px;
    font-weight: 1000;
  }

  .keyButton {
    padding: 9px 13px;
    border-radius: 9px;
    background: linear-gradient(135deg,#ff72a6,#ff4083);
    color: #fff;
    text-decoration: none;
    font-size: 10px;
    font-weight: 1000;
    box-shadow: 0 5px 14px rgba(255,65,130,.14);
  }

  .emptyBox,
  .loadingBox,
  .errorBox {
    max-width: 570px;
    margin: 55px auto 0;
    padding: 38px 24px;
    text-align: center;
    border: 1px solid #f0e3e8;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 14px 40px rgba(54,25,38,.06);
  }

  .emptyIcon {
    width: 65px;
    height: 65px;
    margin: 0 auto 16px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    background: #fff0f5;
    border: 1px solid #ffdce9;
    font-size: 29px;
  }

  .emptyBox h2,
  .errorBox h2 {
    margin: 0;
    color: #322c30;
    font-size: 19px;
    font-weight: 1000;
  }

  .emptyBox p {
    margin: 10px auto 21px;
    color: #999096;
    font-size: 13px;
  }

  .errorIcon {
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fff0f2;
    color: #e45c69;
    font-size: 22px;
    font-weight: 1000;
  }

  .mainButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 19px;
    border-radius: 12px;
    background: linear-gradient(135deg,#ff72a6,#ff3f82);
    color: #fff;
    text-decoration: none;
    font-size: 11px;
    font-weight: 1000;
    box-shadow: 0 8px 22px rgba(255,64,130,.18);
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
    animation: spin .8s linear infinite;
  }

  .bottomActions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 22px;
    margin-top: 24px;
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
      grid-template-columns: repeat(2,1fr);
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
      padding: 20px 12px 90px;
    }

    .pageHeading {
      align-items: stretch;
      flex-direction: column;
    }

    .shopButton {
      width: 100%;
      text-align: center;
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
      background: rgba(255,255,255,.96);
      box-shadow: 0 10px 35px rgba(50,20,35,.13);
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

    .cardHeader {
      align-items: flex-start;
    }

    .orderCard {
      padding: 15px;
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
      font-size: 14px;
    }

    .productRow {
      align-items: flex-start;
    }

    .amount {
      font-size: 14px;
    }

    .infoGrid {
      grid-template-columns: 1fr 1fr;
    }

    .footer {
      align-items: stretch;
      flex-direction: column;
    }

    .keyButton {
      width: 100%;
      text-align: center;
    }

    .bottomActions {
      flex-direction: column;
      align-items: stretch;
      gap: 7px;
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
