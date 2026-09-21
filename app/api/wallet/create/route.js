import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
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
      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // Kiểm tra ví đã tồn tại chưa
    const { data: wallet, error: walletError } =
      await supabaseAdmin
        .from("wallets")
        .select("user_id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

    if (walletError) {
      console.error("CHECK WALLET ERROR:", walletError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra ví.",
        },
        { status: 500 }
      );
    }

    // Đã có ví
    if (wallet) {
      return NextResponse.json({
        success: true,
        created: false,
        wallet,
      });
    }

    // Chưa có → tạo ví
    const {
      data: newWallet,
      error: createError,
    } = await supabaseAdmin
      .from("wallets")
      .insert({
        user_id: user.id,
        balance: 0,
      })
      .select("user_id, balance")
      .single();

    if (createError) {
      console.error("CREATE WALLET ERROR:", createError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo ví.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: true,
      wallet: newWallet,
    });
  } catch (error) {
    console.error("WALLET CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
