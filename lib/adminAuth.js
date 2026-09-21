import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Bạn chưa đăng nhập.",
    };
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Phiên đăng nhập không hợp lệ.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    console.error("ADMIN AUTH USER ERROR:", userError);

    return {
      ok: false,
      status: 401,
      message: "Phiên đăng nhập không hợp lệ.",
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error("ADMIN PROFILE ERROR:", profileError);

    return {
      ok: false,
      status: 500,
      message: "Không thể kiểm tra quyền Admin.",
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      status: 403,
      message: "Bạn không có quyền Admin.",
    };
  }

  return {
    ok: true,
    user,
    profile,
  };
}

export { supabaseAdmin };
