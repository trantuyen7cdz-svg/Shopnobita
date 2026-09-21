import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    const productId = Number(body.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã sản phẩm không hợp lệ.",
        },
        { status: 400 }
      );
    }

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

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("BUY KEY USER ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("buy_key", {
      p_user_id: user.id,
      p_product_id: productId,
    });

    if (error) {
      console.error("BUY KEY RPC ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message || "Không thể thực hiện giao dịch.",
        },
        { status: 500 }
      );
    }

    if (!data || data.success !== true) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Mua KEY thất bại.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("BUY KEY SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
