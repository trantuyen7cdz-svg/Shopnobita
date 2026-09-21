import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

const DEFAULT_SETTINGS = {
  id: 1,
  logo_url: "",
  shop_badge: "",
  shop_title: "",
  shop_description: "",
  banners: [],
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("SHOP SETTINGS ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const settings = {
      ...DEFAULT_SETTINGS,
      ...(data || {}),

      logo_url: String(data?.logo_url || ""),

      /*
       * Các phần text cũ được giữ trong database
       * nhưng không hiển thị ở giao diện SHOP mới.
       */
      shop_badge: "",
      shop_title: "",
      shop_description: "",

      banners: Array.isArray(data?.banners)
        ? data.banners
            .filter(
              (banner) =>
                banner &&
                typeof banner.image_url === "string" &&
                banner.image_url.trim()
            )
            .map((banner, index) => ({
              id:
                banner.id ||
                `banner-${index}`,
              image_url:
                banner.image_url.trim(),
              enabled:
                banner.enabled !== false,
              order:
                Number.isFinite(
                  Number(banner.order)
                )
                  ? Number(banner.order)
                  : index,
            }))
            .sort(
              (a, b) =>
                Number(a.order) -
                Number(b.order)
            )
        : [],
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error(
      "SHOP SETTINGS SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Không thể tải cài đặt SHOP.",
      },
      { status: 500 }
    );
  }
}
