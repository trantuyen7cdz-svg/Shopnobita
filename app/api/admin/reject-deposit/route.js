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
    // LẤY USER TỪ TOKEN
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
    // KIỂM TRA QUYỀN ADMIN
    // =========================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "CHECK ADMIN PROFILE ERROR:",
        profileError
      );

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
    // LẤY DEPOSIT ID
    // =========================

    const body = await request.json();

    const depositId = Number(body.depositId);

    if (!Number.isInteger(depositId) || depositId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã yêu cầu nạp tiền không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // =========================
    // TỪ CHỐI ĐƠN
    // CHỈ TỪ pending -> failed
    // =========================

    const {
      data: deposit,
      error: updateError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositId)
      .eq("status", "pending")
      .select(
        "id, user_id, amount, status, transfer_content, updated_at"
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "REJECT DEPOSIT UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể từ chối đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    // Không có đơn pending tương ứng
    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Đơn không tồn tại hoặc đơn đã được xử lý trước đó.",
        },
        { status: 400 }
      );
    }

    // =========================
    // THÀNH CÔNG
    // =========================

    return NextResponse.json({
      success: true,
      message: "Đã từ chối đơn nạp tiền.",
      depositId: deposit.id,
      userId: deposit.user_id,
      amount: deposit.amount,
      status: deposit.status,
      transferContent: deposit.transfer_content,
      updatedAt: deposit.updated_at,
    });
  } catch (error) {
    console.error(
      "REJECT DEPOSIT SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
