import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "trantuyenzzz598@gmail.com";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function createAuthClient(request) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    }
  );
}

async function checkAdmin(request) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      ok: false,
      status: 401,
      error:
        "Chưa nhận được phiên đăng nhập.",
    };
  }

  const client =
    createAuthClient(request);

  if (!client) {
    return {
      ok: false,
      status: 401,
      error:
        "Token đăng nhập không hợp lệ.",
    };
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return {
      ok: false,
      status: 401,
      error:
        "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
    };
  }

  const email = String(
    user.email || ""
  )
    .trim()
    .toLowerCase();

  if (
    email !== ADMIN_EMAIL.toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      error:
        "Bạn không có quyền Admin.",
    };
  }

  return {
    ok: true,
    user,
    client,
  };
}

function normalizeBanners(banners) {
  if (!Array.isArray(banners)) {
    return [];
  }

  return banners
    .map((banner, index) => ({
      id:
        String(
          banner?.id || ""
        ).trim() ||
        `banner-${Date.now()}-${index}`,

      image_url: String(
        banner?.image_url || ""
      ).trim(),

      title: String(
        banner?.title || ""
      ).trim(),

      enabled:
        banner?.enabled !== false,

      order: Number.isFinite(
        Number(banner?.order)
      )
        ? Number(banner.order)
        : index,
    }))
    .filter(
      (banner) => banner.image_url
    )
    .sort(
      (a, b) =>
        Number(a.order) -
        Number(b.order)
    )
    .map((banner, index) => ({
      ...banner,
      order: index,
    }));
}

export async function GET(request) {
  try {
    const auth =
      await checkAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    const { data, error } =
      await auth.client
        .from("shop_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
      console.error(
        "SHOP SETTINGS GET:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: 1,

        logo_url:
          String(
            data?.logo_url || ""
          ),

        shop_badge: "",
        shop_title: "",
        shop_description: "",

        banners:
          normalizeBanners(
            data?.banners
          ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN SHOP GET:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Không thể tải cài đặt Shop.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request) {
  try {
    const auth =
      await checkAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dữ liệu gửi lên không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    const banners =
      normalizeBanners(
        body?.banners
      );

    const logo_url =
      String(
        body?.logo_url || ""
      ).trim();

    const { data, error } =
      await auth.client
        .from("shop_settings")
        .upsert(
          {
            id: 1,

            logo_url,

            shop_badge: "",
            shop_title: "",
            shop_description: "",

            banners,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        )
        .select()
        .single();

    if (error) {
      console.error(
        "SHOP SETTINGS PUT:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Đã lưu logo + banner thành công.",

      settings: {
        ...data,

        logo_url:
          String(
            data?.logo_url || ""
          ),

        banners:
          normalizeBanners(
            data?.banners
          ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN SHOP PUT:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Không thể lưu cài đặt Shop.",
      },
      {
        status: 500,
      }
    );
  }
}
