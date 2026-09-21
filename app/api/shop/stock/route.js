import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("keys")
      .select("product_id,status")
      .not("product_id", "is", null);

    if (error) {
      console.error(
        "STOCK LOAD ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể tải tồn kho.",
        },
        { status: 500 }
      );
    }

    const stock = {};

    for (const row of data || []) {
      const productId = Number(
        row.product_id
      );

      if (!stock[productId]) {
        stock[productId] = {
          available: 0,
          sold: 0,
          total: 0,
        };
      }

      stock[productId].total += 1;

      if (
        row.status === "available"
      ) {
        stock[productId].available += 1;
      } else {
        stock[productId].sold += 1;
      }
    }

    return NextResponse.json({
      success: true,
      stock,
    });
  } catch (error) {
    console.error(
      "STOCK API ERROR:",
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
