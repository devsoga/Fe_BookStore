import React, { useEffect, useState, useRef } from "react";
import { FaSearch } from "react-icons/fa";

const FiltersBar = ({
  searchTerm,
  setSearchTerm,
  categories = [],
  filterCategory,
  setFilterCategory,
  priceRange = { min: "", max: "" },
  setPriceRange,
  sortConfig = { key: "productName", direction: "asc" },
  setSortConfig,
  viewMode,
  setViewMode,
  liveSearch = true
}) => {
  const categoriesSafe = Array.isArray(categories) ? categories : [];
  const sortValue = `${sortConfig?.key || "productName"}-${
    sortConfig?.direction || "asc"
  }`;

  // Local debounced search input to avoid firing parent updates on every keystroke
  const [localSearch, setLocalSearch] = useState(searchTerm || "");
  const inputRef = useRef(null);

  // when parent resets searchTerm, keep local in sync — but don't clobber while user is typing
  useEffect(() => {
    try {
      const isFocused = document.activeElement === inputRef.current;
      if (!isFocused) {
        setLocalSearch(searchTerm || "");
      }
    } catch (e) {
      // In non-browser envs, just sync
      setLocalSearch(searchTerm || "");
    }
  }, [searchTerm]);

  // write back to parent: immediate for realtime, otherwise debounced
  useEffect(() => {
    if (liveSearch) {
      if (typeof setSearchTerm === "function") setSearchTerm(localSearch);
      return;
    }
    const t = setTimeout(() => {
      if (typeof setSearchTerm === "function") setSearchTerm(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchTerm, liveSearch]);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Search */}
        <div className="lg:col-span-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm sản phẩm, mã, tác giả..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // immediately apply on Enter
                  if (typeof setSearchTerm === "function")
                    setSearchTerm(localSearch);
                }
              }}
              aria-label="Tìm kiếm sản phẩm"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Clear button */}
            {localSearch ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setLocalSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-2">
          <select
            value={filterCategory || ""}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả danh mục</option>
            {categoriesSafe.map((category) => (
              <option key={category.categoryCode} value={category.categoryCode}>
                {category.categoryName}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="lg:col-span-3">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Giá từ"
              value={priceRange.min}
              onChange={(e) =>
                setPriceRange({
                  ...priceRange,
                  min: e.target.value === "" ? "" : Number(e.target.value)
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="Giá đến"
              value={priceRange.max}
              onChange={(e) =>
                setPriceRange({
                  ...priceRange,
                  max: e.target.value === "" ? "" : Number(e.target.value)
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="lg:col-span-2">
          <select
            value={sortValue}
            onChange={(e) => {
              const [key, direction] = e.target.value.split("-");
              setSortConfig({ key, direction });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="productName-asc">Tên A→Z</option>
            <option value="productName-desc">Tên Z→A</option>
            <option value="price-asc">Giá thấp→cao</option>
            <option value="price-desc">Giá cao→thấp</option>
            <option value="stock-desc">Tồn kho nhiều→ít</option>
            <option value="productCode-asc">Mã sản phẩm</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="lg:col-span-1">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              <div className="space-y-1 w-4 h-4">
                <div className="bg-current h-0.5 rounded"></div>
                <div className="bg-current h-0.5 rounded"></div>
                <div className="bg-current h-0.5 rounded"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
