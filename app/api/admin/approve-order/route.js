import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
export async function POST(request) {
  try {
    // =========================
    // KIỂM TRA TOKEN
    // =========================
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7).trim();
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }
    // =========================
    // LẤY USER
    // =========================
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("GET USER ERROR:", userError);
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }
    // =========================
    // KIỂM TRA ADMIN
    // =========================
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();
    if (profileError) {
      console.error("PROFILE ERROR:", profileError);
      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra quyền admin.",
        },
        { status: 500 }
      );
    }
    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền admin.",
        },
        { status: 403 }
      );
    }
    // =========================
    // LẤY ORDER ID
    // =========================
    const body = await request.json();
    const orderId = Number(body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã đơn hàng không hợp lệ.",
        },
        { status: 400 }
      );
    }
    // =========================
    // DUYỆT ĐƠN + CẤP KEY
    // =========================
    const { data, error } = await supabaseAdmin.rpc(
      "approve_order",
      {
        p_order_id: orderId,
        p_admin_id: user.id,
      }
    );
    if (error) {
      console.error("APPROVE ORDER RPC ERROR:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Không thể duyệt đơn hàng.",
        },
        { status: 500 }
      );
    }
    if (!data || data.success !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            "Duyệt đơn hàng thất bại.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("APPROVE ORDER SERVER ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
