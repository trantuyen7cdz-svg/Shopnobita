"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminKeysPage() {
  const [products, setProducts] = useState([]);
  const [keys, setKeys] = useState([]);

  const [productId, setProductId] = useState("");
  const [keyText, setKeyText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // LOAD
  // =========================

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        productsResult,
        keysResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,name,price,duration_days,active,is_active"
          )
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("keys")
          .select(
            "id,key_code,product_id,user_id,expires_at,status,order_id,sold_at"
          )
          .order("id", {
            ascending: false,
          }),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (keysResult.error) {
        throw keysResult.error;
      }

      setProducts(
        productsResult.data || []
      );

      setKeys(
        keysResult.data || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Không thể tải kho KEY."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // PRODUCT MAP
  // =========================

  const productMap = useMemo(() => {
    const map = {};

    for (const product of products) {
      map[product.id] = product;
    }

    return map;
  }, [products]);

  // =========================
  // STOCK
  // =========================

  function getAvailableCount(productId) {
    return keys.filter(
      (key) =>
        Number(key.product_id) ===
          Number(productId) &&
        key.status === "available"
    ).length;
  }

  function getSoldCount(productId) {
    return keys.filter(
      (key) =>
        Number(key.product_id) ===
          Number(productId) &&
        key.status === "sold"
    ).length;
  }

  // =========================
  // ADD KEYS
  // =========================

  async function addKeys() {
    if (!productId) {
      setError(
        "Vui lòng chọn sản phẩm."
      );
      return;
    }

    const lines = keyText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError(
        "Vui lòng nhập ít nhất một KEY."
      );
      return;
    }

    // loại bỏ KEY trùng nhau ngay trong nội dung
    const uniqueKeys = [
      ...new Set(lines),
    ];

    try {
      setSaving(true);
      setError("");
      setMessage("");

      // Kiểm tra KEY đã tồn tại
      const { data: existing, error: checkError } =
        await supabase
          .from("keys")
          .select("key_code")
          .in(
            "key_code",
            uniqueKeys
          );

      if (checkError) {
        throw checkError;
      }

      const existingSet = new Set(
        (existing || []).map(
          (item) => item.key_code
        )
      );

      const newKeys =
        uniqueKeys.filter(
          (key) =>
            !existingSet.has(key)
        );

      if (newKeys.length === 0) {
        setError(
          "Toàn bộ KEY bạn nhập đã tồn tại."
        );
        return;
      }

      const rows = newKeys.map(
        (keyCode) => ({
          key_code: keyCode,
          product_id: Number(productId),
          user_id: null,
          expires_at: null,
          status: "available",
          order_id: null,
          sold_at: null,
        })
      );

      const { error: insertError } =
        await supabase
          .from("keys")
          .insert(rows);

      if (insertError) {
        throw insertError;
      }

      setKeyText("");

      setMessage(
        `Đã thêm ${newKeys.length} KEY vào kho.` +
          (newKeys.length !== uniqueKeys.length
            ? ` Bỏ qua ${
                uniqueKeys.length -
                newKeys.length
              } KEY đã tồn tại.`
            : "")
      );

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Không thể thêm KEY."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE AVAILABLE KEY
  // =========================

  async function deleteKey(key) {
    if (key.status !== "available") {
      setError(
        "Không thể xóa KEY đã bán."
      );
      return;
    }

    const ok = window.confirm(
      "Bạn có chắc muốn xóa KEY này khỏi kho?"
    );

    if (!ok) return;

    const { error: deleteError } =
      await supabase
        .from("keys")
        .delete()
        .eq("id", key.id)
        .eq("status", "available");

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage(
      "Đã xóa KEY khỏi kho."
    );

    await loadData();
  }

  // =========================
  // FILTER
  // =========================

  const filteredKeys = useMemo(() => {
    let result = [...keys];

    if (filterProduct !== "all") {
      result = result.filter(
        (key) =>
          Number(key.product_id) ===
          Number(filterProduct)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter(
        (key) =>
          key.status ===
          filterStatus
      );
    }

    const keyword =
      search.trim().toLowerCase();

    if (keyword) {
      result = result.filter(
        (key) => {
          const product =
            productMap[
              key.product_id
            ];

          return (
            String(
              key.key_code || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            String(
              product?.name || ""
            )
              .toLowerCase()
              .includes(keyword)
          );
        }
      );
    }

    return result;
  }, [
    keys,
    filterProduct,
    filterStatus,
    search,
    productMap,
  ]);

  // =========================
  // STATS
  // =========================

  const totalKeys = keys.length;

  const availableKeys =
    keys.filter(
      (key) =>
        key.status === "available"
    ).length;

  const soldKeys =
    keys.filter(
      (key) =>
        key.status === "sold"
    ).length;

  if (loading) {
    return (
      <div className="loading">
        Đang tải kho KEY...
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            X
          </div>

          <div>
            <strong>
              XENOVA
            </strong>

            <small>
              ADMIN
            </small>
          </div>

        </div>

        <nav>

          <a href="/admin">
            🏠 Tổng quan
          </a>

          <a href="/admin/categories">
            📁 Danh mục
          </a>

          <a href="/admin/products">
            🛒 Sản phẩm
          </a>

          <a
            href="/admin/keys"
            className="active"
          >
            🔑 Kho KEY
          </a>

          <a href="/admin/orders">
            📦 Đơn hàng
          </a>

          <a href="/admin/users">
            👥 Người dùng
          </a>

        </nav>

        <a
          href="/shop"
          className="back"
        >
          ← Về cửa hàng
        </a>

      </aside>

      {/* MAIN */}

      <main className="main">

        <div className="header">

          <div>
            <h1>
              Kho KEY
            </h1>

            <p>
              Quản lý KEY theo từng sản phẩm.
            </p>
          </div>

        </div>

        {/* ALERT */}

        {error && (
          <div className="alert error">
            ⚠️ {error}

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="alert success">
            ✓ {message}

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}

        <div className="stats">

          <div className="stat">
            <span>
              TỔNG KEY
            </span>

            <strong>
              {totalKeys}
            </strong>
          </div>

          <div className="stat">
            <span>
              CÒN HÀNG
            </span>

            <strong className="green">
              {availableKeys}
            </strong>
          </div>

          <div className="stat">
            <span>
              ĐÃ BÁN
            </span>

            <strong className="pink">
              {soldKeys}
            </strong>
          </div>

        </div>

        {/* ADD KEY */}

        <section className="panel">

          <div className="panel-title">

            <div>
              <h2>
                ＋ Nhập KEY vào kho
              </h2>

              <p>
                Chọn sản phẩm rồi nhập mỗi KEY
                trên một dòng.
              </p>
            </div>

          </div>

          <div className="form">

            <div className="field">

              <label>
                Sản phẩm
              </label>

              <select
                value={productId}
                onChange={(e) =>
                  setProductId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  -- Chọn sản phẩm --
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                      {" — "}
                      {Number(
                        product.price || 0
                      ).toLocaleString(
                        "vi-VN"
                      )}
                      đ
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="field">

              <label>
                KEY
              </label>

              <textarea
                value={keyText}
                onChange={(e) =>
                  setKeyText(
                    e.target.value
                  )
                }
                placeholder={
                  "KEY-001\nKEY-002\nKEY-003\nKEY-004"
                }
                rows={8}
              />

            </div>

            <button
              className="add-button"
              disabled={saving}
              onClick={addKeys}
            >
              {saving
                ? "ĐANG THÊM..."
                : "＋ THÊM KEY VÀO KHO"}
            </button>

          </div>

        </section>

        {/* PRODUCT STOCK */}

        <section className="panel">

          <div className="panel-title">

            <div>
              <h2>
                Tồn kho theo sản phẩm
              </h2>

              <p>
                Theo dõi nhanh số KEY còn lại.
              </p>
            </div>

          </div>

          <div className="product-stock">

            {products.map(
              (product) => {

                const available =
                  getAvailableCount(
                    product.id
                  );

                const sold =
                  getSoldCount(
                    product.id
                  );

                return (
                  <div
                    className="stock-card"
                    key={product.id}
                  >

                    <div className="stock-card-top">

                      <div className="stock-icon">
                        🔑
                      </div>

                      <div>

                        <strong>
                          {product.name}
                        </strong>

                        <small>
                          ID #{product.id}
                        </small>

                      </div>

                    </div>

                    <div className="stock-numbers">

                      <div>
                        <span>
                          Còn
                        </span>

                        <strong className="green">
                          {available}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Đã bán
                        </span>

                        <strong>
                          {sold}
                        </strong>
                      </div>

                    </div>

                    <button
                      onClick={() => {
                        setProductId(
                          String(
                            product.id
                          )
                        );

                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                    >
                      Nhập KEY
                    </button>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* KEY TABLE */}

        <section className="panel">

          <div className="panel-title">

            <div>
              <h2>
                Danh sách KEY
              </h2>

              <p>
                KEY đã bán vẫn được giữ lại
                để đối chiếu đơn hàng.
              </p>
            </div>

          </div>

          <div className="filters">

            <div className="search">

              🔎

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Tìm KEY..."
              />

            </div>

            <select
              value={filterProduct}
              onChange={(e) =>
                setFilterProduct(
                  e.target.value
                )
              }
            >
              <option value="all">
                Tất cả sản phẩm
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                )
              )}

            </select>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value
                )
              }
            >
              <option value="all">
                Tất cả trạng thái
              </option>

              <option value="available">
                Còn hàng
              </option>

              <option value="sold">
                Đã bán
              </option>
            </select>

          </div>

          <div className="table-wrap">

            <table>

              <thead>
                <tr>
                  <th>
                    KEY
                  </th>

                  <th>
                    Sản phẩm
                  </th>

                  <th>
                    Trạng thái
                  </th>

                  <th>
                    Người mua
                  </th>

                  <th>
                    Thời gian
                  </th>

                  <th>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredKeys.map(
                  (key) => {

                    const product =
                      productMap[
                        key.product_id
                      ];

                    return (
                      <tr
                        key={key.id}
                      >

                        <td>
                          <code>
                            {key.key_code}
                          </code>
                        </td>

                        <td>
                          {product?.name ||
                            `Product #${key.product_id}`}
                        </td>

                        <td>

                          {key.status ===
                          "available" ? (
                            <span className="status available">
                              CÒN HÀNG
                            </span>
                          ) : (
                            <span className="status sold">
                              ĐÃ BÁN
                            </span>
                          )}

                        </td>

                        <td>
                          {key.user_id
                            ? (
                              <span className="user-id">
                                {String(
                                  key.user_id
                                ).slice(
                                  0,
                                  8
                                )}
                                ...
                              </span>
                            )
                            : "—"}
                        </td>

                        <td>
                          {key.sold_at
                            ? new Date(
                                key.sold_at
                              ).toLocaleString(
                                "vi-VN"
                              )
                            : "—"}
                        </td>

                        <td>

                          {key.status ===
                          "available" ? (
                            <button
                              className="delete"
                              onClick={() =>
                                deleteKey(
                                  key
                                )
                              }
                            >
                              Xóa
                            </button>
                          ) : (
                            <span className="locked">
                              Đã bán
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

            {filteredKeys.length ===
              0 && (
              <div className="empty">
                Không tìm thấy KEY.
              </div>
            )}

          </div>

        </section>

      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background: #f5f6fa;
  color: #202124;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
}

/* SIDEBAR */

.sidebar {
  width: 235px;
  min-height: 100vh;
  height: 100vh;
  position: sticky;
  top: 0;
  background: #17151b;
  padding: 20px 13px;
  color: white;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 9px 25px;
}

.brand-icon {
  width: 39px;
  height: 39px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg,#ff4ca8,#8d55ff);
  font-size: 20px;
  font-weight: 900;
}

.brand strong {
  display: block;
  font-size: 15px;
}

.brand small {
  color: #999;
  font-size: 9px;
  letter-spacing: 1px;
}

.sidebar nav {
  display: grid;
  gap: 5px;
}

.sidebar nav a,
.back {
  color: #aaa;
  text-decoration: none;
  padding: 11px 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
}

.sidebar nav a:hover,
.sidebar nav a.active {
  background: #30262e;
  color: #ff67b4;
}

.back {
  margin-top: auto;
  background: #242027;
}

/* MAIN */

.main {
  flex: 1;
  min-width: 0;
  max-width: 1500px;
  padding: 30px;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  font-size: 25px;
}

.header p {
  margin: 6px 0 0;
  color: #888;
  font-size: 13px;
}

/* ALERT */

.alert {
  padding: 12px 14px;
  border-radius: 9px;
  margin-bottom: 14px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.alert button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 17px;
}

.alert.error {
  background: #fff0f0;
  color: #c62828;
}

.alert.success {
  background: #eafff2;
  color: #198754;
}

/* STATS */

.stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.stat {
  background: white;
  border: 1px solid #e9e9ed;
  border-radius: 13px;
  padding: 15px;
}

.stat span {
  color: #999;
  font-size: 10px;
  font-weight: 800;
}

.stat strong {
  display: block;
  margin-top: 5px;
  font-size: 23px;
}

.green {
  color: #159957;
}

.pink {
  color: #e83d94;
}

/* PANEL */

.panel {
  background: white;
  border: 1px solid #e9e9ed;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 18px;
}

.panel-title {
  margin-bottom: 17px;
}

.panel-title h2 {
  margin: 0;
  font-size: 17px;
}

.panel-title p {
  margin: 5px 0 0;
  color: #999;
  font-size: 11px;
}

/* FORM */

.form {
  display: grid;
  gap: 13px;
}

.field {
  display: grid;
  gap: 6px;
}

.field label {
  font-size: 11px;
  font-weight: 800;
}

.field select,
.field textarea,
.search,
.filters select {
  width: 100%;
  border: 1px solid #dddde2;
  border-radius: 9px;
  background: white;
  outline: 0;
}

.field select {
  height: 40px;
  padding: 0 10px;
  font-size: 12px;
}

.field textarea {
  padding: 11px;
  resize: vertical;
  font-family: monospace;
  font-size: 12px;
}

.field select:focus,
.field textarea:focus {
  border-color: #e83d94;
  box-shadow: 0 0 0 3px rgba(232,61,148,.08);
}

.add-button {
  border: 0;
  border-radius: 9px;
  padding: 13px;
  background: linear-gradient(135deg,#e83d94,#b84de1);
  color: white;
  font-weight: 900;
  cursor: pointer;
}

.add-button:disabled {
  opacity: .6;
  cursor: wait;
}

/* STOCK */

.product-stock {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 10px;
}

.stock-card {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 13px;
}

.stock-card-top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.stock-icon {
  width: 37px;
  height: 37px;
  border-radius: 9px;
  background: #fff0f7;
  display: grid;
  place-items: center;
}

.stock-card-top strong {
  display: block;
  font-size: 12px;
}

.stock-card-top small {
  display: block;
  margin-top: 3px;
  color: #aaa;
  font-size: 9px;
}

.stock-numbers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 13px;
}

.stock-numbers div {
  background: #f7f7fa;
  padding: 8px;
  border-radius: 7px;
}

.stock-numbers span {
  display: block;
  color: #999;
  font-size: 9px;
}

.stock-numbers strong {
  display: block;
  margin-top: 2px;
  font-size: 16px;
}

.stock-card button {
  width: 100%;
  border: 1px solid #eee;
  background: white;
  border-radius: 7px;
  padding: 7px;
  margin-top: 9px;
  cursor: pointer;
  color: #e83d94;
  font-size: 10px;
  font-weight: 800;
}

/* FILTER */

.filters {
  display: grid;
  grid-template-columns: 1fr 200px 170px;
  gap: 8px;
  margin-bottom: 14px;
}

.search {
  height: 39px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 7px;
}

.search input {
  border: 0;
  outline: 0;
  width: 100%;
  font-size: 11px;
}

.filters select {
  padding: 0 9px;
  font-size: 11px;
}

/* TABLE */

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

th {
  text-align: left;
  color: #999;
  font-size: 9px;
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
}

td {
  padding: 11px 8px;
  font-size: 10px;
  border-bottom: 1px solid #f1f1f3;
}

code {
  background: #f4f4f7;
  padding: 5px 7px;
  border-radius: 6px;
  color: #444;
  font-size: 10px;
}

.status {
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 8px;
  font-weight: 900;
}

.status.available {
  background: #e8fff1;
  color: #159957;
}

.status.sold {
  background: #fff0f7;
  color: #d52e83;
}

.user-id {
  color: #888;
  font-family: monospace;
}

.delete {
  border: 0;
  background: #fff0f0;
  color: #d33;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 9px;
}

.locked {
  color: #bbb;
  font-size: 9px;
}

.empty {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 12px;
}

/* LOADING */

.loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #888;
  background: #f5f6fa;
  font-family: Arial, sans-serif;
}

/* MOBILE */

@media (max-width: 900px) {
  .page {
    display: block;
  }

  .sidebar {
    width: 100%;
    height: auto;
    min-height: auto;
    position: relative;
  }

  .sidebar nav {
    display: flex;
    overflow-x: auto;
  }

  .sidebar nav a {
    white-space: nowrap;
  }

  .back {
    margin-top: 12px;
  }

  .main {
    padding: 15px;
  }

  .product-stock {
    grid-template-columns: 1fr;
  }

  .filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 550px) {
  .stats {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 14px;
  }
}
`;
