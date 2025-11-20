import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useMemo
} from "react";
import SelectBoxCustom from "~/components/SelectBoxCustom/SelectBoxCustom";
import CategoryFilter from "~/pages/OurShop/components/CategoryFilter/CategoryFilter";
import { useSorting } from "~/hooks/useSorting";
import { categoryService } from "~/apis/categoryService";
import { useLanguage } from "~/contexts/LanguageProvider";

const SortProduct = forwardRef(
  (
    { listProduct, updateSetListProductRender, sortArr, itemPerPageArr },
    ref
  ) => {
    const [showSortType, setShowSortType] = useState("ascending");
    const [showQuantity, setShowQuantity] = useState(itemPerPageArr[0].value);
    const [loadingMoreItem, setLoadingMoreItem] = useState(
      itemPerPageArr[0].value
    );
    const [showCategory, setShowCategory] = useState("all");
    const [onlyPromotions, setOnlyPromotions] = useState(false);
    const { t } = useLanguage();

    // Calculate product counts per category
    const productCounts = useMemo(() => {
      if (!Array.isArray(listProduct)) return {};
      const counts = { all: listProduct.length };

      // Count by categoryType
      listProduct.forEach((p) => {
        const key = p.categoryType || "unknown";
        counts[key] = (counts[key] || 0) + 1;
      });

      // Additionally, collect counts for book sub-types based on categoryName
      const bookTypeSet = new Set();
      listProduct.forEach((p) => {
        if ((p.categoryType || "") === "book" && p.categoryName) {
          bookTypeSet.add(p.categoryName);
        }
      });
      const bookTypes = Array.from(bookTypeSet);
      bookTypes.forEach((bt) => {
        counts[bt] = listProduct.filter(
          (p) => p.categoryType === "book" && p.categoryName === bt
        ).length;
      });

      return counts;
    }, [listProduct]);

    // Derive book types list for CategoryFilter
    const bookTypes = useMemo(() => {
      if (!Array.isArray(listProduct)) return [];
      const set = new Set();
      listProduct.forEach((p) => {
        if ((p.categoryType || "") === "book" && p.categoryName)
          set.add(p.categoryName);
      });
      return Array.from(set);
    }, [listProduct]);
    const getValueSelect = (value, type) => {
      if (type === "sort") {
        setShowSortType(value);
      } else if (type === "show") {
        setShowQuantity(value);
        setLoadingMoreItem(value);
      } else if (type === "bookType") {
        // when selecting a book sub-type, set the showCategory to that book type
        setShowCategory(value);
      } else if (type === "promo") {
        setOnlyPromotions(String(value) === "true");
      }
    };

    const handleCategoryChange = (categoryCode) => {
      console.log("Category changed to:", categoryCode);
      setShowCategory(categoryCode);
      // Reset pagination when changing categories
      setShowQuantity(itemPerPageArr[0].value);
      setLoadingMoreItem(itemPerPageArr[0].value);
    };

    // derive filtered list by selected category before sorting/pagination
    const filteredByCategory = useMemo(() => {
      if (!Array.isArray(listProduct)) return [];

      const matchesPromotion = (p) => {
        return (
          Boolean(p.promotionCode) ||
          (p.discountValue && Number(p.discountValue) > 0)
        );
      };

      // helper to optionally apply promotion filter
      const applyPromoFilter = (arr) =>
        onlyPromotions ? arr.filter(matchesPromotion) : arr;

      if (!showCategory || showCategory === "all") {
        console.log("Showing all products:", listProduct.length);
        return applyPromoFilter(listProduct);
      }

      // If selected category matches a book sub-type (categoryName), filter by that
      if (bookTypes.includes(showCategory)) {
        const byBookType = listProduct.filter(
          (p) => p.categoryType === "book" && p.categoryName === showCategory
        );
        return applyPromoFilter(byBookType);
      }

      const byCategory = listProduct.filter(
        (p) => p.categoryType === showCategory
      );
      console.log(
        `Filtered by category ${showCategory}:`,
        byCategory.length,
        "products"
      );
      return applyPromoFilter(byCategory);
    }, [listProduct, showCategory, bookTypes, onlyPromotions]);

    const { sortedList } = useSorting(
      filteredByCategory,
      showSortType,
      showQuantity
    );

    useImperativeHandle(ref, () => ({
      handleOnclickMoreItem() {
        setShowQuantity((prev) => Number(prev) + Number(loadingMoreItem));
      }
    }));

    // handle sorting and filtering
    useEffect(() => {
      const listAfterSorting = sortedList();
      updateSetListProductRender(listAfterSorting);
    }, [showSortType, showQuantity, showCategory, filteredByCategory]);

    return (
      <div className="space-y-6">
        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={showCategory}
          onCategoryChange={handleCategoryChange}
          productCounts={productCounts}
          bookTypes={bookTypes}
        />

        {/* Sort and Items Per Page */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Sort and filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  Sắp xếp
                </span>
                <div className="w-40">
                  <SelectBoxCustom
                    selectOptions={sortArr}
                    getValue={getValueSelect}
                    type={"sort"}
                    value={showSortType}
                  />
                </div>
              </div>

              {/* Book type select (visible for books) */}
              {(showCategory === "book" ||
                bookTypes.includes(showCategory)) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Thể loại sách</span>
                  <div className="w-48">
                    <SelectBoxCustom
                      selectOptions={[
                        { title: "Tất cả sách", value: "book" },
                        ...bookTypes.map((bt) => ({ title: bt, value: bt }))
                      ]}
                      getValue={getValueSelect}
                      type={"bookType"}
                      value={
                        bookTypes.includes(showCategory) ? showCategory : "book"
                      }
                    />
                  </div>
                </div>
              )}

              {/* Promotion filter select */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Lọc</span>
                <div className="w-36">
                  <SelectBoxCustom
                    selectOptions={[
                      { title: "Tất cả", value: "false" },
                      { title: "Chỉ khuyến mãi", value: "true" }
                    ]}
                    getValue={getValueSelect}
                    type={"promo"}
                    value={onlyPromotions ? "true" : "false"}
                  />
                </div>
              </div>
            </div>

            {/* Items per page */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Hiển thị:
              </span>
              <SelectBoxCustom
                selectOptions={itemPerPageArr}
                getValue={getValueSelect}
                type={"show"}
              />
              <span className="text-sm text-gray-500">sản phẩm</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default SortProduct;
