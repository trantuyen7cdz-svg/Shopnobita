import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/*
==================================================
SỬA LỖI TIẾNG VIỆT BỊ MOJIBAKE
==================================================
*/

function fixVietnamese(value) {
  if (typeof value !== "string") {
    return value;
  }

  const looksBroken =
    value.includes("Ã") ||
    value.includes("Â") ||
    value.includes("áº") ||
    value.includes("á»") ||
    value.includes("â") ||
    value.includes("Ä") ||
    value.includes("Å") ||
    value.includes("Æ") ||
    value.includes("ð");

  if (!looksBroken) {
    return value;
  }

  try {
    const fixed = Buffer
      .from(value, "latin1")
      .toString("utf8");

    if (
      fixed &&
      !fixed.includes("�") &&
      fixed !== value
    ) {
      return fixed;
    }
  } catch (error) {
    console.error("FIX UTF8 ERROR:", error);
  }

  return value;
}

/*
==================================================
SỬA TOÀN BỘ OBJECT ĐỆ QUY
==================================================
*/

function fixObject(value) {
  if (typeof value === "string") {
    return fixVietnamese(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      fixObject(item)
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = fixObject(item);
    }

    return result;
  }

  return value;
}

/*
==================================================
GET SHOP CATALOG
==================================================
*/

export async function GET() {
  try {
    /*
    ==============================================
    CATEGORY
    ==============================================
    
    Bao gồm:

    - Thư mục mẹ
    - Thư mục con
    - Ảnh
    - Video
    - Kiểu media
    - parent_id
    ==============================================
    */

    const {
      data: categories,
      error: categoryError,
    } = await supabaseAdmin
      .from("product_categories")
      .select(
        `
        id,
        name,
        description,
        image_url,
        demo_image_url,
        media_type,
        video_url,
        active,
        parent_id,
        created_at,
        updated_at
        `
      )
      .eq("active", true)
      .order("id", {
        ascending: true,
      });

    if (categoryError) {
      console.error(
        "CATEGORY ERROR:",
        categoryError
      );

      return NextResponse.json(
        {
          success: false,
          error: categoryError.message,
        },
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
    ==============================================
    PRODUCTS
    ==============================================
    */

    const {
      data: products,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        duration_days,
        active,
        is_active,
        demo_image_url,
        category_id,
        media_type,
        video_url,
        created_at
        `
      )
      .eq("active", true)
      .eq("is_active", true)
      .order("id", {
        ascending: true,
      });

    if (productError) {
      console.error(
        "PRODUCT ERROR:",
        productError
      );

      return NextResponse.json(
        {
          success: false,
          error: productError.message,
        },
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
    ==============================================
    CATEGORY MAP
    ==============================================
    */

    const categoryMap = new Map();

    for (const category of categories || []) {
      categoryMap.set(
        Number(category.id),
        category
      );
    }

    /*
    ==============================================
    LẤY ĐƯỜNG DẪN CATEGORY
    ==============================================

    Ví dụ:

    ANDROID
    └── KEY 7 NGÀY

    Product thuộc:
    KEY 7 NGÀY

    thì:

    category_path:
    [
      ANDROID,
      KEY 7 NGÀY
    ]

    ==============================================
    */

    function getCategoryPath(categoryId) {
      if (
        categoryId === null ||
        categoryId === undefined
      ) {
        return [];
      }

      const path = [];

      let current =
        categoryMap.get(
          Number(categoryId)
        );

      let guard = 0;

      while (
        current &&
        guard < 20
      ) {
        path.unshift({
          id: current.id,

          name: current.name,

          description:
            current.description ?? null,

          image_url:
            current.image_url ?? null,

          demo_image_url:
            current.demo_image_url ?? null,

          media_type:
            current.media_type ?? "image",

          video_url:
            current.video_url ?? null,

          parent_id:
            current.parent_id ?? null,
        });

        if (
          current.parent_id === null ||
          current.parent_id === undefined
        ) {
          break;
        }

        current =
          categoryMap.get(
            Number(current.parent_id)
          );

        guard++;
      }

      return path;
    }

    /*
    ==============================================
    GẮN THÔNG TIN CATEGORY VÀO PRODUCT
    ==============================================
    */

    const productsWithCategory =
      (products || []).map(
        (product) => {
          const categoryPath =
            getCategoryPath(
              product.category_id
            );

          return {
            ...product,

            category:
              categoryPath.length
                ? categoryPath[
                    categoryPath.length - 1
                  ]
                : null,

            category_path:
              categoryPath,

            /*
            --------------------------------------
            CATEGORY MẸ
            --------------------------------------
            */

            parent_category:
              categoryPath.length
                ? categoryPath[0]
                : null,

            /*
            --------------------------------------
            CATEGORY CON
            --------------------------------------
            */

            child_category:
              categoryPath.length > 1
                ? categoryPath[
                    categoryPath.length - 1
                  ]
                : null,
          };
        }
      );

    /*
    ==============================================
    ĐẾM CATEGORY
    ==============================================
    */

    const categoryList =
      categories || [];

    const parentCategories =
      categoryList.filter(
        (category) =>
          category.parent_id === null ||
          category.parent_id === undefined
      );

    const childCategories =
      categoryList.filter(
        (category) =>
          category.parent_id !== null &&
          category.parent_id !== undefined
      );

    /*
    ==============================================
    THỐNG KÊ CHO TỪNG CATEGORY
    ==============================================
    */

    const categoriesWithStats =
      categoryList.map(
        (category) => {
          const categoryId =
            Number(category.id);

          /*
          ----------------------------------------
          CATEGORY CON TRỰC TIẾP
          ----------------------------------------
          */

          const children =
            childCategories.filter(
              (child) =>
                Number(child.parent_id) ===
                categoryId
            );

          /*
          ----------------------------------------
          PRODUCT TRỰC TIẾP
          ----------------------------------------
          */

          const directProducts =
            productsWithCategory.filter(
              (product) =>
                Number(product.category_id) ===
                categoryId
            );

          /*
          ----------------------------------------
          PRODUCT THUỘC CATEGORY CON
          ----------------------------------------
          */

          const childIds =
            new Set(
              children.map(
                (child) =>
                  Number(child.id)
              )
            );

          const childProducts =
            productsWithCategory.filter(
              (product) =>
                childIds.has(
                  Number(product.category_id)
                )
            );

          return {
            ...category,

            children_count:
              children.length,

            direct_product_count:
              directProducts.length,

            product_count:
              directProducts.length +
              childProducts.length,
          };
        }
      );

    /*
    ==============================================
    RESPONSE
    ==============================================
    */

    const responseData = {
      success: true,

      categories:
        categoriesWithStats,

      products:
        productsWithCategory,

      /*
      --------------------------------------------
      DANH SÁCH THƯ MỤC MẸ
      --------------------------------------------
      */

      parent_categories:
        categoriesWithStats.filter(
          (category) =>
            category.parent_id === null ||
            category.parent_id === undefined
        ),

      /*
      --------------------------------------------
      DANH SÁCH THƯ MỤC CON
      --------------------------------------------
      */

      child_categories:
        categoriesWithStats.filter(
          (category) =>
            category.parent_id !== null &&
            category.parent_id !== undefined
        ),

      /*
      --------------------------------------------
      META
      --------------------------------------------
      */

      meta: {
        category_count:
          categoryList.length,

        parent_category_count:
          parentCategories.length,

        child_category_count:
          childCategories.length,

        product_count:
          productsWithCategory.length,

        generated_at:
          new Date().toISOString(),
      },
    };

    /*
    ==============================================
    SỬA MOJIBAKE TRƯỚC KHI TRẢ JSON
    ==============================================
    */

    const fixedResponse =
      fixObject(responseData);

    return new NextResponse(
      JSON.stringify(fixedResponse),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "SHOP CATALOG ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Không thể tải catalog",
      },
      {
        status: 500,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
