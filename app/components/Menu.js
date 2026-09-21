"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("vi-VN") + "đ";
}

function MenuLink({ href, icon, children, onClick }) {
  return (
    <Link
      href={href}
      className="xenova-menu-link"
      onClick={onClick}
    >
      <span className="xenova-menu-icon">
        {icon}
      </span>

      <span>{children}</span>
    </Link>
  );
}

export default function Menu() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  async function loadWallet(currentUser) {
    if (!currentUser) {
      setBalance(0);
      return;
    }

    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    setBalance(Number(data?.balance || 0));
  }

  async function loadUser() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser || null);

    if (currentUser) {
      await loadWallet(currentUser);
    } else {
      setBalance(0);
    }
  }

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("xenova-theme");

    if (savedTheme === "dark") {
      setDark(true);

      document.documentElement.classList.add(
        "dark"
      );
    } else {
      setDark(false);

      document.documentElement.classList.remove(
        "dark"
      );
    }

    setThemeReady(true);

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentUser) => {
        setUser(currentUser || null);

        if (currentUser) {
          await loadWallet(currentUser);
        } else {
          setBalance(0);
        }
      }
    );

    const handleWalletUpdated = () => {
      loadUser();
    };

    const handleOpenMenu = () => {
      setOpen(true);
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadUser();
      }
    };

    window.addEventListener(
      "xenova-wallet-updated",
      handleWalletUpdated
    );

    window.addEventListener(
      "xenova-open-menu",
      handleOpenMenu
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      subscription?.unsubscribe();

      window.removeEventListener(
        "xenova-wallet-updated",
        handleWalletUpdated
      );

      window.removeEventListener(
        "xenova-open-menu",
        handleOpenMenu
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  function toggleTheme() {
    const nextDark = !dark;

    setDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add(
        "dark"
      );

      localStorage.setItem(
        "xenova-theme",
        "dark"
      );
    } else {
      document.documentElement.classList.remove(
        "dark"
      );

      localStorage.setItem(
        "xenova-theme",
        "light"
      );
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    setOpen(false);
    setUser(null);
    setBalance(0);

    router.push("/login");
  }

  function closeMenu() {
    setOpen(false);
  }

  if (!themeReady) {
    return null;
  }

  return (
    <>
      {/* =========================
          GÓC PHẢI TRÊN
      ========================= */}

      <div className="global-menu-buttons">
        <button
          type="button"
          className="global-theme-button"
          onClick={toggleTheme}
          aria-label="Đổi giao diện"
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <button
          type="button"
          className="global-menu-button"
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
        >
          ☰
        </button>
      </div>

      {/* =========================
          MENU DRAWER
      ========================= */}

      {open && (
        <div
          className="xenova-menu-overlay"
          onClick={closeMenu}
        >
          <aside
            className="xenova-menu-drawer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="xenova-menu-header">
              <div>
                <div className="xenova-menu-brand">
                  XENOVA{" "}
                  <span>PLAY</span>
                </div>

                <div className="xenova-menu-user">
                  {user
                    ? user.email ||
                      "Tài khoản"
                    : "Bạn chưa đăng nhập"}
                </div>
              </div>

              <button
                type="button"
                className="xenova-menu-close"
                onClick={closeMenu}
              >
                ✕
              </button>
            </div>

            <div className="xenova-menu-list">
              <MenuLink
                href="/"
                icon="🏠"
                onClick={closeMenu}
              >
                Trang chủ
              </MenuLink>

              <MenuLink
                href="/shop"
                icon="🛍️"
                onClick={closeMenu}
              >
                Cửa hàng
              </MenuLink>

              <MenuLink
                href="/deposit"
                icon="💰"
                onClick={closeMenu}
              >
                Nạp tiền
              </MenuLink>

              <MenuLink
                href="/keys"
                icon="🔑"
                onClick={closeMenu}
              >
                KEY của tôi
              </MenuLink>

              <MenuLink
                href="/orders"
                icon="📦"
                onClick={closeMenu}
              >
                Đơn hàng
              </MenuLink>

              <MenuLink
                href={
                  user
                    ? "/dashboard"
                    : "/login"
                }
                icon="👤"
                onClick={closeMenu}
              >
                Tài khoản
              </MenuLink>

              <MenuLink
                href="/settings"
                icon="⚙️"
                onClick={closeMenu}
              >
                Cài đặt
              </MenuLink>
            </div>

            <div className="xenova-menu-bottom">
              <button
                type="button"
                className="xenova-menu-theme-row"
                onClick={toggleTheme}
              >
                <span>
                  {dark ? "☀️" : "🌙"}{" "}
                  Giao diện
                </span>

                <span>
                  {dark ? "Tối" : "Sáng"}
                </span>
              </button>

              {user ? (
                <button
                  type="button"
                  className="xenova-menu-logout"
                  onClick={logout}
                >
                  🚪 Đăng xuất
                </button>
              ) : (
                <Link
                  href="/login"
                  className="xenova-menu-login"
                  onClick={closeMenu}
                >
                  🔐 Đăng nhập
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* =========================
          THANH CÔNG CỤ DƯỚI
          
          SỐ DƯ | AVATAR | KEY
          
          TÀI KHOẢN:
          CHỈ HIỆN AVATAR
          
          KEY:
          CHỈ HIỆN ICON KEY
      ========================= */}

      <div className="xenova-bottom-toolbar">

        {/* SỐ DƯ */}
        <Link
          href="/deposit"
          className="xenova-bottom-item"
          aria-label="Số dư"
        >
          <span className="xenova-bottom-icon">
            💰
          </span>

          <span className="xenova-bottom-text">
            <small>SỐ DƯ</small>

            <strong>
              {formatPrice(balance)}
            </strong>
          </span>
        </Link>

        {/* TÀI KHOẢN - CHỈ AVATAR */}
        <Link
          href={
            user
              ? "/dashboard"
              : "/login"
          }
          className="xenova-bottom-item xenova-account-bottom"
          aria-label="Tài khoản"
        >
          <span className="xenova-avatar">
            🐰
          </span>
        </Link>

        {/* KEY - CHỈ ICON */}
        <Link
          href="/keys"
          className="xenova-bottom-item xenova-key-bottom"
          aria-label="KEY"
        >
          <span className="xenova-bottom-icon">
            🔑
          </span>
        </Link>

      </div>
    </>
  );
}
