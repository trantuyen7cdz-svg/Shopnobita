"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const BUCKET = "product-media";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const [mediaType, setMediaType] = useState("image");
  const [mediaFile, setMediaFile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingCategory, setEditingCategory] = useState(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] =
    useState("");
  const [editParentId, setEditParentId] =
    useState("");

  const [editMediaType, setEditMediaType] =
    useState("image");
  const [editMediaFile, setEditMediaFile] =
    useState(null);

  /*
  ==================================================
  LOAD CATEGORY
  ==================================================
  */

  async function loadCategories() {
    setLoading(true);
    setError("");

    const { data, error: loadError } =
      await supabase
        .from("product_categories")
        .select("*")
        .order("id", {
          ascending: true,
        });

    if (loadError) {
      console.error(loadError);

      setError(loadError.message);
      setCategories([]);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  /*
  ==================================================
  PARENT
  ==================================================
  */

  const parents = useMemo(() => {
    return categories.filter(
      (category) =>
        category.parent_id === null ||
        category.parent_id === undefined
    );
  }, [categories]);

  /*
  ==================================================
  CHILDREN
  ==================================================
  */

  const childrenByParent = useMemo(() => {
    const result = {};

    categories.forEach((category) => {
      if (
        category.parent_id !== null &&
        category.parent_id !== undefined
      ) {
        const id = Number(
          category.parent_id
        );

        if (!result[id]) {
          result[id] = [];
        }

        result[id].push(category);
      }
    });

    return result;
  }, [categories]);

  /*
  ==================================================
  FORMAT FILE
  ==================================================
  */

  function getExtension(file) {
    if (!file?.name) {
      return "bin";
    }

    const parts =
      file.name.split(".");

    return (
      parts[parts.length - 1]
        ?.toLowerCase() || "bin"
    );
  }

  /*
  ==================================================
  UPLOAD CATEGORY MEDIA
  ==================================================
  */

  async function uploadCategoryMedia(
    file,
    categoryName
  ) {
    if (!file) {
      return null;
    }

    const extension =
      getExtension(file);

    const safeName =
      String(categoryName || "category")
        .toLowerCase()
        .replace(
          /[^a-z0-9-_]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        ) || "category";

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

    const path =
      `categories/${safeName}/${fileName}`;

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
      throw uploadError;
    }

    const {
      data: publicData,
    } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return {
      url:
        publicData?.publicUrl ||
        "",
      path,
    };
  }

  /*
  ==================================================
  CREATE CATEGORY
  ==================================================
  */

  async function createCategory(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanName =
      name.trim();

    const cleanDescription =
      description.trim();

    if (!cleanName) {
      setError(
        "Vui lòng nhập tên danh mục."
      );
      return;
    }

    if (
      parentId &&
      !parents.some(
        (parent) =>
          Number(parent.id) ===
          Number(parentId)
      )
    ) {
      setError(
        "Danh mục cha không hợp lệ."
      );
      return;
    }

    setSaving(true);

    try {
      let imageUrl = null;
      let videoUrl = null;

      /*
      ------------------------------------------
      UPLOAD MEDIA
      ------------------------------------------
      */

      if (mediaFile) {
        setUploading(true);

        const uploaded =
          await uploadCategoryMedia(
            mediaFile,
            cleanName
          );

        setUploading(false);

        if (mediaType === "video") {
          videoUrl =
            uploaded?.url || null;
        } else {
          imageUrl =
            uploaded?.url || null;
        }
      }

      /*
      ------------------------------------------
      INSERT
      ------------------------------------------
      */

      const payload = {
        name: cleanName,

        description:
          cleanDescription || null,

        active: true,

        parent_id: parentId
          ? Number(parentId)
          : null,

        media_type:
          mediaType || "image",

        image_url:
          imageUrl,

        demo_image_url:
          imageUrl,

        video_url:
          videoUrl,
      };

      const {
        error: insertError,
      } = await supabase
        .from("product_categories")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      /*
      ------------------------------------------
      RESET
      ------------------------------------------
      */

      setName("");
      setDescription("");
      setParentId("");
      setMediaType("image");
      setMediaFile(null);

      const input =
        document.getElementById(
          "category-media-input"
        );

      if (input) {
        input.value = "";
      }

      setMessage(
        parentId
          ? "Đã tạo thư mục con thành công."
          : "Đã tạo thư mục mẹ thành công."
      );

      await loadCategories();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể tạo danh mục."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  /*
  ==================================================
  EDIT CATEGORY
  ==================================================
  */

  function openEdit(category) {
    setMessage("");
    setError("");

    setEditingCategory(
      category
    );

    setEditName(
      category.name || ""
    );

    setEditDescription(
      category.description || ""
    );

    setEditParentId(
      category.parent_id
        ? String(category.parent_id)
        : ""
    );

    setEditMediaType(
      category.media_type ||
        (category.video_url
          ? "video"
          : "image")
    );

    setEditMediaFile(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeEdit() {
    setEditingCategory(null);
    setEditName("");
    setEditDescription("");
    setEditParentId("");
    setEditMediaType("image");
    setEditMediaFile(null);

    const input =
      document.getElementById(
        "edit-category-media-input"
      );

    if (input) {
      input.value = "";
    }
  }

  /*
  ==================================================
  UPDATE CATEGORY
  ==================================================
  */

  async function updateCategory(
    event
  ) {
    event.preventDefault();

    if (!editingCategory) {
      return;
    }

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const cleanName =
        editName.trim();

      const cleanDescription =
        editDescription.trim();

      if (!cleanName) {
        throw new Error(
          "Vui lòng nhập tên danh mục."
        );
      }

      const categoryId =
        Number(
          editingCategory.id
        );

      /*
      ------------------------------------------
      KHÔNG CHO CATEGORY LÀM CON CỦA CHÍNH NÓ
      ------------------------------------------
      */

      if (
        editParentId &&
        Number(editParentId) ===
          categoryId
      ) {
        throw new Error(
          "Không thể chọn chính danh mục này làm danh mục cha."
        );
      }

      /*
      ------------------------------------------
      CATEGORY MẸ KHÔNG ĐƯỢC ĐỔI THÀNH CON
      CỦA CHÍNH NÓ
      ------------------------------------------
      */

      let imageUrl =
        editingCategory.image_url ||
        editingCategory.demo_image_url ||
        null;

      let videoUrl =
        editingCategory.video_url ||
        null;

      /*
      ------------------------------------------
      XÓA MEDIA CŨ KHI CHỌN MEDIA MỚI
      ------------------------------------------
      */

      if (editMediaFile) {
        setUploading(true);

        const uploaded =
          await uploadCategoryMedia(
            editMediaFile,
            cleanName
          );

        setUploading(false);

        if (
          editMediaType ===
          "video"
        ) {
          videoUrl =
            uploaded?.url || null;

          imageUrl = null;
        } else {
          imageUrl =
            uploaded?.url || null;

          videoUrl = null;
        }
      } else {
        /*
        ----------------------------------------
        NẾU ĐỔI LOẠI MEDIA
        ----------------------------------------
        */

        if (
          editMediaType ===
            "video" &&
          !videoUrl
        ) {
          imageUrl = null;
        }

        if (
          editMediaType ===
            "image" &&
          !imageUrl
        ) {
          videoUrl = null;
        }
      }

      /*
      ------------------------------------------
      UPDATE
      ------------------------------------------
      */

      const payload = {
        name: cleanName,

        description:
          cleanDescription ||
          null,

        media_type:
          editMediaType ||
          "image",

        image_url:
          imageUrl,

        demo_image_url:
          imageUrl,

        video_url:
          videoUrl,
      };

      /*
      ------------------------------------------
      PARENT_ID
      ------------------------------------------

      Nếu đang sửa category mẹ thì
      giữ nó là category mẹ.

      Nếu đang sửa category con thì
      cho phép đổi sang category mẹ khác.
      ------------------------------------------
      */

      const isCurrentlyParent =
        editingCategory.parent_id ===
          null ||
        editingCategory.parent_id ===
          undefined;

      if (isCurrentlyParent) {
        payload.parent_id = null;
      } else {
        payload.parent_id =
          editParentId
            ? Number(editParentId)
            : null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("product_categories")
        .update(payload)
        .eq("id", categoryId);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Đã cập nhật danh mục."
      );

      closeEdit();

      await loadCategories();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Không thể cập nhật danh mục."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  /*
  ==================================================
  DELETE MEDIA
  ==================================================
  */

  async function removeMedia(
    category
  ) {
    setMessage("");
    setError("");

    const confirmed =
      window.confirm(
        `Xóa media của "${category.name}"?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("product_categories")
      .update({
        media_type: "image",
        image_url: null,
        demo_image_url: null,
        video_url: null,
      })
      .eq("id", category.id);

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    setMessage(
      "Đã xóa media."
    );

    await loadCategories();
  }

  /*
  ==================================================
  TOGGLE CATEGORY
  ==================================================
  */

  async function toggleCategory(
    category
  ) {
    setMessage("");
    setError("");

    const {
      error: updateError,
    } = await supabase
      .from("product_categories")
      .update({
        active:
          !category.active,
      })
      .eq("id", category.id);

    if (updateError) {
      setError(
        updateError.message
      );
      return;
    }

    await loadCategories();
  }

  /*
  ==================================================
  DELETE CATEGORY
  ==================================================
  */

  async function deleteCategory(
    category
  ) {
    setMessage("");
    setError("");

    const children =
      childrenByParent[
        Number(category.id)
      ] || [];

    if (children.length > 0) {
      setError(
        "Không thể xóa thư mục mẹ khi vẫn còn thư mục con."
      );
      return;
    }

    const {
      count,
      error: countError,
    } = await supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "category_id",
        category.id
      );

    if (countError) {
      setError(
        countError.message
      );
      return;
    }

    if (
      Number(count || 0) > 0
    ) {
      setError(
        "Danh mục này đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa "${category.name}"?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("product_categories")
      .delete()
      .eq(
        "id",
        category.id
      );

    if (deleteError) {
      setError(
        deleteError.message
      );
      return;
    }

    setMessage(
      "Đã xóa danh mục."
    );

    await loadCategories();
  }

  /*
  ==================================================
  MEDIA PREVIEW
  ==================================================
  */

  function CategoryMedia({
    category,
  }) {
    const type =
      category.media_type ||
      (category.video_url
        ? "video"
        : "image");

    const image =
      category.image_url ||
      category.demo_image_url;

    if (
      type === "video" &&
      category.video_url
    ) {
      return (
        <video
          src={
            category.video_url
          }
          className="media-preview"
          muted
          loop
          playsInline
          autoPlay
        />
      );
    }

    if (image) {
      return (
        <img
          src={image}
          alt={
            category.name
          }
          className="media-preview"
        />
      );
    }

    return (
      <div className="media-empty">
        <span>📁</span>
        <small>
          Chưa có media
        </small>
      </div>
    );
  }

  /*
  ==================================================
  RENDER
  ==================================================
  */

  return (
    <div className="admin-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f7fb;
          color: #282530;
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

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .admin-page {
          min-height: 100vh;
          padding: 25px;
        }

        .admin-container {
          max-width: 1200px;
          margin: auto;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .admin-title {
          margin: 0;
          font-size: 25px;
          font-weight: 950;
        }

        .admin-subtitle {
          color: #96929e;
          font-size: 12px;
          margin-top: 4px;
        }

        .back-button {
          border: 1px solid #e8e8ef;
          background: white;
          color: #686470;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .layout {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .card {
          background: white;
          border: 1px solid #e9e9f0;
          border-radius: 17px;
          padding: 18px;
        }

        .card-title {
          margin: 0 0 15px;
          font-size: 15px;
          font-weight: 950;
        }

        .field {
          margin-bottom: 13px;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 850;
          color: #686470;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #e4e4eb;
          border-radius: 10px;
          outline: none;
          background: #fafafd;
          color: #35313b;
          padding: 10px 11px;
          font-size: 12px;
        }

        textarea {
          resize: vertical;
          min-height: 85px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #e6a4ca;
          background: white;
        }

        .media-select {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .media-option {
          border: 1px solid #e4e4eb;
          background: #fafafd;
          border-radius: 10px;
          padding: 10px;
          text-align: center;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .media-option.active {
          border-color: #d94d9c;
          background: #fff1f8;
          color: #c13c87;
        }

        .file-input {
          padding: 8px;
          background: white;
        }

        .file-name {
          margin-top: 6px;
          color: #898591;
          font-size: 10px;
          word-break: break-all;
        }

        .save-button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #ec3b97,
            #a83fe6
          );
          color: white;
          padding: 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .cancel-button {
          width: 100%;
          border: 1px solid #e4e4eb;
          border-radius: 10px;
          background: white;
          color: #696572;
          padding: 10px;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          margin-top: 7px;
        }

        .message {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #effaf2;
          color: #34814b;
          font-size: 11px;
          font-weight: 700;
        }

        .error {
          margin-top: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #fff0f3;
          color: #c44766;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.5;
        }

        .tree {
          display: grid;
          gap: 10px;
        }

        .parent {
          border: 1px solid #ececf2;
          border-radius: 13px;
          overflow: hidden;
        }

        .parent-head {
          padding: 12px;
          background: #fff7fb;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 130px;
          gap: 12px;
          align-items: center;
        }

        .parent-info {
          min-width: 0;
        }

        .parent-name {
          font-size: 13px;
          font-weight: 950;
          word-break: break-word;
        }

        .parent-id {
          color: #aaa6b1;
          font-size: 9px;
          margin-top: 3px;
        }

        .parent-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 5px;
        }

        .children {
          padding: 8px;
          display: grid;
          gap: 8px;
        }

        .child {
          padding: 10px;
          border-radius: 9px;
          background: #fafafd;
          display: grid;
          grid-template-columns: 55px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .child-info {
          min-width: 0;
        }

        .child-name {
          font-size: 12px;
          font-weight: 750;
          word-break: break-word;
        }

        .actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 5px;
        }

        .small-button {
          border: 0;
          border-radius: 7px;
          padding: 6px 8px;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }

        .on {
          background: #eaf9ef;
          color: #3d8953;
        }

        .off {
          background: #f1f1f4;
          color: #92909a;
        }

        .edit {
          background: #f0ecff;
          color: #7351c8;
        }

        .delete {
          background: #fff0f2;
          color: #d44c68;
        }

        .media-box {
          width: 55px;
          height: 55px;
          border-radius: 10px;
          overflow: hidden;
          background: #f0f0f5;
          flex-shrink: 0;
        }

        .media-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .media-empty {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #aaa6b1;
          gap: 2px;
        }

        .media-empty span {
          font-size: 18px;
        }

        .media-empty small {
          font-size: 7px;
        }

        .edit-box {
          margin-bottom: 18px;
          border: 1px solid #e7d9ee;
          background: #fffaff;
        }

        .edit-title {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 15px;
        }

        .edit-title strong {
          font-size: 14px;
        }

        .close-edit {
          border: 0;
          background: #f3eef5;
          color: #77717d;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 900;
        }

        .edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .current-media {
          margin-bottom: 12px;
        }

        .current-media-label {
          font-size: 10px;
          font-weight: 800;
          color: #77717d;
          margin-bottom: 6px;
        }

        .current-media-preview {
          width: 100%;
          max-width: 180px;
          height: 100px;
          object-fit: cover;
          border-radius: 10px;
          background: #eeeef3;
        }

        .remove-media {
          display: block;
          margin-top: 6px;
          border: 0;
          background: #fff0f2;
          color: #d44c68;
          padding: 7px 9px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
        }

        .empty {
          padding: 30px;
          text-align: center;
          color: #9b98a3;
          font-size: 12px;
        }

        .stats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 7px;
        }

        .stat {
          padding: 4px 7px;
          border-radius: 6px;
          background: #f2f1f5;
          color: #88838f;
          font-size: 8px;
          font-weight: 750;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .admin-page {
            padding: 14px;
          }

          .admin-header {
            align-items: flex-start;
          }

          .admin-title {
            font-size: 21px;
          }

          .parent-head {
            grid-template-columns: 1fr;
          }

          .parent-actions {
            justify-content: flex-start;
          }

          .child {
            grid-template-columns: 48px minmax(0, 1fr);
          }

          .child .actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }

          .media-box {
            width: 48px;
            height: 48px;
          }

          .edit-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="admin-container">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              Quản lý danh mục
            </h1>

            <div className="admin-subtitle">
              XENOVA PLAY • Thư mục mẹ → thư mục con
            </div>
          </div>

          <button
            className="back-button"
            onClick={() => {
              window.location.href =
                "/admin";
            }}
          >
            ← Admin
          </button>
        </div>

        <div className="layout">

          {/* ====================================
              LEFT
          ==================================== */}

          <div>

            {/* ==================================
                EDIT
            ================================== */}

            {editingCategory && (
              <section className="card edit-box">

                <div className="edit-title">
                  <strong>
                    Chỉnh sửa:{" "}
                    {editingCategory.name}
                  </strong>

                  <button
                    className="close-edit"
                    onClick={closeEdit}
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={
                    updateCategory
                  }
                >

                  <div className="edit-grid">

                    <div className="field">
                      <label className="label">
                        Tên danh mục
                      </label>

                      <input
                        value={
                          editName
                        }
                        onChange={(event) =>
                          setEditName(
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">
                        Danh mục cha
                      </label>

                      {editingCategory.parent_id ===
                      null ? (
                        <input
                          value="— Đây là thư mục mẹ —"
                          disabled
                        />
                      ) : (
                        <select
                          value={
                            editParentId
                          }
                          onChange={(event) =>
                            setEditParentId(
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            — Không có cha —
                          </option>

                          {parents
                            .filter(
                              (parent) =>
                                Number(
                                  parent.id
                                ) !==
                                Number(
                                  editingCategory.id
                                )
                            )
                            .map(
                              (parent) => (
                                <option
                                  key={
                                    parent.id
                                  }
                                  value={
                                    parent.id
                                  }
                                >
                                  {
                                    parent.name
                                  }
                                </option>
                              )
                            )}
                        </select>
                      )}
                    </div>

                  </div>

                  <div className="field">
                    <label className="label">
                      Mô tả
                    </label>

                    <textarea
                      value={
                        editDescription
                      }
                      onChange={(event) =>
                        setEditDescription(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label className="label">
                      Media mới
                    </label>

                    <div className="media-select">

                      <button
                        type="button"
                        className={`media-option ${
                          editMediaType ===
                          "image"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setEditMediaType(
                            "image"
                          )
                        }
                      >
                        🖼 ẢNH
                      </button>

                      <button
                        type="button"
                        className={`media-option ${
                          editMediaType ===
                          "video"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setEditMediaType(
                            "video"
                          )
                        }
                      >
                        🎬 VIDEO
                      </button>

                    </div>
                  </div>

                  <div className="field">
                    <input
                      id="edit-category-media-input"
                      className="file-input"
                      type="file"
                      accept={
                        editMediaType ===
                        "video"
                          ? "video/*"
                          : "image/*"
                      }
                      onChange={(event) =>
                        setEditMediaFile(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                    />

                    {editMediaFile && (
                      <div className="file-name">
                        File mới:{" "}
                        {
                          editMediaFile.name
                        }
                      </div>
                    )}
                  </div>

                  {(
                    editingCategory.image_url ||
                    editingCategory.demo_image_url ||
                    editingCategory.video_url
                  ) && (
                    <div className="current-media">

                      <div className="current-media-label">
                        Media hiện tại
                      </div>

                      {editingCategory.video_url ? (
                        <video
                          src={
                            editingCategory.video_url
                          }
                          className="current-media-preview"
                          muted
                          controls
                          playsInline
                        />
                      ) : (
                        <img
                          src={
                            editingCategory.image_url ||
                            editingCategory.demo_image_url
                          }
                          alt={
                            editingCategory.name
                          }
                          className="current-media-preview"
                        />
                      )}

                      <button
                        type="button"
                        className="remove-media"
                        onClick={() =>
                          removeMedia(
                            editingCategory
                          )
                        }
                      >
                        Xóa media hiện tại
                      </button>

                    </div>
                  )}

                  <button
                    className="save-button"
                    disabled={
                      saving ||
                      uploading
                    }
                    type="submit"
                  >
                    {uploading
                      ? "Đang upload..."
                      : saving
                      ? "Đang lưu..."
                      : "Lưu thay đổi"}
                  </button>

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={
                      closeEdit
                    }
                  >
                    Hủy
                  </button>

                </form>
              </section>
            )}

            {/* ==================================
                CREATE
            ================================== */}

            <section className="card">

              <h2 className="card-title">
                Tạo thư mục
              </h2>

              <form
                onSubmit={
                  createCategory
                }
              >

                <div className="field">
                  <label className="label">
                    Tên thư mục
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Ví dụ: ANDROID"
                  />
                </div>

                <div className="field">
                  <label className="label">
                    Mô tả
                  </label>

                  <textarea
                    value={
                      description
                    }
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Mô tả thư mục..."
                  />
                </div>

                <div className="field">
                  <label className="label">
                    Thư mục mẹ
                  </label>

                  <select
                    value={parentId}
                    onChange={(event) =>
                      setParentId(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      — Tạo thư mục mẹ —
                    </option>

                    {parents.map(
                      (parent) => (
                        <option
                          key={
                            parent.id
                          }
                          value={
                            parent.id
                          }
                        >
                          {parent.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="field">
                  <label className="label">
                    Media
                  </label>

                  <div className="media-select">

                    <button
                      type="button"
                      className={`media-option ${
                        mediaType ===
                        "image"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setMediaType(
                          "image"
                        )
                      }
                    >
                      🖼 ẢNH
                    </button>

                    <button
                      type="button"
                      className={`media-option ${
                        mediaType ===
                        "video"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setMediaType(
                          "video"
                        )
                      }
                    >
                      🎬 VIDEO
                    </button>

                  </div>
                </div>

                <div className="field">

                  <input
                    id="category-media-input"
                    className="file-input"
                    type="file"
                    accept={
                      mediaType ===
                      "video"
                        ? "video/*"
                        : "image/*"
                    }
                    onChange={(event) =>
                      setMediaFile(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                  />

                  {mediaFile && (
                    <div className="file-name">
                      Đã chọn:{" "}
                      {mediaFile.name}
                    </div>
                  )}

                </div>

                <button
                  className="save-button"
                  disabled={
                    saving ||
                    uploading
                  }
                  type="submit"
                >
                  {uploading
                    ? "Đang upload..."
                    : saving
                    ? "Đang tạo..."
                    : parentId
                    ? "Tạo thư mục con"
                    : "Tạo thư mục mẹ"}
                </button>

              </form>

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

            </section>
          </div>

          {/* ====================================
              RIGHT
          ==================================== */}

          <section className="card">

            <h2 className="card-title">
              Cây thư mục
            </h2>

            {loading ? (
              <div className="empty">
                Đang tải...
              </div>
            ) : parents.length ===
              0 ? (
              <div className="empty">
                Chưa có thư mục mẹ.
              </div>
            ) : (
              <div className="tree">

                {parents.map(
                  (parent) => {
                    const children =
                      childrenByParent[
                        Number(
                          parent.id
                        )
                      ] || [];

                    return (
                      <div
                        className="parent"
                        key={
                          parent.id
                        }
                      >

                        {/* ====================
                            PARENT
                        ==================== */}

                        <div className="parent-head">

                          <div className="media-box">
                            <CategoryMedia
                              category={
                                parent
                              }
                            />
                          </div>

                          <div className="parent-info">

                            <div className="parent-name">
                              {
                                parent.name
                              }
                            </div>

                            <div className="parent-id">
                              ID:{" "}
                              {
                                parent.id
                              }
                            </div>

                            <div className="stats">

                              <span className="stat">
                                {children.length}{" "}
                                thư mục con
                              </span>

                              <span className="stat">
                                {parent.active
                                  ? "Đang bật"
                                  : "Đang tắt"}
                              </span>

                            </div>

                          </div>

                          <div className="parent-actions">

                            <button
                              className={`small-button ${
                                parent.active
                                  ? "on"
                                  : "off"
                              }`}
                              onClick={() =>
                                toggleCategory(
                                  parent
                                )
                              }
                            >
                              {parent.active
                                ? "Đang bật"
                                : "Đang tắt"}
                            </button>

                            <button
                              className="small-button edit"
                              onClick={() =>
                                openEdit(
                                  parent
                                )
                              }
                            >
                              Sửa
                            </button>

                            <button
                              className="small-button delete"
                              onClick={() =>
                                deleteCategory(
                                  parent
                                )
                              }
                            >
                              Xóa
                            </button>

                          </div>

                        </div>

                        {/* ====================
                            CHILDREN
                        ==================== */}

                        {children.length >
                          0 && (
                          <div className="children">

                            {children.map(
                              (child) => (
                                <div
                                  className="child"
                                  key={
                                    child.id
                                  }
                                >

                                  <div className="media-box">
                                    <CategoryMedia
                                      category={
                                        child
                                      }
                                    />
                                  </div>

                                  <div className="child-info">

                                    <div className="child-name">
                                      └─{" "}
                                      {
                                        child.name
                                      }
                                    </div>

                                    <div className="parent-id">
                                      ID:{" "}
                                      {
                                        child.id
                                      }
                                    </div>

                                  </div>

                                  <div className="actions">

                                    <button
                                      className={`small-button ${
                                        child.active
                                          ? "on"
                                          : "off"
                                      }`}
                                      onClick={() =>
                                        toggleCategory(
                                          child
                                        )
                                      }
                                    >
                                      {child.active
                                        ? "Bật"
                                        : "Tắt"}
                                    </button>

                                    <button
                                      className="small-button edit"
                                      onClick={() =>
                                        openEdit(
                                          child
                                        )
                                      }
                                    >
                                      Sửa
                                    </button>

                                    <button
                                      className="small-button delete"
                                      onClick={() =>
                                        deleteCategory(
                                          child
                                        )
                                      }
                                    >
                                      Xóa
                                    </button>

                                  </div>

                                </div>
                              )
                            )}

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>

        </div>
      </div>
    </div>
  );
}
