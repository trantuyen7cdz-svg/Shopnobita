"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    setLoading(true);

    const [
      { data: ordersData, error: ordersError },
      { data: productsData },
      { data: profilesData },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false }),

      supabase
        .from("products")
        .select("id, name, price")
        .order("id", { ascending: true }),

      supabase
        .from("profiles")
        .select("id, username, email"),
    ]);

    if (ordersError) {
      console.error(ordersError);
      showMessage("Không tải được danh sách đơn hàng", "error");
    }

    setOrders(ordersData || []);
    setProducts(productsData || []);
    setProfiles(profilesData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // MESSAGE
  // =========================

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4000);
  }

  // =========================
  // PRODUCT
  // =========================

  function getProduct(productId) {
    return products.find(
      (product) => Number(product.id) === Number(productId)
    );
  }

  // =========================
  // USER
  // =========================

  function getProfile(userId) {
    return profiles.find(
      (profile) => String(profile.id) === String(userId)
    );
  }

  // =========================
  // DUYỆT ĐƠN
  // =========================

  async function approveOrder(orderId) {
    const confirmed = window.confirm(
      `Bạn chắc chắn đã nhận được tiền của đơn #${orderId}?\n\nHệ thống sẽ cấp KEY và chuyển đơn sang HOÀN THÀNH.`
    );

    if (!confirmed) return;

    setProcessingId(orderId);
    setMessage("");

    try {
      // LẤY SESSION ADMIN
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(sessionError);

        throw new Error(
          "Không thể kiểm tra phiên đăng nhập."
        );
      }

      if (!session?.access_token) {
        throw new Error(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      // GỌI API DUYỆT ĐƠN KÈM TOKEN
      const response = await fetch(
        "/api/admin/approve-order",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            orderId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Không thể duyệt đơn hàng"
        );
      }

      showMessage(
        `Đơn #${orderId} đã hoàn thành. KEY: ${
          result.key || "Đã cấp"
        }`,
        "success"
      );

      await loadData();
    } catch (error) {
      console.error(
        "APPROVE ORDER ERROR:",
        error
      );

      showMessage(
        error.message ||
          "Có lỗi xảy ra khi duyệt đơn",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  // =========================
  // ĐÁNH DẤU THẤT BẠI
  // =========================

  async function failOrder(orderId) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn đánh dấu đơn #${orderId} là THẤT BẠI không?`
    );

    if (!confirmed) return;

    setProcessingId(orderId);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending");

      if (error) {
        console.error(error);
        throw new Error(
          "Không thể cập nhật đơn hàng"
        );
      }

      showMessage(
        `Đơn #${orderId} đã chuyển sang THẤT BẠI`,
        "success"
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Có lỗi xảy ra",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  // =========================
  // KHÔI PHỤC ĐƠN THẤT BẠI
  // =========================

  async function restoreOrder(orderId) {
    const confirmed = window.confirm(
      `Đưa đơn #${orderId} trở lại trạng thái ĐANG CHỜ?`
    );

    if (!confirmed) return;

    setProcessingId(orderId);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "failed");

      if (error) {
        console.error(error);
        throw new Error(
          "Không thể khôi phục đơn"
        );
      }

      showMessage(
        `Đơn #${orderId} đã trở lại ĐANG CHỜ`,
        "success"
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Có lỗi xảy ra",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  // =========================
  // FILTER
  // =========================

  const filteredOrders = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const product =
        getProduct(order.product_id);

      const profile =
        getProfile(order.user_id);

      const matchesSearch =
        !keyword ||
        String(order.id)
          .includes(keyword) ||
        String(order.user_id || "")
          .toLowerCase()
          .includes(keyword) ||
        String(order.amount || "")
          .includes(keyword) ||
        String(order.transaction_id || "")
          .toLowerCase()
          .includes(keyword) ||
        String(product?.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(profile?.username || "")
          .toLowerCase()
          .includes(keyword) ||
        String(profile?.email || "")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      const matchesProduct =
        productFilter === "all" ||
        String(order.product_id) ===
          String(productFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProduct
      );
    });
  }, [
    orders,
    search,
    statusFilter,
    productFilter,
    products,
    profiles,
  ]);

  // =========================
  // STATS
  // =========================

  const stats = useMemo(() => {
    const pending =
      orders.filter(
        (order) =>
          order.status === "pending"
      ).length;

    const completed =
      orders.filter(
        (order) =>
          order.status === "completed"
      ).length;

    const failed =
      orders.filter(
        (order) =>
          order.status === "failed"
      ).length;

    const revenue =
      orders
        .filter(
          (order) =>
            order.status ===
            "completed"
        )
        .reduce(
          (sum, order) =>
            sum +
            Number(
              order.amount || 0
            ),
          0
        );

    return {
      total: orders.length,
      pending,
      completed,
      failed,
      revenue,
    };
  }, [orders]);

  // =========================
  // FORMAT
  // =========================

  function formatMoney(value) {
    return (
      Number(value || 0)
        .toLocaleString("vi-VN") +
      "đ"
    );
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(
      value
    ).toLocaleString("vi-VN");
  }

  function statusLabel(status) {
    if (status === "pending") {
      return "ĐANG CHỜ";
    }

    if (status === "completed") {
      return "HOÀN THÀNH";
    }

    if (status === "failed") {
      return "THẤT BẠI";
    }

    if (status === "paid") {
      return "HOÀN THÀNH";
    }

    return status || "-";
  }

  function statusClass(status) {
    if (status === "pending") {
      return "pending";
    }

    if (
      status === "completed" ||
      status === "paid"
    ) {
      return "completed";
    }

    if (status === "failed") {
      return "failed";
    }

    return "unknown";
  }

  // =========================
  // UI
  // =========================

  return (
    <main className="page">
      <div className="container">

        <div className="top">
          <div>
            <h1>
              QUẢN LÝ ĐƠN HÀNG
            </h1>

            <p>
              Kiểm tra giao dịch và
              duyệt đơn thủ công
            </p>
          </div>

          <button
            className="refresh"
            onClick={loadData}
            disabled={loading}
          >
            ↻ LÀM MỚI
          </button>
        </div>

        {message && (
          <div
            className={`message ${
              messageType === "error"
                ? "messageError"
                : "messageSuccess"
            }`}
          >
            {message}
          </div>
        )}

        <section className="stats">

          <div className="stat">
            <span>TỔNG ĐƠN</span>
            <strong>
              {stats.total}
            </strong>
          </div>

          <div className="stat pendingStat">
            <span>ĐANG CHỜ</span>
            <strong>
              {stats.pending}
            </strong>
          </div>

          <div className="stat completedStat">
            <span>HOÀN THÀNH</span>
            <strong>
              {stats.completed}
            </strong>
          </div>

          <div className="stat failedStat">
            <span>THẤT BẠI</span>
            <strong>
              {stats.failed}
            </strong>
          </div>

          <div className="stat">
            <span>DOANH THU</span>
            <strong>
              {formatMoney(
                stats.revenue
              )}
            </strong>
          </div>

        </section>

        <section className="filters">

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Tìm mã đơn, username, email, sản phẩm..."
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>

            <option value="pending">
              Đang chờ
            </option>

            <option value="completed">
              Hoàn thành
            </option>

            <option value="failed">
              Thất bại
            </option>
          </select>

          <select
            value={productFilter}
            onChange={(e) =>
              setProductFilter(
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

        </section>

        <section className="orders">

          <div className="ordersHeader">
            <h2>
              DANH SÁCH ĐƠN
            </h2>

            <span>
              {filteredOrders.length} đơn
            </span>
          </div>

          {loading ? (
            <div className="empty">
              Đang tải đơn hàng...
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="empty">
              Không có đơn hàng.
            </div>
          ) : (
            <div className="tableWrap">

              <table>

                <thead>
                  <tr>
                    <th>ĐƠN</th>
                    <th>
                      KHÁCH HÀNG
                    </th>
                    <th>SẢN PHẨM</th>
                    <th>SỐ TIỀN</th>
                    <th>
                      TRẠNG THÁI
                    </th>
                    <th>
                      NGÀY TẠO
                    </th>
                    <th>
                      THAO TÁC
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredOrders.map(
                    (order) => {

                      const product =
                        getProduct(
                          order.product_id
                        );

                      const profile =
                        getProfile(
                          order.user_id
                        );

                      const isProcessing =
                        processingId ===
                        order.id;

                      return (
                        <tr
                          key={order.id}
                        >

                          <td>
                            <strong>
                              #{order.id}
                            </strong>

                            <small>
                              XENOVA{" "}
                              {order.id}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {profile?.username ||
                                "Không rõ"}
                            </strong>

                            <small>
                              {profile?.email ||
                                order.user_id ||
                                "-"}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {product?.name ||
                                `Product #${order.product_id}`}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                order.amount
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`status ${statusClass(
                                order.status
                              )}`}
                            >
                              {statusLabel(
                                order.status
                              )}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              order.created_at
                            )}
                          </td>

                          <td>

                            <div className="actions">

                              {order.status ===
                                "pending" && (
                                <>

                                  <button
                                    className="approve"
                                    onClick={() =>
                                      approveOrder(
                                        order.id
                                      )
                                    }
                                    disabled={
                                      isProcessing
                                    }
                                  >
                                    {isProcessing
                                      ? "ĐANG XỬ LÝ..."
                                      : "✓ DUYỆT & CẤP KEY"}
                                  </button>

                                  <button
                                    className="fail"
                                    onClick={() =>
                                      failOrder(
                                        order.id
                                      )
                                    }
                                    disabled={
                                      isProcessing
                                    }
                                  >
                                    ✕ THẤT BẠI
                                  </button>

                                </>
                              )}

                              {order.status ===
                                "failed" && (
                                <button
                                  className="restore"
                                  onClick={() =>
                                    restoreOrder(
                                      order.id
                                    )
                                  }
                                  disabled={
                                    isProcessing
                                  }
                                >
                                  ↶ TRỞ LẠI CHỜ
                                </button>
                              )}

                              {(
                                order.status ===
                                  "completed" ||
                                order.status ===
                                  "paid"
                              ) && (
                                <span className="done">
                                  ✓ ĐÃ HOÀN THÀNH
                                </span>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(80, 80, 255, 0.08),
              transparent 35%
            ),
            #08090d;
          color: #fff;
          padding: 30px 18px 60px;
        }

        .container {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        h1 {
          margin: 0;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .top p {
          margin: 7px 0 0;
          color: #858995;
          font-size: 14px;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .refresh {
          border: 1px solid #292c35;
          background: #15171d;
          color: #fff;
          border-radius: 10px;
          padding: 11px 15px;
          font-weight: 800;
        }

        .message {
          border-radius: 12px;
          padding: 13px 15px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 700;
        }

        .messageSuccess {
          background: rgba(
            0,
            200,
            120,
            0.1
          );
          border: 1px solid
            rgba(
              0,
              200,
              120,
              0.3
            );
          color: #5cffb2;
        }

        .messageError {
          background: rgba(
            255,
            70,
            70,
            0.1
          );
          border: 1px solid
            rgba(
              255,
              70,
              70,
              0.3
            );
          color: #ff7777;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat {
          background: #101218;
          border: 1px solid #20232c;
          border-radius: 14px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #777c88;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .stat strong {
          font-size: 24px;
        }

        .pendingStat strong {
          color: #ffc44d;
        }

        .completedStat strong {
          color: #45f29a;
        }

        .failedStat strong {
          color: #ff6262;
        }

        .filters {
          display: grid;
          grid-template-columns:
            1fr 190px 220px;
          gap: 10px;
          margin-bottom: 20px;
        }

        .filters input,
        .filters select {
          width: 100%;
          min-height: 46px;
          background: #101218;
          color: #fff;
          border: 1px solid #242731;
          border-radius: 10px;
          padding: 0 13px;
          outline: none;
        }

        .filters input:focus,
        .filters select:focus {
          border-color: #5960ff;
        }

        .orders {
          background: #101218;
          border: 1px solid #20232c;
          border-radius: 15px;
          overflow: hidden;
        }

        .ordersHeader {
          padding: 18px 20px;
          border-bottom: 1px solid #20232c;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ordersHeader h2 {
          margin: 0;
          font-size: 16px;
        }

        .ordersHeader span {
          color: #777c88;
          font-size: 13px;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        th {
          text-align: left;
          font-size: 10px;
          color: #707580;
          padding: 14px 16px;
          border-bottom: 1px solid #20232c;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #1b1e25;
          vertical-align: middle;
          font-size: 13px;
        }

        td strong {
          display: block;
          font-weight: 800;
        }

        td small {
          display: block;
          margin-top: 4px;
          color: #6f7480;
          font-size: 11px;
          max-width: 230px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status.pending {
          background: rgba(
            255,
            190,
            50,
            0.1
          );
          color: #ffc44d;
          border: 1px solid
            rgba(
              255,
              190,
              50,
              0.2
            );
        }

        .status.completed {
          background: rgba(
            50,
            230,
            140,
            0.1
          );
          color: #45f29a;
          border: 1px solid
            rgba(
              50,
              230,
              140,
              0.2
            );
        }

        .status.failed {
          background: rgba(
            255,
            70,
            70,
            0.1
          );
          color: #ff6868;
          border: 1px solid
            rgba(
              255,
              70,
              70,
              0.2
            );
        }

        .status.unknown {
          background: rgba(
            150,
            150,
            150,
            0.1
          );
          color: #aaa;
        }

        .actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          min-width: 230px;
        }

        .actions button {
          border: 0;
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 10px;
          font-weight: 900;
          color: #fff;
        }

        .approve {
          background: #13a866;
        }

        .fail {
          background: #b52e3b;
        }

        .restore {
          background: #555dff;
        }

        .done {
          color: #45f29a;
          font-size: 10px;
          font-weight: 900;
        }

        .empty {
          text-align: center;
          padding: 60px 20px;
          color: #747985;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px 10px 50px;
          }

          .top {
            align-items: flex-start;
          }

          h1 {
            font-size: 21px;
          }

          .refresh {
            padding: 9px 10px;
            font-size: 11px;
          }

          .stats {
            grid-template-columns:
              1fr 1fr;
          }

          .stat {
            padding: 14px;
          }

          .stat strong {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}
