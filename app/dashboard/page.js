"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [keyCount, setKeyCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [depositCount, setDepositCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setMessage("Vui lòng đăng nhập để xem tài khoản.");
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const [
        walletResult,
        keysResult,
        ordersResult,
        depositsResult,
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select("id, user_id, balance, created_at, updated_at")
          .eq("user_id", currentUser.id)
          .maybeSingle(),

        supabase
          .from("keys")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),

        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),

        supabase
          .from("deposit_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id),
      ]);

      if (walletResult.error) {
        console.error("WALLET ERROR:", walletResult.error);
      }

      if (keysResult.error) {
        console.error("KEY COUNT ERROR:", keysResult.error);
      }

      if (ordersResult.error) {
        console.error("ORDER COUNT ERROR:", ordersResult.error);
      }

      if (depositsResult.error) {
        console.error("DEPOSIT COUNT ERROR:", depositsResult.error);
      }

      setWallet(walletResult.data || null);
      setKeyCount(keysResult.count || 0);
      setOrderCount(ordersResult.count || 0);
      setDepositCount(depositsResult.count || 0);
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
      setMessage("Không thể tải dữ liệu tài khoản.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>X</div>
          <div>Đang tải tài khoản...</div>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main style={styles.page}>
        <div style={styles.errorPage}>
          <div style={styles.errorIcon}>🔐</div>

          <h2 style={styles.errorTitle}>
            Chưa đăng nhập
          </h2>

          <p style={styles.errorText}>
            {message}
          </p>

          <Link href="/login" style={styles.primaryButton}>
            ĐĂNG NHẬP
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.backgroundGlow} />

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/" style={styles.logo}>
            <div style={styles.logoMark}>X</div>

            <div>
              <div style={styles.logoText}>XENOVA</div>
              <div style={styles.logoSub}>PLAY</div>
            </div>
          </Link>

          <nav style={styles.desktopNav}>
            <Link href="/" style={styles.navLink}>
              Trang chủ
            </Link>

            <Link href="/shop" style={styles.navLink}>
              Cửa hàng
            </Link>

            <Link href="/deposit" style={styles.navLink}>
              Nạp tiền
            </Link>

            <Link href="/keys" style={styles.navLink}>
              KEY của tôi
            </Link>

            <Link href="/orders" style={styles.navLink}>
              Đơn hàng
            </Link>

            <Link href="/dashboard" style={styles.navLinkActive}>
              Tài khoản
            </Link>

            <Link href="/settings" style={styles.navLink}>
              Cài đặt
            </Link>
          </nav>

          <Link href="/deposit" style={styles.headerWallet}>
            <span>Ví</span>
            <strong>{formatMoney(wallet?.balance)}</strong>
          </Link>
        </header>

        <section style={styles.hero}>
          <div style={styles.heroLeft}>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              Xin chào 👋
            </h1>

            <p style={styles.email}>
              {user?.email}
            </p>
          </div>

          <div style={styles.accountIcon}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </section>

        <section style={styles.walletCard}>
          <div style={styles.walletDecoration} />

          <div style={styles.walletTop}>
            <div>
              <div style={styles.walletLabel}>
                SỐ DƯ VÍ
              </div>

              <div style={styles.balance}>
                {formatMoney(wallet?.balance)}
              </div>

              <div style={styles.walletHint}>
                Số dư hiện tại trong tài khoản
              </div>
            </div>

            <div style={styles.walletIcon}>
              💰
            </div>
          </div>

          <div style={styles.walletBottom}>
            <span>Dùng số dư để mua KEY</span>

            <Link
              href="/deposit"
              style={styles.depositButton}
            >
              + NẠP TIỀN
            </Link>
          </div>
        </section>

        <section style={styles.stats}>
          <StatCard
            icon="🔑"
            value={keyCount}
            label="KEY của tôi"
            href="/keys"
          />

          <StatCard
            icon="📦"
            value={orderCount}
            label="Đơn hàng"
            href="/orders"
          />

          <StatCard
            icon="💳"
            value={depositCount}
            label="Lần nạp tiền"
            href="/deposit"
          />
        </section>

        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Thao tác nhanh
              </h2>

              <p style={styles.sectionSubtitle}>
                Quản lý tài khoản XENOVA PLAY
              </p>
            </div>
          </div>

          <div style={styles.actions}>
            <ActionCard
              href="/shop"
              icon="🛒"
              title="Cửa hàng"
              text="Mua KEY"
            />

            <ActionCard
              href="/keys"
              icon="🔑"
              title="KEY của tôi"
              text="Xem KEY đã mua"
            />

            <ActionCard
              href="/orders"
              icon="📦"
              title="Đơn hàng"
              text="Lịch sử giao dịch"
            />

            <ActionCard
              href="/deposit"
              icon="💰"
              title="Nạp tiền"
              text="Nạp vào ví"
            />

            <ActionCard
              href="/settings"
              icon="⚙️"
              title="Cài đặt"
              text="Quản lý tài khoản"
            />
          </div>
        </section>

        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>
            🛡️
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={styles.infoTitle}>
              Tài khoản của bạn
            </h3>

            <p style={styles.infoText}>
              Tài khoản được bảo vệ bằng hệ thống xác thực
              của XENOVA PLAY. Không chia sẻ mật khẩu cho
              người khác.
            </p>
          </div>
        </section>

        <div style={styles.bottomLinks}>
          <Link href="/">Trang chủ</Link>
          <Link href="/shop">Cửa hàng</Link>
          <Link href="/keys">KEY</Link>
          <Link href="/orders">Đơn hàng</Link>
          <Link href="/settings">Cài đặt</Link>
        </div>
      </div>

      <div className="mobileBottom">
        <Link href="/" className="mobileItem">
          <span>⌂</span>
          Trang chủ
        </Link>

        <Link href="/shop" className="mobileItem">
          <span>🛒</span>
          Shop
        </Link>

        <Link href="/deposit" className="mobileItem">
          <span>＋</span>
          Nạp tiền
        </Link>

        <Link href="/keys" className="mobileItem">
          <span>🔑</span>
          KEY
        </Link>

        <Link href="/dashboard" className="mobileItemActive">
          <span>👤</span>
          Tài khoản
        </Link>
      </div>

      <style jsx>{`
        .mobileBottom {
          display: none;
        }

        @media (max-width: 850px) {
          .desktopNav {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .headerWallet {
            display: none;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .bottomLinks {
            display: none;
          }

          .mobileBottom {
            position: fixed;
            display: flex;
            left: 10px;
            right: 10px;
            bottom: 10px;
            height: 62px;
            z-index: 100;
            background: rgba(255, 255, 255, 0.97);
            border: 1px solid #f0dfe7;
            border-radius: 18px;
            box-shadow: 0 10px 35px rgba(60, 30, 45, 0.12);
            backdrop-filter: blur(12px);
          }

          .mobileItem,
          .mobileItemActive {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            text-decoration: none;
            font-size: 8px;
            font-weight: 800;
          }

          .mobileItem {
            color: #958992;
          }

          .mobileItemActive {
            color: #ed619d;
          }

          .page {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </main>
  );
}

function StatCard({ icon, value, label, href }) {
  return (
    <Link href={href} style={styles.statCard}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={styles.statValue}>
          {value}
        </div>

        <div style={styles.statLabel}>
          {label}
        </div>
      </div>

      <div style={styles.statArrow}>
        ›
      </div>
    </Link>
  );
}

function ActionCard({ href, icon, title, text }) {
  return (
    <Link href={href} style={styles.actionCard}>
      <div style={styles.actionIcon}>
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={styles.actionTitle}>
          {title}
        </div>

        <div style={styles.actionText}>
          {text}
        </div>
      </div>

      <div style={styles.arrow}>
        ›
      </div>
    </Link>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(180deg, #fff7fb 0%, #ffffff 35%, #ffffff 100%)",
    color: "#25202a",
    padding: "0 15px 70px",
  },

  backgroundGlow: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "rgba(255, 126, 178, 0.12)",
    filter: "blur(100px)",
    top: "-220px",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  container: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },

  header: {
    minHeight: "76px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    borderBottom: "1px solid #f4e3eb",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    textDecoration: "none",
    color: "#25202a",
    minWidth: "135px",
  },

  logoMark: {
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #ff6da9, #ff91bd)",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "950",
    boxShadow: "0 7px 20px rgba(255, 104, 165, 0.25)",
  },

  logoText: {
    fontSize: "15px",
    fontWeight: "950",
    letterSpacing: "1px",
    lineHeight: 1,
  },

  logoSub: {
    marginTop: "3px",
    color: "#ff71aa",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: "3px",
  },

  desktopNav: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "4px",
  },

  navLink: {
    padding: "9px 10px",
    borderRadius: "9px",
    color: "#756c75",
    textDecoration: "none",
    fontSize: "11px",
    fontWeight: "750",
    whiteSpace: "nowrap",
  },

  navLinkActive: {
    padding: "9px 10px",
    borderRadius: "9px",
    background: "#fff0f6",
    color: "#f15d9b",
    textDecoration: "none",
    fontSize: "11px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  headerWallet: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "999px",
    background: "#fff0f6",
    border: "1px solid #ffd7e7",
    color: "#e75b97",
    textDecoration: "none",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },

  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "35px 0 22px",
  },

  heroLeft: {
    minWidth: 0,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 11px",
    borderRadius: "999px",
    background: "#fff0f6",
    border: "1px solid #ffd9e8",
    color: "#ec629e",
    fontSize: "9px",
    fontWeight: "950",
    letterSpacing: "1.8px",
  },

  title: {
    margin: "11px 0 4px",
    fontSize: "clamp(27px, 5vw, 38px)",
    lineHeight: 1.1,
    fontWeight: "950",
    letterSpacing: "-1px",
  },

  email: {
    margin: 0,
    color: "#958b94",
    fontSize: "13px",
    wordBreak: "break-all",
  },

  accountIcon: {
    width: "58px",
    height: "58px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg, #fff0f6, #ffe5ef)",
    border: "1px solid #ffd5e6",
    color: "#ef609d",
    fontSize: "20px",
    fontWeight: "950",
    boxShadow: "0 10px 30px rgba(237, 91, 151, 0.12)",
  },

  walletCard: {
    position: "relative",
    overflow: "hidden",
    padding: "23px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, #ff70aa 0%, #ff8bb9 55%, #ff9bc4 100%)",
    color: "#ffffff",
    border: "1px solid #ff9bc3",
    boxShadow: "0 18px 45px rgba(239, 91, 151, 0.18)",
    marginBottom: "15px",
  },

  walletDecoration: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    right: "-65px",
    top: "-85px",
    pointerEvents: "none",
  },

  walletTop: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  walletLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.6px",
  },

  balance: {
    marginTop: "7px",
    fontSize: "clamp(28px, 6vw, 42px)",
    lineHeight: 1,
    fontWeight: "950",
    letterSpacing: "-1px",
  },

  walletHint: {
    marginTop: "8px",
    color: "rgba(255,255,255,0.72)",
    fontSize: "10px",
  },

  walletIcon: {
    width: "55px",
    height: "55px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: "16px",
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.2)",
    fontSize: "24px",
  },

  walletBottom: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid rgba(255,255,255,0.22)",
    color: "rgba(255,255,255,0.78)",
    fontSize: "11px",
  },

  depositButton: {
    padding: "10px 15px",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#eb5d9b",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: "950",
    boxShadow: "0 6px 15px rgba(163, 48, 96, 0.12)",
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "29px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderRadius: "15px",
    background: "#ffffff",
    border: "1px solid #f1e3e9",
    boxShadow: "0 8px 25px rgba(54, 26, 42, 0.045)",
    textDecoration: "none",
    color: "#25202a",
  },

  statIcon: {
    width: "43px",
    height: "43px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: "12px",
    background: "#fff1f7",
    border: "1px solid #ffe0ec",
    fontSize: "19px",
  },

  statValue: {
    fontSize: "22px",
    lineHeight: 1,
    fontWeight: "950",
    color: "#2c252b",
  },

  statLabel: {
    marginTop: "5px",
    color: "#8e838c",
    fontSize: "10px",
    fontWeight: "650",
  },

  statArrow: {
    marginLeft: "auto",
    color: "#d6a9bd",
    fontSize: "21px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "13px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "950",
    letterSpacing: "-0.2px",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#a0959e",
    fontSize: "10px",
  },

  actions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "70px",
    padding: "0 14px",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #f1e3e9",
    boxShadow: "0 7px 22px rgba(54, 26, 42, 0.04)",
    color: "#2d252c",
    textDecoration: "none",
  },

  actionIcon: {
    width: "42px",
    height: "42px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: "12px",
    background: "#fff1f7",
    border: "1px solid #ffe0ec",
    fontSize: "18px",
  },

  actionTitle: {
    fontSize: "13px",
    fontWeight: "900",
  },

  actionText: {
    marginTop: "3px",
    color: "#968b93",
    fontSize: "10px",
  },

  arrow: {
    color: "#d5a7bb",
    fontSize: "23px",
    marginLeft: "auto",
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    marginTop: "20px",
    padding: "17px",
    borderRadius: "15px",
    background: "#fff8fb",
    border: "1px solid #f4dfe8",
  },

  infoIcon: {
    width: "39px",
    height: "39px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: "11px",
    background: "#ffffff",
    border: "1px solid #f1dce5",
    fontSize: "19px",
  },

  infoTitle: {
    margin: "1px 0 5px",
    fontSize: "13px",
    fontWeight: "900",
  },

  infoText: {
    margin: 0,
    color: "#8e828b",
    fontSize: "11px",
    lineHeight: 1.65,
  },

  bottomLinks: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #f3e6eb",
  },

  loading: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "12px",
    color: "#9b8e97",
    fontSize: "13px",
  },

  loadingIcon: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg, #ff70aa, #ff9bc4)",
    color: "#ffffff",
    fontWeight: "950",
    fontSize: "18px",
    boxShadow: "0 10px 25px rgba(238, 92, 151, 0.2)",
  },

  errorPage: {
    maxWidth: "400px",
    margin: "15vh auto 0",
    padding: "32px 22px",
    textAlign: "center",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid #f1e0e7",
    boxShadow: "0 15px 45px rgba(54, 26, 42, 0.07)",
  },

  errorIcon: {
    fontSize: "45px",
  },

  errorTitle: {
    margin: "12px 0 6px",
    fontSize: "20px",
    fontWeight: "950",
  },

  errorText: {
    margin: 0,
    color: "#958992",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  primaryButton: {
    display: "inline-block",
    marginTop: "17px",
    padding: "12px 20px",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, #ff6da8, #ff8fba)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: "950",
    fontSize: "11px",
    boxShadow: "0 8px 20px rgba(238, 92, 151, 0.2)",
  },
};
