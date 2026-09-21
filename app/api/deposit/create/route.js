import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PayOS } from "@payos/node";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://xenova-play.vercel.app";

function makeTransferContent(depositId) {
  return `XENOVA ${depositId}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount < 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền nạp tối thiểu là 10.000đ.",
        },
        { status: 400 }
      );
    }

    if (amount > 100000000) {
      return NextResponse.json(
        {
          success: false,
          message: "Số tiền nạp quá lớn.",
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

    // ==========================================
    // KIỂM TRA / TẠO VÍ
    // ==========================================

    let wallet = null;

    const { data: existingWallet } =
      await supabaseAdmin
        .from("wallets")
        .select("user_id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

    wallet = existingWallet;

    if (!wallet) {
      const {
        data: newWallet,
        error: createWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: user.id,
          balance: 0,
        })
        .select("user_id, balance")
        .single();

      if (!createWalletError && newWallet) {
        wallet = newWallet;
      } else {
        const { data: retryWallet } =
          await supabaseAdmin
            .from("wallets")
            .select("user_id, balance")
            .eq("user_id", user.id)
            .maybeSingle();

        wallet = retryWallet || null;
      }
    }

    // ==========================================
    // TẠO DEPOSIT
    // ==========================================

    const {
      data: deposit,
      error: depositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",
        transfer_content: "XENOVA",
      })
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .single();

    if (depositError || !deposit) {
      console.error(
        "CREATE DEPOSIT ERROR:",
        depositError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Không thể tạo yêu cầu nạp tiền.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // TẠO NỘI DUNG XENOVA <ID>
    // ==========================================

    const transferContent =
      makeTransferContent(deposit.id);

    const {
      data: updatedDeposit,
      error: updateDepositError,
    } = await supabaseAdmin
      .from("deposit_requests")
      .update({
        transfer_content: transferContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deposit.id)
      .eq("status", "pending")
      .select(
        "id, user_id, amount, status, transfer_content, created_at, updated_at"
      )
      .single();

    if (
      updateDepositError ||
      !updatedDeposit
    ) {
      await supabaseAdmin
        .from("deposit_requests")
        .delete()
        .eq("id", deposit.id)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tạo mã đơn nạp tiền.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // KIỂM TRA PAYOS ENV
    // ==========================================

    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      console.error(
        "PAYOS ENV MISSING"
      );

      await supabaseAdmin
        .from("deposit_requests")
        .update({
          status: "failed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", updatedDeposit.id)
        .eq("status", "pending");

      return NextResponse.json(
        {
          success: false,
          message:
            "PayOS chưa được cấu hình đầy đủ.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // TẠO PAYOS
    // ==========================================

    const payOS = new PayOS({
      clientId:
        process.env.PAYOS_CLIENT_ID,

      apiKey:
        process.env.PAYOS_API_KEY,

      checksumKey:
        process.env.PAYOS_CHECKSUM_KEY,
    });

    // ==========================================
    // TẠO PAYMENT LINK
    // ==========================================

    const paymentLink =
      await payOS.paymentRequests.create({
        orderCode:
          Number(updatedDeposit.id),

        amount:
          Number(updatedDeposit.amount),

        description:
          updatedDeposit.transfer_content,

        cancelUrl:
          `${SITE_URL}/deposit?payment=cancel&orderCode=${updatedDeposit.id}`,

        returnUrl:
          `${SITE_URL}/deposit?payment=success&orderCode=${updatedDeposit.id}`,

        items: [
          {
            name: "Nạp tiền XENOVA PLAY",
            quantity: 1,
            price:
              Number(updatedDeposit.amount),
          },
        ],
      });

    // ==========================================
    // TRẢ KẾT QUẢ
    // ==========================================

    return NextResponse.json({
      success: true,

      depositId:
        updatedDeposit.id,

      orderCode:
        Number(updatedDeposit.id),

      amount:
        Number(updatedDeposit.amount),

      transferContent:
        updatedDeposit.transfer_content,

      checkoutUrl:
        paymentLink.checkoutUrl,

      qrCode:
        paymentLink.qrCode || null,

      paymentLinkId:
        paymentLink.paymentLinkId ||
        paymentLink.id ||
        null,

      wallet: wallet
        ? {
            user_id:
              wallet.user_id,

            balance:
              Number(
                wallet.balance || 0
              ),
          }
        : null,
    });
  } catch (error) {
    console.error(
      "DEPOSIT CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Lỗi server.",
      },
      { status: 500 }
    );
  }
}
