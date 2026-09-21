import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // ==============================
    // KIỂM TRA ĐĂNG NHẬP
    // ==============================

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

    // ==============================
    // LẤY USER TỪ SUPABASE AUTH
    // ==============================

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("AUTH ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // ==============================
    // KIỂM TRA QUYỀN ADMIN
    // ==============================

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email, role")
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
      console.error("NOT ADMIN:", {
        authUserId: user.id,
        authEmail: user.email,
        profile,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền admin.",
        },
        { status: 403 }
      );
    }

    // ==============================
    // LẤY DEPOSIT ID
    // ==============================

    const body = await request.json();
    const depositId = Number(body.depositId);

    if (!Number.isInteger(depositId) || depositId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mã yêu cầu nạp không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // KIỂM TRA ĐƠN NẠP
    // ==============================

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .select("id, user_id, amount, status")
      .eq("id", depositId)
      .maybeSingle();

    if (depositError) {
      console.error("DEPOSIT CHECK ERROR:", depositError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra đơn nạp.",
        },
        { status: 500 }
      );
    }

    if (!deposit) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy đơn nạp.",
        },
        { status: 404 }
      );
    }

    if (deposit.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Đơn này đã được xử lý trước đó.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // KIỂM TRA TÀI KHOẢN KHÁCH
    // ==============================

    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin.auth.admin.getUserById(
      deposit.user_id
    );

    if (customerError || !customer?.user) {
      console.error("CUSTOMER CHECK ERROR:", customerError);

      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản khách không tồn tại.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // KIỂM TRA / TẠO VÍ
    // ==============================

    let wallet = null;

    const {
      data: existingWallet,
      error: walletCheckError,
    } = await supabaseAdmin
      .from("wallets")
      .select("id, user_id, balance")
      .eq("user_id", deposit.user_id)
      .maybeSingle();

    if (walletCheckError) {
      console.error("WALLET CHECK ERROR:", walletCheckError);

      return NextResponse.json(
        {
          success: false,
          message: "Không thể kiểm tra ví khách hàng.",
        },
        { status: 500 }
      );
    }

    wallet = existingWallet;

    // Nếu khách chưa có ví thì tạo
    if (!wallet) {
      const {
        data: newWallet,
        error: createWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: deposit.user_id,
          balance: 0,
        })
        .select("id, user_id, balance")
        .single();

      if (createWalletError) {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        // Có thể xảy ra trường hợp ví vừa được tạo
        // bởi một request khác, nên kiểm tra lại.
        const {
          data: retryWallet,
          error: retryWalletError,
        } = await supabaseAdmin
          .from("wallets")
          .select("id, user_id, balance")
          .eq("user_id", deposit.user_id)
          .maybeSingle();

        if (retryWalletError || !retryWallet) {
          return NextResponse.json(
            {
              success: false,
              message:
                createWalletError.message ||
                "Không thể tạo ví khách hàng.",
            },
            { status: 500 }
          );
        }

        wallet = retryWallet;
      } else {
        wallet = newWallet;
      }
    }

    // ==============================
    // CỘNG TIỀN VÀO VÍ
    // ==============================

    const newBalance =
      Number(wallet.balance || 0) + Number(deposit.amount);

    const {
      data: updatedWallet,
      error: updateWalletError,
    } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select("id, user_id, balance")
      .single();

    if (updateWalletError) {
      console.error(
        "UPDATE WALLET ERROR:",
        updateWalletError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể cộng tiền vào ví.",
        },
        { status: 500 }
      );
    }

    // ==============================
    // ĐÁNH DẤU ĐƠN ĐÃ HOÀN THÀNH
    // ==============================

    const {
      data: updatedDeposit,
      error: updateDepositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .eq("status", "pending")
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .maybeSingle();

    if (updateDepositError) {
      console.error(
        "UPDATE DEPOSIT ERROR:",
        updateDepositError
      );

      // Hoàn lại số dư nếu cập nhật deposit thất bại
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: Number(wallet.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể hoàn tất đơn nạp. Tiền đã được hoàn lại.",
        },
        { status: 500 }
      );
    }

    if (!updatedDeposit) {
      // Đơn đã bị xử lý bởi request khác.
      // Hoàn lại số tiền vừa cộng.
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: Number(wallet.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      return NextResponse.json(
        {
          success: false,
          message: "Đơn này đã được xử lý trước đó.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // THÀNH CÔNG
    // ==============================

    return NextResponse.json({
      success: true,
      message: "Duyệt nạp tiền thành công.",
      depositId: updatedDeposit.id,
      userId: updatedDeposit.user_id,
      amount: Number(updatedDeposit.amount),
      newBalance: Number(updatedWallet.balance),
    });
  } catch (error) {
    console.error(
      "APPROVE DEPOSIT SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
