"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// =====================================================
// THÔNG TIN THANH TOÁN XENOVA
// =====================================================

const BANK_NAME = "BIDV";
const ACCOUNT_NAME = "TRAN VAN TUYEN";
const ACCOUNT_NUMBER = "8940252048";
const BANK_BIN = "970418";

// =====================================================
// MENU
// =====================================================

const NAV_ITEMS = [
  ["⌂", "Trang chủ", "/"],
  ["🛒", "Cửa hàng", "/shop"],
  ["▣", "Nạp tiền", "/deposit"],
  ["♢", "KEY của tôi", "/keys"],
  ["▤", "Đơn hàng", "/orders"],
  ["♙", "Tài khoản", "/dashboard"],
  ["⚙", "Cài đặt", "/settings"],
];

// =====================================================
// MỆNH GIÁ NẠP NHANH
// =====================================================

const QUICK_AMOUNTS = [
  10000,
  20000,
  50000,
  100000,
  200000,
  500000,
];

// =====================================================
// FORMAT TIỀN
// =====================================================

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

// =====================================================
// FORMAT NGÀY
// =====================================================

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("vi-VN");
}

// =====================================================
// LỌC SỐ
// =====================================================

function cleanAmount(value) {
  return String(value || "").replace(/\D/g, "");
}

// =====================================================
// TRANG NẠP TIỀN
// =====================================================

export default function DepositPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const [depositInfo, setDepositInfo] = useState(null);

  // ===================================================
  // LOAD DỮ LIỆU
  // ===================================================

  async function loadData() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUser(session.user);

      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setRequests(data || []);
      } else {
        console.error(
          "LOAD DEPOSIT HISTORY ERROR:",
          error
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // AUTH
  // ===================================================

  useEffect(() => {
    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // ===================================================
  // NHẬP SỐ TIỀN
  // ===================================================

  function handleAmountChange(event) {
    const value = cleanAmount(event.target.value);

    setAmount(value);
    setMessage("");
  }

  // ===================================================
  // CHỌN NHANH
  // ===================================================

  function selectQuickAmount(value) {
    setAmount(String(value));
    setMessage("");
  }

  // ===================================================
  // TẠO ĐƠN NẠP
  // ===================================================

  async function createDeposit() {
    setMessage("");
    setDepositInfo(null);

    const money = Number(amount);

    if (!money) {
      setMessage("Vui lòng nhập số tiền cần nạp.");
      return;
    }

    if (money < 10000) {
      setMessage("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }

    if (money > 100000000) {
      setMessage(
        "Số tiền nạp tối đa là 100.000.000đ."
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/deposit/create",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            amount: money,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            "Không thể tạo yêu cầu nạp tiền."
        );
      }

      // ===============================================
      // LƯU THÔNG TIN ĐƠN
      // ===============================================

      setDepositInfo({
        depositId: result.depositId,
        orderCode: result.orderCode,
        amount: result.amount,
        transferContent:
          result.transferContent,

        // PayOS
        checkoutUrl:
          result.checkoutUrl || "",

        qrCode:
          result.qrCode || "",

        paymentLinkId:
          result.paymentLinkId || "",
      });

      setMessage(
        "Đã tạo yêu cầu nạp tiền. Vui lòng chuyển khoản đúng số tiền và nội dung."
      );

      // ===============================================
      // LOAD LẠI LỊCH SỬ
      // ===============================================

      await loadData();
    } catch (error) {
      console.error(
        "CREATE DEPOSIT ERROR:",
        error
      );

      setMessage(
        error?.message ||
          "Có lỗi xảy ra khi tạo yêu cầu nạp tiền."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ===================================================
  // TẠO LINK VIETQR DỰ PHÒNG
  // ===================================================

  function getQrUrl() {
    if (!depositInfo) {
      return "";
    }

    const params = new URLSearchParams({
      amount: String(depositInfo.amount),
      addInfo:
        depositInfo.transferContent,
      accountName: ACCOUNT_NAME,
    });

    return `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?${params.toString()}`;
  }

  // ===================================================
  // QR PAYOS
  // ===================================================

  function getPaymentQr() {
    if (!depositInfo?.qrCode) {
      return "";
    }

    const qr = String(
      depositInfo.qrCode
    ).trim();

    if (!qr) {
      return "";
    }

    /*
     * PayOS trả qrCode là dữ liệu QR,
     * không phải URL ảnh.
     *
     * Dùng API tạo ảnh QR từ nội dung
     * để hiển thị trên website.
     */

    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      qr
    )}`;
  }

  // ===================================================
  // COPY
  // ===================================================

  async function copyText(
    text,
    successMessage
  ) {
    try {
      await navigator.clipboard.writeText(
        String(text)
      );

      setMessage(successMessage);
    } catch {
      setMessage(
        "Không thể sao chép. Vui lòng giữ và sao chép thủ công."
      );
    }
  }

  // ===================================================
  // MỞ PAYOS
  // ===================================================

  function openPayOS() {
    if (!depositInfo?.checkoutUrl) {
      setMessage(
        "Chưa có liên kết thanh toán PayOS."
      );
      return;
    }

    window.open(
      depositInfo.checkoutUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loader-card">
          <div className="loader">
            ✦
          </div>

          <div>
            Đang tải XENOVA PLAY...
          </div>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff7fb;
            color: #333;
            font-family: Arial, sans-serif;
          }

          .loader-card {
            text-align: center;
            padding: 30px;
          }

          .loader {
            font-size: 42px;
            color: #ff4f91;
            margin-bottom: 12px;
            animation: spin 1.2s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  // ===================================================
  // GIAO DIỆN
  // ===================================================

  return (
    <main className="page">

      <div className="petals">
        ✿　❀　✿　❀　✿
      </div>

      <header className="header">

        <div className="header-inner">

          <button
            className="logo"
            onClick={() => router.push("/")}
            type="button"
          >
            XENOVA{" "}
            <span>PLAY</span>
          </button>

          <nav className="desktop-nav">

            {NAV_ITEMS.map(
              ([icon, label, href]) => (
                <button
                  key={href}
                  type="button"
                  className={
                    href === "/deposit"
                      ? "nav-item active"
                      : "nav-item"
                  }
                  onClick={() =>
                    router.push(href)
                  }
                >
                  <span>{icon}</span>
                  {label}
                </button>
              )
            )}

          </nav>

          <div className="user-area">

            <div className="wallet">
              <span>💰</span>
              <span>Nạp tiền</span>
            </div>

            <button
              type="button"
              className="avatar"
              onClick={() =>
                router.push("/dashboard")
              }
            >
              {user?.email
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </button>

          </div>

        </div>

      </header>

      <section className="content">

        <div className="breadcrumb">

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
          >
            Trang chủ
          </button>

          <span>/</span>

          <strong>Nạp tiền</strong>

        </div>

        <div className="title-area">

          <div>

            <div className="small-title">
              XENOVA PLAY
            </div>

            <h1>Nạp tiền</h1>

            <p>
              Nạp tiền vào ví để mua KEY và
              sử dụng các dịch vụ trên hệ thống.
            </p>

          </div>

        </div>

        <div className="grid">

          <section className="card deposit-card">

            <div className="card-title">

              <div className="icon-box">
                💳
              </div>

              <div>

                <h2>
                  Số tiền muốn nạp
                </h2>

                <p>
                  Nhập số tiền bạn muốn nạp
                  vào tài khoản.
                </p>

              </div>

            </div>

            <label className="label">
              Số tiền
            </label>

            <div className="amount-input">

              <input
                value={
                  amount
                    ? Number(
                        amount
                      ).toLocaleString(
                        "vi-VN"
                      )
                    : ""
                }
                onChange={(event) =>
                  handleAmountChange({
                    target: {
                      value:
                        event.target.value.replace(
                          /\./g,
                          ""
                        ),
                    },
                  })
                }
                inputMode="numeric"
                placeholder="Nhập số tiền..."
              />

              <span>VNĐ</span>

            </div>

            <div className="quick-title">
              Chọn nhanh
            </div>

            <div className="quick-grid">

              {QUICK_AMOUNTS.map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      amount ===
                      String(value)
                        ? "quick-button selected"
                        : "quick-button"
                    }
                    onClick={() =>
                      selectQuickAmount(
                        value
                      )
                    }
                  >
                    {formatMoney(value)}
                  </button>
                )
              )}

            </div>

            <button
              type="button"
              className="deposit-button"
              onClick={createDeposit}
              disabled={submitting}
            >
              {submitting
                ? "Đang tạo yêu cầu..."
                : "TẠO YÊU CẦU NẠP TIỀN"}
            </button>

            {message && (
              <div className="message">
                {message}
              </div>
            )}

          </section>

          <aside className="card guide-card">

            <div className="card-title">

              <div className="icon-box">
                💡
              </div>

              <div>

                <h2>Hướng dẫn</h2>

                <p>
                  Thực hiện theo các bước
                  bên dưới.
                </p>

              </div>

            </div>

            <div className="steps">

              <div className="step">

                <b>1</b>

                <div>

                  <strong>
                    Nhập số tiền
                  </strong>

                  <span>
                    Nhập số tiền bạn muốn
                    nạp.
                  </span>

                </div>

              </div>

              <div className="step">

                <b>2</b>

                <div>

                  <strong>
                    Tạo yêu cầu
                  </strong>

                  <span>
                    Bấm nút tạo yêu cầu
                    nạp tiền.
                  </span>

                </div>

              </div>

              <div className="step">

                <b>3</b>

                <div>

                  <strong>
                    Chuyển khoản
                  </strong>

                  <span>
                    Chuyển đúng số tiền và
                    nội dung.
                  </span>

                </div>

              </div>

              <div className="step">

                <b>4</b>

                <div>

                  <strong>
                    Chờ hệ thống xử lý
                  </strong>

                  <span>
                    Kiểm tra lịch sử nạp
                    tiền bên dưới.
                  </span>

                </div>

              </div>

            </div>

            <a
              className="support-button"
              href="https://zalo.me/84365717262"
              target="_blank"
              rel="noreferrer"
            >
              💬 Chat Admin
            </a>

          </aside>

        </div>

        {depositInfo && (

          <section className="card payment-card">

            <div className="payment-header">

              <div>

                <div className="small-title">
                  PAYMENT
                </div>

                <h2>
                  Thông tin chuyển khoản
                </h2>

                <p>
                  Vui lòng chuyển đúng số tiền
                  và đúng nội dung chuyển khoản.
                </p>

              </div>

              <div className="payment-status">
                CHỜ THANH TOÁN
              </div>

            </div>

            {depositInfo.checkoutUrl && (

              <div className="payos-box">

                <div className="payos-left">

                  <div className="payos-badge">
                    PAYOS
                  </div>

                  <strong>
                    Thanh toán qua PayOS
                  </strong>

                  <span>
                    Quét mã QR hoặc mở trang
                    thanh toán PayOS để chuyển khoản.
                  </span>

                </div>

                <button
                  type="button"
                  className="payos-button"
                  onClick={openPayOS}
                >
                  MỞ THANH TOÁN PAYOS
                </button>

              </div>

            )}

            <div className="payment-layout">

              <div className="qr-area">

                <div className="qr-box">

                  {getPaymentQr() ? (

                    <img
                      src={getPaymentQr()}
                      alt="QR thanh toán PayOS"
                    />

                  ) : (

                    <img
                      src={getQrUrl()}
                      alt="QR thanh toán BIDV"
                    />

                  )}

                </div>

                <div className="qr-note">

                  {getPaymentQr()
                    ? "Quét mã QR PayOS bằng ứng dụng ngân hàng"
                    : "Quét mã QR bằng ứng dụng ngân hàng"}

                </div>

              </div>

              <div className="bank-info">

                <InfoRow
                  label="Ngân hàng"
                  value={BANK_NAME}
                  onCopy={() =>
                    copyText(
                      BANK_NAME,
                      "Đã sao chép tên ngân hàng."
                    )
                  }
                />

                <InfoRow
                  label="Chủ tài khoản"
                  value={ACCOUNT_NAME}
                  onCopy={() =>
                    copyText(
                      ACCOUNT_NAME,
                      "Đã sao chép tên tài khoản."
                    )
                  }
                />

                <InfoRow
                  label="Số tài khoản"
                  value={ACCOUNT_NUMBER}
                  onCopy={() =>
                    copyText(
                      ACCOUNT_NUMBER,
                      "Đã sao chép số tài khoản."
                    )
                  }
                />

                <InfoRow
                  label="Số tiền"
                  value={formatMoney(
                    depositInfo.amount
                  )}
                  onCopy={() =>
                    copyText(
                      String(
                        depositInfo.amount
                      ),
                      "Đã sao chép số tiền."
                    )
                  }
                />

                {depositInfo.orderCode && (

                  <InfoRow
                    label="Mã đơn PayOS"
                    value={String(
                      depositInfo.orderCode
                    )}
                    onCopy={() =>
                      copyText(
                        String(
                          depositInfo.orderCode
                        ),
                        "Đã sao chép mã đơn."
                      )
                    }
                  />

                )}

                <div className="transfer-row">

                  <div>

                    <small>
                      Nội dung chuyển khoản
                    </small>

                    <strong>
                      {
                        depositInfo.transferContent
                      }
                    </strong>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        depositInfo.transferContent,
                        "Đã sao chép nội dung chuyển khoản."
                      )
                    }
                  >
                    Sao chép
                  </button>

                </div>

              </div>

            </div>

            <div className="payment-note">

              <span>⚡</span>

              <div>

                <strong>
                  Tự động cộng tiền
                </strong>

                <p>
                  Sau khi thanh toán thành công,
                  hệ thống sẽ nhận thông báo PayOS
                  và tự động cập nhật số dư ví.
                </p>

              </div>

            </div>

          </section>

        )}

        <section className="card history-card">

          <div className="history-header">

            <div>

              <div className="small-title">
                HISTORY
              </div>

              <h2>
                Lịch sử nạp tiền
              </h2>

            </div>

            <span>
              {requests.length} giao dịch
            </span>

          </div>

          {requests.length === 0 ? (

            <div className="empty">

              <div>♡</div>

              <strong>
                Chưa có giao dịch
              </strong>

              <span>
                Lịch sử nạp tiền của bạn
                sẽ xuất hiện ở đây.
              </span>

            </div>

          ) : (

            <div className="history-list">

              {requests.map((item) => {

                const status = String(
                  item.status || ""
                ).toLowerCase();

                let statusText =
                  "Đang xử lý";

                if (
                  status === "approved" ||
                  status === "success" ||
                  status === "completed"
                ) {
                  statusText =
                    "Thành công";
                } else if (
                  status === "rejected" ||
                  status === "failed" ||
                  status === "cancelled"
                ) {
                  statusText =
                    "Từ chối";
                }

                return (

                  <div
                    className="history-item"
                    key={item.id}
                  >

                    <div className="history-icon">
                      ₫
                    </div>

                    <div className="history-main">

                      <strong>
                        {formatMoney(
                          item.amount
                        )}
                      </strong>

                      <span>
                        {formatDate(
                          item.created_at
                        )}
                      </span>

                    </div>

                    <div className="history-right">

                      <span
                        className={
                          status ===
                            "approved" ||
                          status ===
                            "success" ||
                          status ===
                            "completed"
                            ? "status success"
                            : status ===
                                "rejected" ||
                              status ===
                                "failed" ||
                              status ===
                                "cancelled"
                            ? "status failed"
                            : "status pending"
                        }
                      >
                        {statusText}
                      </span>

                      {item.transfer_content && (
                        <small>
                          {
                            item.transfer_content
                          }
                        </small>
                      )}

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

      </section>

      <a
        className="floating-chat"
        href="https://zalo.me/84365717262"
        target="_blank"
        rel="noreferrer"
      >
        <span>💬</span>

        <strong>
          Chat Admin
        </strong>
      </a>

      <nav className="mobile-nav">

        {NAV_ITEMS.slice(0, 5).map(
          ([icon, label, href]) => (

            <button
              type="button"
              key={href}
              className={
                href === "/deposit"
                  ? "mobile-active"
                  : ""
              }
              onClick={() =>
                router.push(href)
              }
            >

              <span>{icon}</span>

              <small>
                {label}
              </small>

            </button>

          )
        )}

      </nav>

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff7fb;
          color: #26232a;
          font-family:
            Inter,
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 15%,
              rgba(
                255,
                160,
                199,
                0.12
              ),
              transparent 25%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(
                255,
                120,
                175,
                0.1
              ),
              transparent 25%
            ),
            #fff7fb;
          padding-bottom: 80px;
        }

        .petals {
          position: fixed;
          top: 95px;
          left: 0;
          right: 0;
          pointer-events: none;
          text-align: center;
          color: rgba(
            255,
            94,
            155,
            0.16
          );
          font-size: 22px;
          letter-spacing: 20px;
          z-index: 0;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          backdrop-filter: blur(16px);
          border-bottom: 1px solid #f3dce7;
        }

        .header-inner {
          max-width: 1400px;
          min-height: 72px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .logo {
          border: 0;
          background: transparent;
          color: #f13c82;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.7px;
          white-space: nowrap;
        }

        .logo span {
          color: #27232a;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #77717a;
          padding: 10px 11px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          transition: 0.2s;
        }

        .nav-item span {
          margin-right: 5px;
        }

        .nav-item:hover,
        .nav-item.active {
          color: #ef3f84;
          background: #fff0f6;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wallet {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 999px;
          background: #fff0f6;
          color: #dc3975;
          font-size: 12px;
          font-weight: 800;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            #ff77ac,
            #ef3f83
          );
          color: white;
          font-weight: 900;
        }

        .content {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          padding: 30px 20px 60px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #99929a;
          font-size: 13px;
          margin-bottom: 22px;
        }

        .breadcrumb button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #99929a;
        }

        .breadcrumb button:hover {
          color: #ef3f84;
        }

        .breadcrumb strong {
          color: #ef3f84;
        }

        .title-area {
          margin-bottom: 25px;
        }

        .small-title {
          color: #ef3f84;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        h1 {
          margin: 4px 0 7px;
          font-size: clamp(
            30px,
            5vw,
            44px
          );
          letter-spacing: -1.8px;
        }

        .title-area p {
          margin: 0;
          color: #88818a;
          font-size: 14px;
        }

        .grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.5fr)
            minmax(300px, 0.9fr);
          gap: 18px;
        }

        .card {
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          border: 1px solid #f0dce6;
          border-radius: 22px;
          box-shadow:
            0 12px 40px
              rgba(
                219,
                76,
                133,
                0.07
              );
        }

        .deposit-card,
        .guide-card {
          padding: 25px;
        }

        .card-title {
          display: flex;
          gap: 13px;
          align-items: center;
          margin-bottom: 25px;
        }

        .icon-box {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #fff0f6;
          font-size: 20px;
        }

        .card-title h2,
        .payment-header h2,
        .history-header h2 {
          margin: 0 0 4px;
          font-size: 20px;
        }

        .card-title p,
        .payment-header p {
          margin: 0;
          color: #958e96;
          font-size: 13px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: #57515a;
          font-size: 13px;
          font-weight: 800;
        }

        .amount-input {
          display: flex;
          align-items: center;
          border: 1px solid #ead5e0;
          border-radius: 15px;
          background: #fff;
          overflow: hidden;
          transition: 0.2s;
        }

        .amount-input:focus-within {
          border-color: #f25b96;
          box-shadow:
            0 0 0 4px
              rgba(
                242,
                91,
                150,
                0.09
              );
        }

        .amount-input input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          padding: 17px;
          background: transparent;
          color: #28242a;
          font-size: 20px;
          font-weight: 800;
        }

        .amount-input span {
          padding: 0 17px;
          color: #ef3f84;
          font-size: 12px;
          font-weight: 900;
        }

        .quick-title {
          margin: 20px 0 10px;
          color: #6f6871;
          font-size: 12px;
          font-weight: 800;
        }

        .quick-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
        }

        .quick-button {
          border: 1px solid #efdbe5;
          border-radius: 11px;
          background: #fff;
          color: #5f5961;
          padding: 11px 7px;
          font-size: 12px;
          font-weight: 800;
        }

        .quick-button:hover,
        .quick-button.selected {
          border-color: #f25b96;
          color: #ed3d82;
          background: #fff1f7;
        }

        .deposit-button {
          width: 100%;
          margin-top: 18px;
          border: 0;
          border-radius: 14px;
          padding: 15px;
          background:
            linear-gradient(
              135deg,
              #f65c98,
              #ed3b80
            );
          color: white;
          font-weight: 900;
          box-shadow:
            0 9px 22px
              rgba(
                237,
                59,
                128,
                0.2
              );
        }

        .deposit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          margin-top: 12px;
          padding: 11px 13px;
          border-radius: 11px;
          background: #fff3f7;
          color: #dc3975;
          font-size: 12px;
          line-height: 1.5;
        }

        .steps {
          display: grid;
          gap: 16px;
        }

        .step {
          display: flex;
          gap: 12px;
        }

        .step > b {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff0f6;
          color: #ef3f84;
          font-size: 12px;
        }

        .step div {
          display: grid;
          gap: 3px;
        }

        .step strong {
          font-size: 13px;
        }

        .step span {
          color: #99929a;
          font-size: 12px;
          line-height: 1.5;
        }

        .support-button {
          display: block;
          margin-top: 22px;
          padding: 12px;
          text-align: center;
          border-radius: 12px;
          background: #fff0f6;
          color: #e43b7c;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .payment-card,
        .history-card {
          margin-top: 18px;
          padding: 25px;
        }

        .payment-header,
        .history-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .payment-status {
          padding: 8px 11px;
          border-radius: 999px;
          background: #fff5dc;
          color: #b77b16;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .payos-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
          padding: 15px 17px;
          border: 1px solid #ead7e2;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #fff6fa,
              #ffffff
            );
        }

        .payos-left {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .payos-badge {
          width: fit-content;
          padding: 4px 8px;
          border-radius: 6px;
          background: #111;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .payos-left strong {
          color: #29242a;
          font-size: 13px;
        }

        .payos-left span {
          color: #928a93;
          font-size: 11px;
          line-height: 1.45;
        }

        .payos-button {
          flex: 0 0 auto;
          border: 0;
          border-radius: 11px;
          padding: 11px 14px;
          background: #111;
          color: white;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .payos-button:hover {
          opacity: 0.88;
        }

        .payment-layout {
          display: grid;
          grid-template-columns:
            290px 1fr;
          gap: 30px;
          align-items: center;
        }

        .qr-area {
          text-align: center;
        }

        .qr-box {
          width: 250px;
          height: 250px;
          margin: 0 auto;
          padding: 10px;
          background: white;
          border: 1px solid #eadbe3;
          border-radius: 18px;
          box-shadow:
            0 10px 30px
              rgba(
                0,
                0,
                0,
                0.05
              );
          overflow: hidden;
        }

        .qr-box img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .qr-note {
          margin-top: 10px;
          color: #99929a;
          font-size: 11px;
          line-height: 1.4;
        }

        .bank-info {
          display: grid;
          gap: 9px;
        }

        .info-row,
        .transfer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px;
          border: 1px solid #f0e1e8;
          border-radius: 13px;
          background: #fffafd;
        }

        .info-row div,
        .transfer-row div {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .info-row small,
        .transfer-row small {
          color: #99929a;
          font-size: 10px;
        }

        .info-row strong,
        .transfer-row strong {
          color: #302b31;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .info-row button,
        .transfer-row button {
          border: 1px solid #f0d5e2;
          background: #fff;
          color: #e43b7c;
          border-radius: 9px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .payment-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 18px;
          padding: 13px 15px;
          border-radius: 13px;
          background: #fff5f9;
          border: 1px solid #f4dce7;
        }

        .payment-note > span {
          font-size: 18px;
        }

        .payment-note div {
          display: grid;
          gap: 3px;
        }

        .payment-note strong {
          color: #d93876;
          font-size: 12px;
        }

        .payment-note p {
          margin: 0;
          color: #948b93;
          font-size: 11px;
          line-height: 1.5;
        }

        .history-header > span {
          padding: 7px 10px;
          border-radius: 999px;
          background: #fff0f6;
          color: #e43b7c;
          font-size: 11px;
          font-weight: 900;
        }

        .empty {
          padding: 45px 20px;
          display: grid;
          place-items: center;
          gap: 5px;
          text-align: center;
          color: #99929a;
        }

        .empty div {
          font-size: 35px;
          color: #ef6b9e;
          margin-bottom: 5px;
        }

        .empty strong {
          color: #5e5860;
          font-size: 14px;
        }

        .empty span {
          font-size: 12px;
        }

        .history-list {
          display: grid;
          gap: 8px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border: 1px solid #f1e3e9;
          border-radius: 13px;
        }

        .history-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #fff0f6;
          color: #e83e7f;
          font-weight: 900;
        }

        .history-main {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .history-main strong {
          font-size: 13px;
        }

        .history-main span {
          color: #99929a;
          font-size: 10px;
        }

        .history-right {
          display: grid;
          justify-items: end;
          gap: 3px;
        }

        .history-right small {
          max-width: 190px;
          color: #aaa2aa;
          font-size: 9px;
          overflow-wrap: anywhere;
          text-align: right;
        }

        .status {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .status.pending {
          background: #fff5dc;
          color: #b77b16;
        }

        .status.success {
          background: #eafaf0;
          color: #239450;
        }

        .status.failed {
          background: #fff0f0;
          color: #d34848;
        }

        .floating-chat {
          position: fixed;
          right: 22px;
          bottom: 24px;
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 999px;
          background: #ed3d80;
          color: white;
          text-decoration: none;
          box-shadow:
            0 12px 30px
              rgba(
                237,
                61,
                128,
                0.3
              );
          font-size: 12px;
        }

        .mobile-nav {
          display: none;
        }

        @media (max-width: 900px) {

          .desktop-nav {
            display: none;
          }

          .header-inner {
            justify-content: space-between;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .payment-layout {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 600px) {

          .header-inner {
            min-height: 62px;
            padding: 0 15px;
          }

          .logo {
            font-size: 18px;
          }

          .wallet {
            display: none;
          }

          .content {
            padding: 22px 13px 95px;
          }

          .deposit-card,
          .guide-card,
          .payment-card,
          .history-card {
            padding: 18px;
            border-radius: 18px;
          }

          .quick-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .payment-header,
          .history-header {
            align-items: flex-start;
          }

          .payment-status {
            font-size: 8px;
          }

          .qr-box {
            width: 230px;
            height: 230px;
          }

          .history-item {
            align-items: flex-start;
          }

          .history-right {
            text-align: right;
          }

          .floating-chat {
            right: 13px;
            bottom: 74px;
          }

          .payos-box {
            display: grid;
            gap: 12px;
          }

          .payos-button {
            width: 100%;
          }

          .mobile-nav {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 9px;
            z-index: 60;
            display: grid;
            grid-template-columns:
              repeat(5, 1fr);
            padding: 7px;
            border: 1px solid #efdce5;
            border-radius: 18px;
            background: rgba(
              255,
              255,
              255,
              0.94
            );
            backdrop-filter: blur(15px);
            box-shadow:
              0 10px 35px
                rgba(
                  210,
                  70,
                  125,
                  0.14
                );
          }

          .mobile-nav button {
            border: 0;
            background: transparent;
            color: #969099;
            padding: 6px 2px;
            display: grid;
            justify-items: center;
            gap: 3px;
          }

          .mobile-nav button span {
            font-size: 16px;
          }

          .mobile-nav button small {
            font-size: 8px;
            font-weight: 800;
          }

          .mobile-nav button.mobile-active {
            color: #ed3d80;
          }

        }

      `}</style>

    </main>
  );
}

// =====================================================
// INFO ROW
// =====================================================

function InfoRow({
  label,
  value,
  onCopy,
}) {
  return (
    <div className="info-row">

      <div>

        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

      </div>

      <button
        type="button"
        onClick={onCopy}
      >
        Sao chép
      </button>

    </div>
  );
}
