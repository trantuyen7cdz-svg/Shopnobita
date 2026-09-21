"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "trantuyenzzz598@gmail.com";

export default function AdminLayout({ children }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        const email =
          String(user.email || "").trim().toLowerCase();

        if (email !== ADMIN_EMAIL.toLowerCase()) {
          router.replace("/dashboard");
          return;
        }

        if (mounted) {
          setAllowed(true);
          setChecking(false);
        }
      } catch (error) {
        console.error("ADMIN CHECK ERROR:", error);
        router.replace("/dashboard");
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#070707",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Đang kiểm tra quyền Admin...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return children;
}
