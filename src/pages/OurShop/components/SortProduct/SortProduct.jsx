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
    const { t } = useLanguage();

    // Calculate product counts per category
    const productCounts = useMemo(() => {
      if (!Array.isArray(listProduct)) return {};

      const counts = { all: listProduct.length };
      const categories = [
        "book",
        "modelKit",
        "figure",
        "calculator",
        "note",
        "watch",
        "pen",
        "draw",
        "studentBook",
        "compaEke",
        "pencilEraser"
      ];

      categories.forEach((cat) => {
        counts[cat] = listProduct.filter((p) => {
          return p.categoryType === cat;
        }).length;
      });

      return counts;
    }, [listProduct]);
    const getValueSelect = (value, type) => {
      if (type === "sort") {
        setShowSortType(value);
      } else {
        setShowQuantity(value);
        setLoadingMoreItem(value);
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
      if (!showCategory || showCategory === "all") {
        console.log("Showing all products:", listProduct.length);
        return listProduct;
      }

      const filtered = listProduct.filter((p) => {
        return p.categoryType === showCategory;
      });
      console.log(
        `Filtered by category ${showCategory}:`,
        filtered.length,
        "products"
      );
      return filtered;
    }, [listProduct, showCategory]);

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
        />

        {/* Sort and Items Per Page */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Sort */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Sắp xếp:
              </span>
              <SelectBoxCustom
                selectOptions={sortArr}
                getValue={getValueSelect}
                type={"sort"}
              />
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
