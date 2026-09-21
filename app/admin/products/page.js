"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const BUCKET = "product-media";

function formatPrice(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function getCategoryName(categories, id) {
  const category = categories.find(
    (item) => Number(item.id) === Number(id)
  );

  return category?.name || "Chưa chọn";
}

export default function AdminProductsPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [mediaType, setMediaType] = useState("image");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [keysText, setKeysText] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [categoryResult, productResult] =
        await Promise.all([
          supabase
            .from("product_categories")
            .select("*")
            .order("id", { ascending: true }),

          supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false }),
        ]);

      if (categoryResult.error) {
        throw categoryResult.error;
      }

      if (productResult.error) {
        throw productResult.error;
      }

      setCategories(categoryResult.data || []);
      setProducts(productResult.data || []);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Không thể tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const parents = useMemo(() => {
    return categories.filter(
      (category) =>
        category.parent_id === null ||
        category.parent_id === undefined
    );
  }, [categories]);

  const children = useMemo(() => {
    return categories.filter(
      (category) =>
        category.parent_id !== null &&
        category.parent_id !== undefined
    );
  }, [categories]);

  async function uploadFile(file, folder) {
    if (!file) return null;

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "bin";

    const random =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const path = `products/${folder}/${random}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || undefined,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return data?.publicUrl || null;
  }

  async function createProduct(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!categoryId) {
      setError("Vui lòng chọn danh mục.");
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("Giá sản phẩm không hợp lệ.");
      return;
    }

    const numericDuration = Number(durationDays || 0);

    if (
      !Number.isFinite(numericDuration) ||
      numericDuration < 0
    ) {
      setError("Thời hạn không hợp lệ.");
      return;
    }

    if (
      (mediaType === "image" || mediaType === "both") &&
      !imageFile
    ) {
      setError("Vui lòng chọn ảnh sản phẩm.");
      return;
    }

    if (
      (mediaType === "video" || mediaType === "both") &&
      !videoFile
    ) {
      setError("Vui lòng chọn video sản phẩm.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = null;
      let videoUrl = null;

      if (
        imageFile &&
        (mediaType === "image" || mediaType === "both")
      ) {
        imageUrl = await uploadFile(
          imageFile,
          "images"
        );
      }

      if (
        videoFile &&
        (mediaType === "video" || mediaType === "both")
      ) {
        videoUrl = await uploadFile(
          videoFile,
          "videos"
        );
      }

      const { data: product, error: productError } =
        await supabase
          .from("products")
          .insert({
            name: cleanName,
            description:
              cleanDescription || null,
            price: Math.round(numericPrice),
            duration_days:
              Math.round(numericDuration),
            active: true,
            is_active: true,
            category_id: Number(categoryId),
            media_type: mediaType,
            demo_image_url: imageUrl,
            video_url: videoUrl,
          })
          .select("*")
          .single();

      if (productError) {
        throw productError;
      }

      /*
       * Mỗi dòng trong ô key = một key.
       * Không bắt buộc nhập key khi tạo sản phẩm.
       */
      const keyLines = keysText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (keyLines.length > 0) {
        const uniqueKeys = [
          ...new Set(keyLines),
        ];

        const rows = uniqueKeys.map((keyCode) => ({
          key_code: keyCode,
          product_id: product.id,
          status: "available",
        }));

        const { error: keysError } =
          await supabase
            .from("keys")
            .insert(rows);

        if (keysError) {
          console.error(keysError);

          setMessage(
            "Đã tạo sản phẩm nhưng thêm key thất bại. Hãy kiểm tra mục Quản lý Key."
          );
        } else {
          setMessage(
            `Đã tạo sản phẩm và thêm ${rows.length} key.`
          );
        }
      } else {
        setMessage(
          "Đã tạo sản phẩm thành công."
        );
      }

      setName("");
      setDescription("");
      setPrice("");
      setDurationDays("");
      setCategoryId("");
      setMediaType("image");
      setImageFile(null);
      setVideoFile(null);
      setKeysText("");

      const imageInput =
        document.getElementById("product-image");

      const videoInput =
        document.getElementById("product-video");

      if (imageInput) imageInput.value = "";
      if (videoInput) videoInput.value = "";

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Không thể tạo sản phẩm."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product) {
    setMessage("");
    setError("");

    const newStatus =
      product.active === false ? true : false;

    const { error: updateError } =
      await supabase
        .from("products")
        .update({
          active: newStatus,
          is_active: newStatus,
        })
        .eq("id", product.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
  }

  async function deleteProduct(product) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `Xóa sản phẩm "${product.name}"?`
    );

    if (!confirmed) return;

    const { count } = await supabase
      .from("keys")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("product_id", product.id);

    if (Number(count || 0) > 0) {
      setError(
        "Không thể xóa sản phẩm đang có key. Hãy quản lý key trước."
      );
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Đã xóa sản phẩm.");

    await loadData();
  }

  return (
    <div className="page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f7fb;
          color: #292631;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        .page {
          min-height: 100vh;
          padding: 25px;
        }

        .container {
          max-width: 1250px;
          margin: auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .title {
          margin: 0;
          font-size: 25px;
          font-weight: 950;
        }

        .subtitle {
          color: #9995a2;
          font-size: 12px;
          margin-top: 4px;
        }

        .back {
          border: 1px solid #e7e7ee;
          background: white;
          color: #696571;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .layout {
          display: grid;
          grid-template-columns: 390px minmax(0, 1fr);
          gap: 18px;
        }

        .card {
          background: white;
          border: 1px solid #e9e9f0;
          border-radius: 17px;
          padding: 18px;
        }

        .card-title {
          margin: 0 0 16px;
          font-size: 15px;
          font-weight: 950;
        }

        .field {
          margin-bottom: 13px;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          color: #686470;
          font-size: 11px;
          font-weight: 850;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #e4e4eb;
          background: #fafafd;
          color: #35313b;
          border-radius: 10px;
          padding: 10px 11px;
          outline: none;
          font-size: 12px;
        }

        textarea {
          resize: vertical;
          min-height: 75px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #e7a5cc;
          background: white;
        }

        .media-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .media-option {
          border: 1px solid #e5e5ec;
          background: #fafafd;
          color: #777380;
          padding: 9px 5px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        .media-option.active {
          border-color: #efacd1;
          background: #fff0f8;
          color: #dc328d;
        }

        .file-note {
          color: #aaa6b0;
          font-size: 9px;
          margin-top: 5px;
        }

        .create {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #ec3a97,
            #a83fe5
          );
          color: white;
          padding: 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .create:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .notice {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #effaf2;
          color: #34824c;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.5;
        }

        .error {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #fff0f3;
          color: #c34867;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.5;
        }

        .products {
          display: grid;
          gap: 9px;
        }

        .product {
          border: 1px solid #ebebf0;
          border-radius: 13px;
          padding: 11px;
          display: grid;
          grid-template-columns: 75px minmax(0, 1fr) auto;
          gap: 11px;
          align-items: center;
        }

        .thumb {
          width: 75px;
          height: 62px;
          border-radius: 9px;
          overflow: hidden;
          background: #f8edf6;
          display: grid;
          place-items: center;
          color: #d9a2c5;
        }

        .thumb img,
        .thumb video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-name {
          font-size: 12px;
          font-weight: 950;
        }

        .category {
          color: #d9388f;
          font-size: 9px;
          font-weight: 850;
          margin-top: 3px;
        }

        .description {
          color: #98949f;
          font-size: 9px;
          margin-top: 3px;
        }

        .price {
          color: #df318f;
          font-size: 13px;
          font-weight: 950;
          margin-top: 4px;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .small {
          border: 0;
          border-radius: 8px;
          padding: 7px 8px;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
        }

        .active {
          background: #eaf9ef;
          color: #37814c;
        }

        .inactive {
          background: #f0f0f3;
          color: #8f8c96;
        }

        .danger {
          background: #fff0f3;
          color: #d24968;
        }

        .empty {
          text-align: center;
          padding: 40px 20px;
          color: #9995a1;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .page {
            padding: 14px;
          }

          .layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 550px) {
          .product {
            grid-template-columns: 60px minmax(0, 1fr);
          }

          .thumb {
            width: 60px;
            height: 55px;
          }

          .actions {
            grid-column: 1 / -1;
            justify-content: flex-end;
          }

          .header {
            align-items: flex-start;
          }

          .title {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div>
            <h1 className="title">
              Quản lý sản phẩm
            </h1>

            <div className="subtitle">
              XENOVA PLAY • Sản phẩm + Media + Key
            </div>
          </div>

          <button
            className="back"
            onClick={() => {
              window.location.href = "/admin";
            }}
          >
            ← Admin
          </button>
        </div>

        <div className="layout">
          <section className="card">
            <h2 className="card-title">
              Thêm sản phẩm
            </h2>

            <form onSubmit={createProduct}>
              <div className="field">
                <label className="label">
                  Tên sản phẩm
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Ví dụ: KEY 1 NGÀY"
                />
              </div>

              <div className="field">
                <label className="label">
                  Mô tả
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="HSD 24 giờ..."
                />
              </div>

              <div className="field">
                <label className="label">
                  Danh mục
                </label>

                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(e.target.value)
                  }
                >
                  <option value="">
                    — Chọn danh mục —
                  </option>

                  {parents.map((parent) => {
                    const childCategories =
                      children.filter(
                        (child) =>
                          Number(child.parent_id) ===
                          Number(parent.id)
                      );

                    return (
                      <optgroup
                        key={parent.id}
                        label={parent.name}
                      >
                        {childCategories.length > 0
                          ? childCategories.map(
                              (child) => (
                                <option
                                  key={child.id}
                                  value={child.id}
                                >
                                  {child.name}
                                </option>
                              )
                            )
                          : (
                            <option
                              value={parent.id}
                            >
                              {parent.name}
                            </option>
                          )}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 9,
                }}
              >
                <div className="field">
                  <label className="label">
                    Giá bán
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value)
                    }
                    placeholder="10000"
                  />
                </div>

                <div className="field">
                  <label className="label">
                    HSD (ngày)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={durationDays}
                    onChange={(e) =>
                      setDurationDays(e.target.value)
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">
                  Loại media
                </label>

                <div className="media-options">
                  <button
                    type="button"
                    className={`media-option ${
                      mediaType === "image"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setMediaType("image")
                    }
                  >
                    Ảnh
                  </button>

                  <button
                    type="button"
                    className={`media-option ${
                      mediaType === "video"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setMediaType("video")
                    }
                  >
                    Video
                  </button>

                  <button
                    type="button"
                    className={`media-option ${
                      mediaType === "both"
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setMediaType("both")
                    }
                  >
                    Cả hai
                  </button>
                </div>
              </div>

              {(mediaType === "image" ||
                mediaType === "both") && (
                <div className="field">
                  <label className="label">
                    Ảnh sản phẩm
                  </label>

                  <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImageFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />

                  <div className="file-note">
                    PNG, JPG, WEBP...
                  </div>
                </div>
              )}

              {(mediaType === "video" ||
                mediaType === "both") && (
                <div className="field">
                  <label className="label">
                    Video sản phẩm
                  </label>

                  <input
                    id="product-video"
                    type="file"
                    accept="video/*"
                    onChange={(e) =>
                      setVideoFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />

                  <div className="file-note">
                    MP4, WEBM...
                  </div>
                </div>
              )}

              <div className="field">
                <label className="label">
                  Key sản phẩm
                </label>

                <textarea
                  value={keysText}
                  onChange={(e) =>
                    setKeysText(e.target.value)
                  }
                  placeholder={
                    "Mỗi dòng một key\nKEY-ABC-123\nKEY-XYZ-456"
                  }
                />

                <div className="file-note">
                  Có thể bỏ trống và thêm key sau.
                </div>
              </div>

              <button
                className="create"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Đang tạo sản phẩm..."
                  : "Tạo sản phẩm"}
              </button>
            </form>

            {message && (
              <div className="notice">
                {message}
              </div>
            )}

            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">
              Danh sách sản phẩm
            </h2>

            {loading ? (
              <div className="empty">
                Đang tải...
              </div>
            ) : products.length === 0 ? (
              <div className="empty">
                Chưa có sản phẩm.
              </div>
            ) : (
              <div className="products">
                {products.map((product) => (
                  <div
                    className="product"
                    key={product.id}
                  >
                    <div className="thumb">
                      {product.demo_image_url ? (
                        <img
                          src={
                            product.demo_image_url
                          }
                          alt=""
                        />
                      ) : product.video_url ? (
                        <video
                          src={product.video_url}
                          muted
                          playsInline
                        />
                      ) : (
                        <span>MEDIA</span>
                      )}
                    </div>

                    <div>
                      <div className="product-name">
                        {product.name}
                      </div>

                      <div className="category">
                        {getCategoryName(
                          categories,
                          product.category_id
                        )}
                      </div>

                      <div className="description">
                        {product.description ||
                          "Không có mô tả"}
                      </div>

                      <div className="price">
                        {formatPrice(
                          product.price
                        )}
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        className={`small ${
                          product.active !== false
                            ? "active"
                            : "inactive"
                        }`}
                        onClick={() =>
                          toggleProduct(product)
                        }
                      >
                        {product.active !== false
                          ? "Đang bán"
                          : "Đã tắt"}
                      </button>

                      <button
                        className="small danger"
                        onClick={() =>
                          deleteProduct(product)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
