"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

const BUCKET = "shop-banners";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getExtension(file) {
  const name = file?.name || "";
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return ext;
  }

  return "png";
}

function isImage(file) {
  return Boolean(file && file.type?.startsWith("image/"));
}

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      error.message || "Không thể lấy phiên đăng nhập."
    );
  }

  if (!session?.access_token) {
    throw new Error(
      "Chưa nhận được phiên đăng nhập. Vui lòng đăng nhập lại."
    );
  }

  return session.access_token;
}

export default function AdminShopPage() {
  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [banners, setBanners] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message ||
              "Không thể lấy phiên đăng nhập."
          );
        }

        if (!session?.access_token) {
          if (mounted) {
            setLoading(false);
            setError(
              "Chưa nhận được phiên đăng nhập. Vui lòng đăng nhập lại."
            );
          }

          return;
        }

        await loadSettings(session.access_token);
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError(
            err?.message ||
              "Không thể khởi tạo trang quản lý SHOP."
          );
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          if (session?.access_token) {
            await loadSettings(session.access_token);
          }
        }

        if (event === "SIGNED_OUT") {
          setLogoUrl("");
          setBanners([]);
          setError(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
          );
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function loadSettings(accessToken = null) {
    try {
      setLoading(true);
      setError("");

      const token =
        accessToken || (await getAccessToken());

      const response = await fetch(
        "/api/admin/shop-settings",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            "Không thể tải cài đặt SHOP."
        );
      }

      const settings = result.settings || {};

      setLogoUrl(
        String(settings.logo_url || "")
      );

      setBanners(
        Array.isArray(settings.banners)
          ? settings.banners.map(
              (banner, index) => ({
                id:
                  banner?.id ||
                  `banner-${Date.now()}-${index}`,
                image_url: String(
                  banner?.image_url || ""
                ),
                enabled:
                  banner?.enabled !== false,
                order: Number.isFinite(
                  Number(banner?.order)
                )
                  ? Number(banner.order)
                  : index,
              })
            )
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Có lỗi khi tải cài đặt SHOP."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function uploadImage(
    file,
    type = "banner"
  ) {
    if (!file) return null;

    if (!isImage(file)) {
      throw new Error(
        "Chỉ được chọn file hình ảnh."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "Ảnh không được vượt quá 10MB."
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!user) {
      throw new Error(
        "Bạn chưa đăng nhập."
      );
    }

    const extension = getExtension(file);

    const prefix =
      type === "logo"
        ? "logo"
        : "banner";

    const fileName =
      `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

    const path = `${user.id}/${fileName}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType:
          file.type || undefined,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    const { data: publicData } =
      supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

    if (!publicData?.publicUrl) {
      throw new Error(
        "Không lấy được URL ảnh."
      );
    }

    return publicData.publicUrl;
  }

  async function handleLogoUpload(event) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    try {
      clearMessages();
      setUploadingLogo(true);

      const url = await uploadImage(
        file,
        "logo"
      );

      setLogoUrl(url);

      setMessage(
        "Đã tải logo lên. Nhấn LƯU CẤU HÌNH để áp dụng."
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Upload logo thất bại."
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleBannerUpload(event) {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!files.length) return;

    try {
      clearMessages();
      setUploadingBanner(true);

      const uploaded = [];

      for (const file of files) {
        const url = await uploadImage(
          file,
          "banner"
        );

        uploaded.push({
          id:
            `banner-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 10)}`,
          image_url: url,
          enabled: true,
          order:
            banners.length +
            uploaded.length,
        });
      }

      setBanners((current) => [
        ...current,
        ...uploaded,
      ]);

      setMessage(
        `Đã tải lên ${uploaded.length} banner. Nhấn LƯU CẤU HÌNH để áp dụng.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Upload banner thất bại."
      );
    } finally {
      setUploadingBanner(false);
    }
  }

  function toggleBanner(id) {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === id
          ? {
              ...banner,
              enabled:
                !banner.enabled,
            }
          : banner
      )
    );
  }

  function deleteBanner(id) {
    setBanners((current) =>
      current
        .filter(
          (banner) => banner.id !== id
        )
        .map((banner, index) => ({
          ...banner,
          order: index,
        }))
    );
  }

  function moveBanner(
    id,
    direction
  ) {
    setBanners((current) => {
      const index =
        current.findIndex(
          (banner) =>
            banner.id === id
        );

      if (index === -1) {
        return current;
      }

      const newIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];

      const temp =
        next[index];

      next[index] =
        next[newIndex];

      next[newIndex] =
        temp;

      return next.map(
        (banner, itemIndex) => ({
          ...banner,
          order: itemIndex,
        })
      );
    });
  }

  async function saveSettings() {
    try {
      setSaving(true);
      clearMessages();

      const accessToken =
        await getAccessToken();

      const cleanBanners =
        banners
          .filter(
            (banner) =>
              banner &&
              typeof banner.image_url ===
                "string" &&
              banner.image_url.trim()
          )
          .map(
            (banner, index) => ({
              id: banner.id,
              image_url:
                banner.image_url.trim(),
              enabled:
                banner.enabled !== false,
              order: index,
            })
          );

      const response =
        await fetch(
          "/api/admin/shop-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              logo_url:
                logoUrl.trim(),
              banners:
                cleanBanners,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            "Không thể lưu cài đặt SHOP."
        );
      }

      setLogoUrl(
        String(
          result?.settings
            ?.logo_url ||
            logoUrl ||
            ""
        )
      );

      setBanners(
        Array.isArray(
          result?.settings?.banners
        )
          ? result.settings.banners
          : cleanBanners
      );

      setMessage(
        "Đã lưu cấu hình SHOP thành công."
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Lưu cấu hình thất bại."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          Đang tải quản lý SHOP...
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              XENOVA PLAY
            </div>

            <h1 style={styles.title}>
              QUẢN LÝ SHOP
            </h1>

            <p style={styles.subtitle}>
              Quản lý logo và banner
              hiển thị trên trang SHOP.
            </p>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving
                ? 0.65
                : 1,
            }}
          >
            {saving
              ? "ĐANG LƯU..."
              : "💾 LƯU CẤU HÌNH"}
          </button>
        </div>

        {message && (
          <div
            style={
              styles.successMessage
            }
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            style={
              styles.errorMessage
            }
          >
            ⚠ {error}
          </div>
        )}

        {/* LOGO */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                LOGO SHOP
              </h2>

              <p
                style={
                  styles.cardDescription
                }
              >
                Upload logo trực tiếp từ
                máy. Logo sẽ được dùng
                trên SHOP.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                logoInputRef.current?.click()
              }
              disabled={uploadingLogo}
              style={{
                ...styles.primaryButton,
                opacity: uploadingLogo
                  ? 0.6
                  : 1,
              }}
            >
              {uploadingLogo
                ? "ĐANG UPLOAD..."
                : "📤 TẢI LOGO"}
            </button>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleLogoUpload
              }
              style={{
                display: "none",
              }}
            />
          </div>

          <div
            style={styles.logoPreview}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo XENOVA PLAY"
                style={
                  styles.logoImage
                }
              />
            ) : (
              <div
                style={styles.noLogo}
              >
                CHƯA CÓ LOGO
              </div>
            )}
          </div>
        </section>

        {/* BANNER */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                BANNER SHOP
              </h2>

              <p
                style={
                  styles.cardDescription
                }
              >
                Có thể upload nhiều banner,
                bật/tắt, xoá và sắp xếp
                thứ tự.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                bannerInputRef.current?.click()
              }
              disabled={uploadingBanner}
              style={{
                ...styles.primaryButton,
                opacity:
                  uploadingBanner
                    ? 0.6
                    : 1,
              }}
            >
              {uploadingBanner
                ? "ĐANG UPLOAD..."
                : "📤 TẢI BANNER"}
            </button>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={
                handleBannerUpload
              }
              style={{
                display: "none",
              }}
            />
          </div>

          {!banners.length ? (
            <div
              style={
                styles.emptyBanner
              }
            >
              Chưa có banner nào.
              <br />
              Hãy tải banner lên bằng
              nút phía trên.
            </div>
          ) : (
            <div
              style={
                styles.bannerList
              }
            >
              {banners.map(
                (banner, index) => (
                  <div
                    key={banner.id}
                    style={{
                      ...styles.bannerItem,
                      opacity:
                        banner.enabled
                          ? 1
                          : 0.5,
                    }}
                  >
                    <div
                      style={
                        styles.bannerNumber
                      }
                    >
                      #{index + 1}
                    </div>

                    <div
                      style={
                        styles.bannerImageWrap
                      }
                    >
                      {banner.image_url ? (
                        <img
                          src={
                            banner.image_url
                          }
                          alt={`Banner ${
                            index + 1
                          }`}
                          style={
                            styles.bannerImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.noBanner
                          }
                        >
                          KHÔNG CÓ ẢNH
                        </div>
                      )}
                    </div>

                    <div
                      style={
                        styles.bannerInfo
                      }
                    >
                      <div
                        style={
                          styles.status
                        }
                      >
                        {banner.enabled
                          ? "● ĐANG HIỂN THỊ"
                          : "○ ĐANG TẮT"}
                      </div>

                      <div
                        style={
                          styles.urlText
                        }
                        title={
                          banner.image_url
                        }
                      >
                        {banner.image_url}
                      </div>

                      <div
                        style={
                          styles.actionRow
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            moveBanner(
                              banner.id,
                              "up"
                            )
                          }
                          disabled={
                            index === 0
                          }
                          style={{
                            ...styles.smallButton,
                            opacity:
                              index ===
                              0
                                ? 0.4
                                : 1,
                          }}
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveBanner(
                              banner.id,
                              "down"
                            )
                          }
                          disabled={
                            index ===
                            banners.length -
                              1
                          }
                          style={{
                            ...styles.smallButton,
                            opacity:
                              index ===
                              banners.length -
                                1
                                ? 0.4
                                : 1,
                          }}
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleBanner(
                              banner.id
                            )
                          }
                          style={
                            styles.smallButton
                          }
                        >
                          {banner.enabled
                            ? "Ẩn"
                            : "Hiện"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteBanner(
                              banner.id
                            )
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* PREVIEW */}
        <section style={styles.card}>
          <div
            style={styles.cardHeader}
          >
            <div>
              <h2
                style={styles.cardTitle}
              >
                XEM TRƯỚC
              </h2>

              <p
                style={
                  styles.cardDescription
                }
              >
                Xem nhanh logo và các
                banner đang bật.
              </p>
            </div>
          </div>

          <div
            style={
              styles.previewBox
            }
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo preview"
                style={
                  styles.previewLogo
                }
              />
            ) : (
              <div
                style={
                  styles.previewNoLogo
                }
              >
                XENOVA PLAY
              </div>
            )}

            <div
              style={
                styles.previewBannerList
              }
            >
              {banners
                .filter(
                  (banner) =>
                    banner.enabled &&
                    banner.image_url
                )
                .map(
                  (banner, index) => (
                    <img
                      key={
                        banner.id ||
                        index
                      }
                      src={
                        banner.image_url
                      }
                      alt={`Preview ${
                        index + 1
                      }`}
                      style={
                        styles.previewBanner
                      }
                    />
                  )
                )}

              {!banners.some(
                (banner) =>
                  banner.enabled &&
                  banner.image_url
              ) && (
                <div
                  style={
                    styles.previewEmpty
                  }
                >
                  Chưa có banner đang
                  bật.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #05070c;
        }

        button {
          font-family: inherit;
        }

        @media (max-width: 700px) {
          .admin-shop-container {
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #111827 0%, #05070c 48%, #020307 100%)",
    color: "#fff",
    padding: "24px 14px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "16px",
    background: "#05070c",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.08)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    color: "#a5b4fc",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#94a3b8",
    fontSize: "14px",
  },

  saveButton: {
    border: 0,
    borderRadius: "12px",
    padding: "13px 18px",
    background:
      "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 12px 30px rgba(99,102,241,0.25)",
  },

  successMessage: {
    marginBottom: "16px",
    padding: "13px 15px",
    borderRadius: "12px",
    background:
      "rgba(34,197,94,0.1)",
    border:
      "1px solid rgba(34,197,94,0.25)",
    color: "#86efac",
    fontSize: "14px",
  },

  errorMessage: {
    marginBottom: "16px",
    padding: "13px 15px",
    borderRadius: "12px",
    background:
      "rgba(239,68,68,0.1)",
    border:
      "1px solid rgba(239,68,68,0.25)",
    color: "#fca5a5",
    fontSize: "14px",
  },

  card: {
    background:
      "rgba(15,23,42,0.78)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.25)",
    backdropFilter: "blur(14px)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 900,
  },

  cardDescription: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  primaryButton: {
    border: 0,
    borderRadius: "11px",
    padding: "11px 15px",
    background:
      "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  logoPreview: {
    minHeight: "180px",
    borderRadius: "15px",
    border:
      "1px dashed rgba(255,255,255,0.14)",
    background:
      "rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    overflow: "hidden",
  },

  logoImage: {
    maxWidth: "100%",
    maxHeight: "180px",
    objectFit: "contain",
    display: "block",
  },

  noLogo: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  emptyBanner: {
    textAlign: "center",
    padding: "55px 20px",
    borderRadius: "15px",
    border:
      "1px dashed rgba(255,255,255,0.12)",
    color: "#64748b",
    lineHeight: 1.8,
    fontSize: "14px",
  },

  bannerList: {
    display: "grid",
    gap: "14px",
  },

  bannerItem: {
    display: "grid",
    gridTemplateColumns:
      "45px minmax(180px, 360px) 1fr",
    gap: "14px",
    alignItems: "center",
    padding: "12px",
    borderRadius: "14px",
    background:
      "rgba(2,6,23,0.7)",
    border:
      "1px solid rgba(255,255,255,0.07)",
  },

  bannerNumber: {
    color: "#a5b4fc",
    fontSize: "13px",
    fontWeight: 900,
    textAlign: "center",
  },

  bannerImageWrap: {
    width: "100%",
    aspectRatio: "16 / 6",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#020617",
  },

  bannerImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  noBanner: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
  },

  bannerInfo: {
    minWidth: 0,
  },

  status: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#86efac",
    marginBottom: "7px",
  },

  urlText: {
    color: "#64748b",
    fontSize: "11px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginBottom: "10px",
  },

  actionRow: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  smallButton: {
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(255,255,255,0.06)",
    color: "#fff",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 800,
  },

  deleteButton: {
    border:
      "1px solid rgba(239,68,68,0.25)",
    background:
      "rgba(239,68,68,0.1)",
    color: "#fca5a5",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 800,
  },

  previewBox: {
    borderRadius: "15px",
    background:
      "linear-gradient(180deg, #080b12, #03050a)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    padding: "18px",
    overflow: "hidden",
  },

  previewLogo: {
    display: "block",
    maxWidth: "220px",
    maxHeight: "80px",
    objectFit: "contain",
    margin: "0 auto 18px",
  },

  previewNoLogo: {
    textAlign: "center",
    fontSize: "24px",
    fontWeight: 1000,
    marginBottom: "18px",
    letterSpacing: "1px",
  },

  previewBannerList: {
    display: "grid",
    gap: "12px",
  },

  previewBanner: {
    width: "100%",
    display: "block",
    borderRadius: "12px",
    objectFit: "cover",
  },

  previewEmpty: {
    textAlign: "center",
    color: "#64748b",
    padding: "35px 10px",
    fontSize: "13px",
  },
};
