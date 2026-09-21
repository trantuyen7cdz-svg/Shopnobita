"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ZALO_ADMIN = "https://zalo.me/84365717262";

const DEFAULT_SETTINGS = {
  logo_url: "",
  shop_badge: "",
  shop_title: "",
  shop_description: "",
  banners: [],
};

function formatPrice(value) {
  return (
    new Intl.NumberFormat("vi-VN").format(
      Number(value || 0)
    ) + "đ"
  );
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getProductImage(product) {
  return (
    product?.demo_image_url ||
    product?.image_url ||
    "/placeholder-product.png"
  );
}

function getCategoryImage(category) {
  return (
    category?.image_url ||
    category?.demo_image_url ||
    ""
  );
}

export default function ShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockMap, setStockMap] = useState({});

  const [wallet, setWallet] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  const [selectedParent, setSelectedParent] =
    useState(null);

  const [selectedChild, setSelectedChild] =
    useState(null);

  const [view, setView] = useState("parents");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  const [buyModal, setBuyModal] = useState(null);
  const [successModal, setSuccessModal] =
    useState(null);

  const [buying, setBuying] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  /* =========================
     USER
  ========================= */

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user || null);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user || null);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================
     SHOP SETTINGS
  ========================= */

  async function loadSettings() {
    try {
      const response = await fetch(
        "/api/shop/settings",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (!data?.success) return;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(data.settings || {}),
        logo_url: String(
          data.settings?.logo_url || ""
        ),
        banners: Array.isArray(
          data.settings?.banners
        )
          ? data.settings.banners
          : [],
      });
    } catch (err) {
      console.error(
        "SHOP SETTINGS ERROR:",
        err
      );
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  /* =========================
     BANNER
  ========================= */

  const activeBanners = useMemo(() => {
    const banners = Array.isArray(
      settings.banners
    )
      ? settings.banners
      : [];

    return banners
      .filter(
        (banner) =>
          banner &&
          banner.image_url &&
          banner.enabled !== false
      )
      .sort(
        (a, b) =>
          Number(a.order || 0) -
          Number(b.order || 0)
      );
  }, [settings.banners]);

  useEffect(() => {
    setBannerIndex(0);
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((current) => {
        return (
          (current + 1) %
          activeBanners.length
        );
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [activeBanners.length]);

  function previousBanner() {
    if (activeBanners.length <= 1) return;

    setBannerIndex((current) => {
      return (
        (current -
          1 +
          activeBanners.length) %
        activeBanners.length
      );
    });
  }

  function nextBanner() {
    if (activeBanners.length <= 1) return;

    setBannerIndex(
      (current) =>
        (current + 1) %
        activeBanners.length
    );
  }

  /* =========================
     LOAD SHOP
  ========================= */

  async function loadShop() {
    try {
      setLoading(true);
      setError("");

      const [
        catalogResponse,
        stockResponse,
      ] = await Promise.all([
        fetch("/api/shop/catalog", {
          cache: "no-store",
        }),

        fetch("/api/shop/stock", {
          cache: "no-store",
        }),
      ]);

      const catalog =
        await catalogResponse.json();

      const stock =
        await stockResponse.json();

      if (
        !catalogResponse.ok ||
        !catalog.success
      ) {
        throw new Error(
          catalog.error ||
            "Không tải được cửa hàng."
        );
      }

      setCategories(
        catalog.categories || []
      );

      setProducts(
        catalog.products || []
      );

      if (stock?.success) {
        setStockMap(
          stock.stock ||
            stock.stockMap ||
            {}
        );
      } else {
        setStockMap({});
      }
    } catch (err) {
      console.error(
        "LOAD SHOP ERROR:",
        err
      );

      setError(
        err.message ||
          "Không thể tải cửa hàng."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShop();
  }, []);

  /* =========================
     WALLET
  ========================= */

  useEffect(() => {
    if (!user) {
      setWallet(0);
      return;
    }

    let mounted = true;

    async function loadWallet() {
      const {
        data,
        error,
      } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error(
          "WALLET ERROR:",
          error
        );

        setWallet(0);
        return;
      }

      setWallet(
        Number(data?.balance || 0)
      );
    }

    loadWallet();

    return () => {
      mounted = false;
    };
  }, [user]);

  /* =========================
     CATEGORY
  ========================= */

  const parentCategories =
    useMemo(() => {
      return categories.filter(
        (category) =>
          category.parent_id === null ||
          category.parent_id ===
            undefined
      );
    }, [categories]);

  function getChildren(parentId) {
    return categories.filter(
      (category) =>
        Number(category.parent_id) ===
        Number(parentId)
    );
  }

  function getProductsByCategory(
    categoryId
  ) {
    return products.filter(
      (product) =>
        Number(product.category_id) ===
        Number(categoryId)
    );
  }

  function getParentProductCount(
    parentId
  ) {
    const children =
      getChildren(parentId);

    const ids = [
      Number(parentId),
      ...children.map((item) =>
        Number(item.id)
      ),
    ];

    return products.filter((product) =>
      ids.includes(
        Number(product.category_id)
      )
    ).length;
  }

  function openParent(parent) {
    setSelectedParent(parent);
    setSelectedChild(null);
    setSearch("");

    const children =
      getChildren(parent.id);

    if (children.length) {
      setView("children");
    } else {
      setView("products");
    }
  }

  function openChild(child) {
    setSelectedChild(child);
    setSearch("");
    setView("products");
  }

  function goHome() {
    setSelectedParent(null);
    setSelectedChild(null);
    setView("parents");
    setSearch("");
  }

  function goParent() {
    if (!selectedParent) {
      goHome();
      return;
    }

    setSelectedChild(null);
    setSearch("");

    const children =
      getChildren(
        selectedParent.id
      );

    setView(
      children.length
        ? "children"
        : "products"
    );
  }

  /* =========================
     STOCK
  ========================= */

  function getStock(productId) {
    const value =
      stockMap?.[productId] ??
      stockMap?.[String(productId)] ??
      null;

    if (
      value === null ||
      value === undefined
    ) {
      return 0;
    }

    if (
      typeof value === "object"
    ) {
      return Number(
        value.available || 0
      );
    }

    return Number(value || 0);
  }

  /* =========================
     FILTER
  ========================= */

  const filteredProducts =
    useMemo(() => {
      let result = [...products];

      if (selectedChild) {
        result = result.filter(
          (product) =>
            Number(
              product.category_id
            ) ===
            Number(
              selectedChild.id
            )
        );
      } else if (selectedParent) {
        const children =
          getChildren(
            selectedParent.id
          );

        const ids = [
          Number(
            selectedParent.id
          ),
          ...children.map((item) =>
            Number(item.id)
          ),
        ];

        result = result.filter(
          (product) =>
            ids.includes(
              Number(
                product.category_id
              )
            )
        );
      }

      const keyword =
        normalize(search);

      if (keyword) {
        result = result.filter(
          (product) =>
            normalize(
              product.name
            ).includes(keyword) ||
            normalize(
              product.description
            ).includes(keyword)
        );
      }

      if (sort === "price-asc") {
        result.sort(
          (a, b) =>
            Number(a.price || 0) -
            Number(b.price || 0)
        );
      }

      if (sort === "price-desc") {
        result.sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        );
      }

      if (sort === "name") {
        result.sort(
          (a, b) =>
            String(
              a.name || ""
            ).localeCompare(
              String(
                b.name || ""
              ),
              "vi"
            )
        );
      }

      return result;
    }, [
      products,
      categories,
      selectedParent,
      selectedChild,
      search,
      sort,
    ]);

  /* =========================
     MEDIA
  ========================= */

  function ProductMedia({ product }) {
    if (
      product?.media_type ===
        "video" &&
      product?.video_url
    ) {
      return (
        <video
          src={product.video_url}
          className="product-media"
          muted
          loop
          playsInline
          autoPlay
        />
      );
    }

    return (
      <img
        src={getProductImage(product)}
        alt={
          product?.name ||
          "Product"
        }
        className="product-media"
      />
    );
  }

  function CategoryMedia({
    category,
  }) {
    const image =
      getCategoryImage(category);

    const video =
      category?.video_url;

    if (video) {
      return (
        <div className="category-media">
          <video
            src={video}
            muted
            loop
            playsInline
            autoPlay
          />

          <span className="video-badge">
            ▶ VIDEO
          </span>
        </div>
      );
    }

    if (image) {
      return (
        <div className="category-media">
          <img
            src={image}
            alt={
              category?.name ||
              "Category"
            }
          />
        </div>
      );
    }

    return (
      <div className="category-media empty-media">
        📁
      </div>
    );
  }

  /* =========================
     BUY
  ========================= */

  async function handleBuy() {
    if (!buyModal) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const stock =
      getStock(buyModal.id);

    if (stock <= 0) {
      setMessage(
        "Sản phẩm hiện đã hết hàng."
      );
      return;
    }

    if (
      wallet <
      Number(
        buyModal.price || 0
      )
    ) {
      setMessage(
        "Số dư không đủ. Vui lòng nạp tiền."
      );
      return;
    }

    try {
      setBuying(true);
      setMessage("");

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response =
        await fetch(
          "/api/buy-key",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              productId:
                Number(
                  buyModal.id
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Không thể mua sản phẩm."
        );
      }

      const key =
        data?.key ||
        data?.key_code ||
        data?.data?.key ||
        data?.data?.key_code ||
        "";

      setBuyModal(null);

      setSuccessModal({
        product: buyModal,
        key,
      });

      await loadShop();

      const {
        data: walletData,
      } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      setWallet(
        Number(
          walletData?.balance || 0
        )
      );
    } catch (err) {
      console.error(
        "BUY ERROR:",
        err
      );

      setMessage(
        err.message ||
          "Mua sản phẩm thất bại."
      );
    } finally {
      setBuying(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <>
        <div className="loading">
          <div className="spinner" />

          <p>
            Đang tải cửa hàng...
          </p>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  return (
    <main className="page">

      {/* HOA HỒNG RƠI */}
      <div className="petals">
        {Array.from({
          length: 30,
        }).map((_, index) => (
          <span
            key={index}
            className="petal"
            style={{
              left:
                `${(index * 37) % 100}%`,
              animationDuration:
                `${7 + (index % 7)}s`,
              animationDelay:
                `${-(index % 9)}s`,
              width:
                `${7 + (index % 5)}px`,
              height:
                `${10 + (index % 6)}px`,
            }}
          />
        ))}
      </div>

      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-inner">

          <button
            className="logo"
            onClick={() =>
              router.push("/")
            }
          >
            {settings.logo_url ? (
              <img
                src={
                  settings.logo_url
                }
                alt="XENOVA PLAY"
                className="logo-image"
              />
            ) : (
              <span className="logo-icon">
                X
              </span>
            )}

            <span className="logo-text">
              XENOVA
              <small>
                PLAY
              </small>
            </span>
          </button>

          <nav className="nav">
            <button
              onClick={() =>
                router.push("/")
              }
            >
              Trang chủ
            </button>

            <button className="active">
              Cửa hàng
            </button>

            <button
              onClick={() =>
                router.push("/keys")
              }
            >
              Kho KEY
            </button>

            <button
              onClick={() =>
                router.push("/orders")
              }
            >
              Đơn hàng
            </button>
          </nav>

          <div className="account">
            {user ? (
              <button
                className="account-button"
                onClick={() =>
                  router.push(
                    "/account"
                  )
                }
              >
                👤 Tài khoản
              </button>
            ) : (
              <button
                className="account-button"
                onClick={() =>
                  router.push(
                    "/login"
                  )
                }
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BANNER */}
      {activeBanners.length > 0 && (
        <section className="banner-section">
          <div className="banner">

            <img
              key={
                activeBanners[
                  bannerIndex
                ]?.id ||
                bannerIndex
              }
              src={
                activeBanners[
                  bannerIndex
                ]?.image_url
              }
              alt="XENOVA PLAY"
              className="banner-image"
            />

            {activeBanners.length >
              1 && (
              <>
                <button
                  className="banner-arrow left"
                  onClick={
                    previousBanner
                  }
                  aria-label="Banner trước"
                >
                  ‹
                </button>

                <button
                  className="banner-arrow right"
                  onClick={
                    nextBanner
                  }
                  aria-label="Banner tiếp"
                >
                  ›
                </button>

                <div className="dots">
                  {activeBanners.map(
                    (_, index) => (
                      <button
                        key={index}
                        className={
                          index ===
                          bannerIndex
                            ? "dot active"
                            : "dot"
                        }
                        onClick={() =>
                          setBannerIndex(
                            index
                          )
                        }
                        aria-label={`Banner ${index + 1}`}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="container">

        {/* BREADCRUMB */}
        {view !== "parents" && (
          <div className="breadcrumb">

            <button
              onClick={goHome}
            >
              Cửa hàng
            </button>

            {selectedParent && (
              <>
                <span>›</span>

                <button
                  onClick={
                    goParent
                  }
                >
                  {
                    selectedParent.name
                  }
                </button>
              </>
            )}

            {selectedChild && (
              <>
                <span>›</span>

                <strong>
                  {
                    selectedChild.name
                  }
                </strong>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {message && (
          <div className="message">
            <span>
              {message}
            </span>

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* DANH MỤC CHA */}
        {view === "parents" && (
          <>
            {parentCategories.length ===
            0 ? (
              <Empty
                icon="📁"
                title="Chưa có danh mục"
                text="Admin chưa tạo thư mục sản phẩm."
              />
            ) : (
              <div className="category-grid">
                {parentCategories.map(
                  (parent) => (
                    <button
                      key={
                        parent.id
                      }
                      className="category-card"
                      onClick={() =>
                        openParent(
                          parent
                        )
                      }
                    >
                      <CategoryMedia
                        category={
                          parent
                        }
                      />

                      <div className="category-body">
                        <div className="category-title">
                          <h3>
                            {
                              parent.name
                            }
                          </h3>

                          <span>
                            →
                          </span>
                        </div>

                        <p>
                          {parent.description ||
                            "Xem các sản phẩm trong danh mục này."}
                        </p>

                        <div className="meta">
                          🛒{" "}
                          {
                            getParentProductCount(
                              parent.id
                            )
                          }{" "}
                          sản phẩm
                        </div>

                        <div className="view">
                          XEM TẤT CẢ →
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* DANH MỤC CON */}
        {view === "children" &&
          selectedParent && (
            <>
              <div className="heading">
                <div>
                  <button
                    className="back"
                    onClick={
                      goHome
                    }
                  >
                    ← QUAY LẠI
                  </button>

                  <h2>
                    {
                      selectedParent.name
                    }
                  </h2>
                </div>

                <span className="count">
                  {
                    getChildren(
                      selectedParent.id
                    ).length
                  }{" "}
                  thư mục con
                </span>
              </div>

              <div className="category-grid">
                {getChildren(
                  selectedParent.id
                ).map((child) => (
                  <button
                    key={
                      child.id
                    }
                    className="category-card"
                    onClick={() =>
                      openChild(
                        child
                      )
                    }
                  >
                    <CategoryMedia
                      category={
                        child
                      }
                    />

                    <div className="category-body">
                      <div className="category-title">
                        <h3>
                          {
                            child.name
                          }
                        </h3>

                        <span>
                          →
                        </span>
                      </div>

                      <p>
                        {child.description ||
                          "Xem sản phẩm trong thư mục này."}
                      </p>

                      <div className="meta">
                        🛒{" "}
                        {
                          getProductsByCategory(
                            child.id
                          ).length
                        }{" "}
                        sản phẩm
                      </div>

                      <div className="view">
                        XEM SẢN PHẨM →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

        {/* SẢN PHẨM */}
        {view === "products" && (
          <>
            <div className="products-heading">
              <div>
                <button
                  className="back"
                  onClick={
                    selectedChild
                      ? goParent
                      : goHome
                  }
                >
                  ← QUAY LẠI
                </button>

                <h2>
                  {selectedChild
                    ? selectedChild.name
                    : selectedParent?.name ||
                      "Sản phẩm"}
                </h2>

                <p>
                  Chọn sản phẩm để
                  mua KEY.
                </p>
              </div>

              <div className="tools">
                <div className="search">
                  🔎

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Tìm sản phẩm..."
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value
                    )
                  }
                >
                  <option value="default">
                    Mặc định
                  </option>

                  <option value="price-asc">
                    Giá thấp → cao
                  </option>

                  <option value="price-desc">
                    Giá cao → thấp
                  </option>

                  <option value="name">
                    Tên A → Z
                  </option>
                </select>
              </div>
            </div>

            {filteredProducts.length ===
            0 ? (
              <Empty
                icon="🛒"
                title="Chưa có sản phẩm"
                text="Danh mục này hiện chưa có sản phẩm."
              />
            ) : (
              <div className="product-grid">
                {filteredProducts.map(
                  (product) => {
                    const stock =
                      getStock(
                        product.id
                      );

                    return (
                      <div
                        key={
                          product.id
                        }
                        className="product-card"
                      >
                        <div className="cover">
                          <ProductMedia
                            product={
                              product
                            }
                          />

                          <span
                            className={
                              stock > 0
                                ? "stock available"
                                : "stock soldout"
                            }
                          >
                            {stock > 0
                              ? `Còn ${stock}`
                              : "HẾT HÀNG"}
                          </span>
                        </div>

                        <div className="product-body">
                          <span className="product-category">
                            {
                              selectedChild?.name ||
                              product.category
                                ?.name ||
                              ""
                            }
                          </span>

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          <p className="description">
                            {product.description ||
                              "Sản phẩm XENOVA PLAY."}
                          </p>

                          {product.duration_days && (
                            <div className="duration">
                              ⏱{" "}
                              Thời hạn:{" "}
                              {
                                product.duration_days
                              }{" "}
                              ngày
                            </div>
                          )}

                          <div className="product-bottom">
                            <strong className="price">
                              {formatPrice(
                                product.price
                              )}
                            </strong>

                            <button
                              className="buy"
                              disabled={
                                stock <= 0
                              }
                              onClick={() => {
                                setMessage(
                                  ""
                                );

                                setBuyModal(
                                  product
                                );
                              }}
                            >
                              {stock > 0
                                ? "MUA NGAY"
                                : "HẾT HÀNG"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ZALO */}
      <a
        href={ZALO_ADMIN}
        className="zalo"
        onClick={(event) => {
          event.preventDefault();

          window.location.href =
            ZALO_ADMIN;
        }}
      >
        💬
        <span>
          Liên hệ Admin
        </span>
      </a>

      {/* MODAL MUA */}
      {buyModal && (
        <div className="overlay">
          <div className="modal">

            <button
              className="close"
              onClick={() =>
                setBuyModal(null)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              🛒
            </div>

            <h2>
              Xác nhận mua
            </h2>

            <p className="modal-product">
              {
                buyModal.name
              }
            </p>

            <InfoRow
              label="Giá"
              value={formatPrice(
                buyModal.price
              )}
            />

            <InfoRow
              label="Số dư"
              value={formatPrice(
                wallet
              )}
            />

            <InfoRow
              label="Sau khi mua"
              value={formatPrice(
                Math.max(
                  0,
                  wallet -
                    Number(
                      buyModal.price ||
                        0
                    )
                )
              )}
            />

            <div className="modal-actions">
              <button
                className="cancel"
                disabled={buying}
                onClick={() =>
                  setBuyModal(null)
                }
              >
                Hủy
              </button>

              <button
                className="confirm"
                disabled={buying}
                onClick={
                  handleBuy
                }
              >
                {buying
                  ? "ĐANG XỬ LÝ..."
                  : "XÁC NHẬN MUA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÀNH CÔNG */}
      {successModal && (
        <div className="overlay">
          <div className="modal">

            <div className="success">
              ✓
            </div>

            <h2>
              Mua hàng thành công
            </h2>

            <p className="modal-product">
              {
                successModal
                  .product?.name
              }
            </p>

            {successModal.key && (
              <div className="key-box">
                <span>
                  KEY CỦA BẠN
                </span>

                <strong>
                  {
                    successModal.key
                  }
                </strong>

                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      successModal.key
                    )
                  }
                >
                  📋 Sao chép
                </button>
              </div>
            )}

            <button
              className="confirm full"
              onClick={() =>
                setSuccessModal(
                  null
                )
              }
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* KHÔNG CÒN BOTTOM-TOOLBAR Ở FILE NÀY.
          Thanh dưới được quản lý bởi Menu.js */}

      <style jsx>{styles}</style>
    </main>
  );
}

function Empty({
  icon,
  title,
  text,
}) {
  return (
    <div className="empty">
      <div>{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="info-row">
      <span>{label}</span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% 5%,
      rgba(255,80,170,.12),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(130,80,255,.10),
      transparent 28%
    ),
    #f7f8fc;
  color: #222;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
  padding-bottom: 90px;
}

/* =========================
   HOA HỒNG
========================= */

.petals {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 80;
}

.petal {
  position: absolute;
  top: -30px;
  border-radius:
    75% 25% 70% 30%;
  background:
    linear-gradient(
      135deg,
      #ff5a91,
      #d71955
    );
  opacity: .45;
  animation:
    fall linear infinite;
}

@keyframes fall {
  0% {
    transform:
      translateY(-50px)
      rotate(0deg);
    opacity: 0;
  }

  10% {
    opacity: .5;
  }

  50% {
    transform:
      translateY(55vh)
      translateX(-35px)
      rotate(220deg);
  }

  100% {
    transform:
      translateY(110vh)
      translateX(30px)
      rotate(400deg);
    opacity: 0;
  }
}

/* =========================
   TOPBAR
========================= */

.topbar {
  height: 64px;
  background:
    rgba(255,255,255,.96);
  border-bottom:
    1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter:
    blur(15px);
}

.topbar-inner {
  max-width: 1220px;
  height: 100%;
  margin: auto;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 15px;
}

.logo {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  color: #151515;
  font-size: 18px;
  font-weight: 900;
}

.logo-image {
  width: 42px;
  height: 42px;
  object-fit: contain;
  border-radius: 10px;
}

.logo-icon {
  width: 35px;
  height: 35px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(
      135deg,
      #ff4ba6,
      #8d54ff
    );
  color: white;
  box-shadow:
    0 8px 20px
    rgba(232,61,148,.25);
}

.logo-text small {
  color: #e83d94;
  margin-left: 4px;
  font-size: 11px;
}

.nav {
  display: flex;
  gap: 4px;
}

.nav button {
  border: 0;
  background: transparent;
  padding: 10px 13px;
  border-radius: 9px;
  cursor: pointer;
  color: #666;
  font-weight: 700;
}

.nav button:hover,
.nav button.active {
  color: #e83d94;
  background: #fff0f7;
}

.account {
  display: flex;
  gap: 7px;
}

.account-button {
  border: 0;
  border-radius: 9px;
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 700;
  color: white;
  background: #222;
}

/* =========================
   BANNER
========================= */

.banner-section {
  padding:
    12px 18px 4px;
}

.banner {
  max-width: 1220px;
  margin: auto;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  aspect-ratio: 1200 / 380;
  background: #eee;
  box-shadow:
    0 18px 50px
    rgba(30,20,50,.14);
}

.banner-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  animation:
    bannerFade .4s ease;
}

@keyframes bannerFade {
  from {
    opacity: .4;
    transform: scale(1.02);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.banner-arrow {
  position: absolute;
  top: 50%;
  transform:
    translateY(-50%);
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255,255,255,.88);
  color: #e83d94;
  font-size: 29px;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    0 5px 18px
    rgba(0,0,0,.12);
  transition:
    transform .15s,
    background .15s;
}

.banner-arrow:hover {
  background: white;
  transform:
    translateY(-50%)
    scale(1.06);
}

.banner-arrow.left {
  left: 14px;
}

.banner-arrow.right {
  right: 14px;
}

.dots {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform:
    translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 999px;
  background:
    rgba(0,0,0,.28);
}

.dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255,255,255,.55);
  cursor: pointer;
  transition:
    width .2s,
    background .2s;
}

.dot.active {
  width: 21px;
  border-radius: 999px;
  background: white;
}

/* =========================
   CONTENT
========================= */

.container {
  max-width: 1220px;
  margin: auto;
  padding: 14px 18px 25px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: #999;
  font-size: 13px;
}

.breadcrumb button {
  border: 0;
  background: transparent;
  padding: 0;
  color: #777;
  cursor: pointer;
}

.breadcrumb strong {
  color: #e83d94;
}

.heading,
.products-heading {
  display: flex;
  justify-content:
    space-between;
  align-items: flex-end;
  gap: 15px;
  margin-bottom: 18px;
}

.eyebrow {
  color: #e83d94;
  font-size: 10px;
  font-weight: 900;
}

.heading h2,
.products-heading h2 {
  margin: 6px 0 0;
  font-size: 23px;
}

.heading p,
.products-heading p {
  margin: 5px 0 0;
  color: #999;
  font-size: 12px;
}

.count {
  background: white;
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 8px 12px;
  color: #e83d94;
  font-size: 11px;
  font-weight: 900;
}

.back {
  border: 0;
  background: transparent;
  padding: 0;
  color: #e83d94;
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
}

/* =========================
   CATEGORY
========================= */

.category-grid {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 18px;
}

.category-card {
  padding: 0;
  overflow: hidden;
  border:
    1px solid #eee;
  border-radius: 18px;
  background: white;
  text-align: left;
  cursor: pointer;
  transition:
    transform .2s,
    box-shadow .2s;
}

.category-card:hover {
  transform:
    translateY(-4px);
  box-shadow:
    0 18px 45px
    rgba(40,20,60,.10);
}

.category-media {
  height: 190px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(
      135deg,
      #f7edf4,
      #eeeafd
    );
}

.category-media img,
.category-media video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.empty-media {
  display: grid;
  place-items: center;
  font-size: 50px;
}

.video-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 5px 8px;
  border-radius: 7px;
  color: white;
  background:
    rgba(0,0,0,.65);
  font-size: 9px;
  font-weight: 900;
}

.category-body {
  padding: 15px;
}

.category-title {
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 10px;
}

.category-title h3 {
  margin: 0;
  font-size: 17px;
  color: #222;
}

.category-title span {
  width: 31px;
  height: 31px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff0f7;
  color: #e83d94;
  font-weight: 900;
}

.category-body p {
  margin: 7px 0;
  color: #888;
  font-size: 11px;
  line-height: 1.5;
}

.meta {
  display: inline-block;
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 7px;
  background: #f7f7fa;
  color: #888;
  font-size: 9px;
  font-weight: 800;
}

.view {
  margin-top: 13px;
  color: #e83d94;
  font-size: 10px;
  font-weight: 900;
}

/* =========================
   PRODUCTS
========================= */

.tools {
  display: flex;
  gap: 8px;
}

.search {
  width: 220px;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border:
    1px solid #eee;
  border-radius: 9px;
  background: white;
}

.search input {
  width: 100%;
  border: 0;
  outline: 0;
  font-size: 12px;
}

.tools select {
  border:
    1px solid #eee;
  background: white;
  border-radius: 9px;
  padding: 0 10px;
  outline: 0;
}

.product-grid {
  display: grid;
  grid-template-columns:
    repeat(4,minmax(0,1fr));
  gap: 14px;
}

.product-card {
  overflow: hidden;
  background: white;
  border:
    1px solid #eee;
  border-radius: 13px;
  transition:
    transform .18s,
    box-shadow .18s;
}

.product-card:hover {
  transform:
    translateY(-3px);
  box-shadow:
    0 15px 35px
    rgba(40,20,60,.10);
}

.cover {
  height: 150px;
  position: relative;
  overflow: hidden;
  background: #eee;
}

.product-media {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.stock {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
}

.available {
  background: white;
  color: #20a35b;
}

.soldout {
  background: #222;
  color: white;
}

.product-body {
  padding: 11px;
}

.product-category {
  color: #e83d94;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
}

.product-body h3 {
  margin: 5px 0 0;
  font-size: 14px;
}

.description {
  margin: 6px 0;
  min-height: 28px;
  color: #888;
  font-size: 10px;
  line-height: 1.45;
}

.duration {
  color: #888;
  font-size: 10px;
}

.product-bottom {
  margin-top: 11px;
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 7px;
}

.price {
  color: #e52f8d;
  font-size: 15px;
}

.buy {
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: #e83d94;
  color: white;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
}

.buy:disabled {
  background: #bbb;
  cursor: not-allowed;
}

/* =========================
   EMPTY / MESSAGE
========================= */

.empty {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border:
    1px solid #eee;
  border-radius: 14px;
  background: white;
  color: #999;
  text-align: center;
}

.empty > div {
  font-size: 42px;
}

.empty h3 {
  margin: 10px 0 4px;
  color: #555;
}

.empty p {
  margin: 0;
  font-size: 12px;
}

.error,
.message {
  margin-bottom: 13px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
}

.error {
  background: #fff0f0;
  color: #c33;
}

.message {
  display: flex;
  justify-content:
    space-between;
  background: #fff4d9;
  color: #8a6200;
}

.message button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* =========================
   ZALO
========================= */

.zalo {
  position: fixed;
  right: 18px;
  bottom: 84px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 15px;
  border-radius: 999px;
  background: #e83d94;
  color: white;
  text-decoration: none;
  font-size: 12px;
  font-weight: 900;
  box-shadow:
    0 8px 25px
    rgba(232,61,148,.3);
}

/* =========================
   MODAL
========================= */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background:
    rgba(20,15,25,.55);
  backdrop-filter:
    blur(5px);
}

.modal {
  width:
    min(420px,100%);
  position: relative;
  padding: 25px;
  border-radius: 18px;
  background: white;
  box-shadow:
    0 30px 80px
    rgba(0,0,0,.25);
}

.close {
  position: absolute;
  right: 15px;
  top: 13px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: #f4f4f4;
  cursor: pointer;
  font-size: 18px;
}

.modal-icon,
.success {
  width: 55px;
  height: 55px;
  margin: auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #fff0f7;
  font-size: 25px;
}

.success {
  background: #e9fff1;
  color: #19a758;
  font-weight: 900;
}

.modal h2 {
  text-align: center;
  margin: 13px 0 5px;
}

.modal-product {
  text-align: center;
  color: #e83d94;
  font-weight: 800;
}

.info-row {
  display: flex;
  justify-content:
    space-between;
  padding: 11px 0;
  border-bottom:
    1px solid #eee;
  font-size: 13px;
}

.info-row strong {
  color: #e83d94;
}

.modal-actions {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 8px;
  margin-top: 18px;
}

.cancel,
.confirm {
  border: 0;
  border-radius: 9px;
  padding: 11px;
  cursor: pointer;
  font-weight: 900;
}

.cancel {
  background: #eee;
}

.confirm {
  background: #e83d94;
  color: white;
}

.confirm:disabled {
  opacity: .6;
}

.full {
  width: 100%;
  margin-top: 15px;
}

.key-box {
  margin-top: 15px;
  padding: 14px;
  border-radius: 10px;
  background: #f7f7fa;
  text-align: center;
}

.key-box span {
  display: block;
  color: #999;
  font-size: 10px;
  margin-bottom: 7px;
}

.key-box strong {
  display: block;
  color: #e83d94;
  word-break: break-all;
  font-size: 15px;
}

.key-box button {
  margin-top: 10px;
  border:
    1px solid #eee;
  background: white;
  border-radius: 7px;
  padding: 7px 10px;
  cursor: pointer;
}

/* =========================
   LOADING
========================= */

.loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  background: #f7f8fc;
  color: #888;
}

.spinner {
  width: 40px;
  height: 40px;
  border:
    4px solid #eee;
  border-top-color:
    #e83d94;
  border-radius: 50%;
  animation:
    spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 1050px) {
  .product-grid {
    grid-template-columns:
      repeat(3,minmax(0,1fr));
  }

  .nav {
    display: none;
  }
}

@media (max-width: 760px) {

  .topbar {
    height: 58px;
  }

  .topbar-inner {
    padding: 0 11px;
  }

  .account-button {
    display: none;
  }

  .banner-section {
    padding:
      8px 10px 2px;
  }

  .banner {
    aspect-ratio: 1200 / 430;
    border-radius: 13px;
  }

  .banner-arrow {
    width: 31px;
    height: 31px;
    font-size: 24px;
  }

  .container {
    padding:
      10px 12px 25px;
  }

  .category-grid {
    gap: 9px;
  }

  .category-media {
    height: 125px;
  }

  .category-body {
    padding: 10px;
  }

  .category-title h3 {
    font-size: 12px;
  }

  .category-body p {
    font-size: 9px;
  }

  .products-heading {
    display: block;
  }

  .tools {
    margin-top: 10px;
    display: grid;
    grid-template-columns:
      1fr 125px;
  }

  .search {
    width: 100%;
  }

  .product-grid {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap: 9px;
  }

  .cover {
    height: 125px;
  }

  .product-body {
    padding: 9px;
  }

  .product-body h3 {
    font-size: 12px;
  }

  .price {
    font-size: 13px;
  }

  .buy {
    padding: 7px;
  }

  .zalo {
    right: 12px;
    bottom: 78px;
  }

  .zalo span {
    display: none;
  }
}

@media (max-width: 390px) {

  .category-grid,
  .product-grid {
    gap: 7px;
  }

  .category-media {
    height: 105px;
  }

  .cover {
    height: 110px;
  }

  .price {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .petal,
  .banner-image,
  .spinner {
    animation: none !important;
  }
}
`;
