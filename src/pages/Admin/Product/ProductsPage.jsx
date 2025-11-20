import React, { useState, useEffect } from "react";
import {
  FaEdit,
  FaPlus,
  FaTimes,
  FaBook,
  FaHome,
  FaFileExport,
  FaExclamationTriangle,
  FaCheck,
  FaInfoCircle,
  FaShoppingCart,
  FaTag
} from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import { productService } from "../../../apis/productService";
import promotionService from "../../../apis/promotionService";
import { useNavigate } from "react-router-dom";
import { buildImageUrl } from "../../../lib/utils";
import ProductCard from "./components/ProductCard";
import ProductForm from "./components/ProductForm";
import FiltersBar from "./components/FiltersBar";
import ProductsTable from "./components/ProductsTable";
import ProductStatsChart from "./components/ProductStatsChart";

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [promotionSearchTerm, setPromotionSearchTerm] = useState("");
  const [applyingPromotionCode, setApplyingPromotionCode] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "productCode",
    direction: "asc"
  });
  const [filterCategory, setFilterCategory] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [previewImageFile, setPreviewImageFile] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const navigate = useNavigate();

  // helpers for confirmation / toasts using confirmModal state
  const showSuccessModal = (title, message) =>
    setConfirmModal({
      isOpen: true,
      type: "success",
      title,
      message,
      confirmText: "OK",
      onConfirm: () => setConfirmModal({ isOpen: false })
    });

  const showErrorModal = (title, message) =>
    setConfirmModal({
      isOpen: true,
      type: "error",
      title,
      message,
      confirmText: "OK",
      onConfirm: () => setConfirmModal({ isOpen: false })
    });

  const showDeleteConfirm = (productCode, productName) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      title: "Xóa sản phẩm",
      message: `Bạn có chắc muốn xóa sản phẩm "${productName}"?`,
      cancelText: "Hủy bỏ",
      confirmText: "Xóa",
      onCancel: () => setConfirmModal({ isOpen: false }),
      onConfirm: async () => {
        setLoading(true);
        try {
          await productService.deleteProduct(productCode);
          await loadProducts();
          showSuccessModal(
            "Xóa thành công",
            `Sản phẩm "${productName}" đã được xóa.`
          );
        } catch (err) {
          console.error(err);
          showErrorModal(
            "Xóa thất bại",
            `Không thể xóa sản phẩm "${productName}". Vui lòng thử lại sau.`
          );
        } finally {
          setLoading(false);
          setConfirmModal({ isOpen: false });
        }
      }
    });
  };

  const loadProducts = async () => {
    try {
      const resp = await productService.getAllProduct();

      // API responses vary: axios returns { data: ... }
      // Some endpoints return { data: { data: [...] } }
      // Normalize to an array of products.
      let data = [];
      if (!resp) data = [];
      else if (Array.isArray(resp.data)) data = resp.data;
      else if (resp.data && Array.isArray(resp.data.data))
        data = resp.data.data;
      else if (resp.data && Array.isArray(resp.data.items))
        data = resp.data.items;
      else data = Array.isArray(resp.data) ? resp.data : [];

      setProducts(data);
      setFilteredProducts(data);

      // derive categories (only when data is array)
      const cats = [];
      if (Array.isArray(data)) {
        data.forEach((p) => {
          if (
            p &&
            p.categoryCode &&
            !cats.find((c) => c.categoryCode === p.categoryCode)
          ) {
            cats.push({
              categoryCode: p.categoryCode,
              categoryName: p.categoryName || ""
            });
          }
        });
      }
      setCategories(cats);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setFilteredProducts([]);
      setCategories([]);
    }
  };

  // Load available promotions
  const loadPromotions = async () => {
    try {
      const response = await promotionService.getAllPromotions();
      const data = response?.data?.data || [];
      // Only show active promotions
      const activePromotions = data.filter(
        (p) => p.status && (!p.endDate || new Date(p.endDate) > new Date())
      );
      setPromotions(activePromotions);
    } catch (error) {
      console.error("Error loading promotions:", error);
      setPromotions([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadPromotions();
    return () => {
      // revoke any created object URLs
      if (previewImage && previewImage.startsWith("blob:"))
        URL.revokeObjectURL(previewImage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time filtering effect
  useEffect(() => {
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }

    let filtered = [...products];

    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const name = (product.productName || "").toLowerCase();
        const code = (product.productCode || "").toLowerCase();
        const author = (product.author || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        return (
          name.includes(term) ||
          code.includes(term) ||
          author.includes(term) ||
          description.includes(term)
        );
      });
    }

    // Filter by category
    if (filterCategory && filterCategory.trim()) {
      filtered = filtered.filter(
        (product) => product.categoryCode === filterCategory
      );
    }

    // Filter by price range
    if (priceRange.min !== "" || priceRange.max !== "") {
      filtered = filtered.filter((product) => {
        const price = Number(product.price) || 0;
        const minPrice = priceRange.min !== "" ? Number(priceRange.min) : 0;
        const maxPrice =
          priceRange.max !== "" ? Number(priceRange.max) : Infinity;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Sort products
    const { key, direction } = sortConfig;
    if (key && direction) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        switch (key) {
          case "productName":
            aVal = (a.productName || "").toLowerCase();
            bVal = (b.productName || "").toLowerCase();
            break;
          case "price":
            aVal = Number(a.price) || 0;
            bVal = Number(b.price) || 0;
            break;
          case "stock":
            aVal = Number(a.stock ?? a.stockQuantity) || 0;
            bVal = Number(b.stock ?? b.stockQuantity) || 0;
            break;
          case "productCode":
            aVal = (a.productCode || "").toLowerCase();
            bVal = (b.productCode || "").toLowerCase();
            break;
          default:
            aVal = a[key] || "";
            bVal = b[key] || "";
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return direction === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [products, searchTerm, filterCategory, priceRange, sortConfig]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setPreviewImage("");
    setPreviewImageFile(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setPreviewImage(product.image || "");
    setPreviewImageFile(null);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (productOrCode) => {
    if (!productOrCode) return;
    let code = null;
    let name = null;
    if (typeof productOrCode === "string") {
      code = productOrCode;
      const p = products.find((x) => x.productCode === code) || {};
      name = p.productName || code;
    } else if (typeof productOrCode === "object") {
      code = productOrCode.productCode;
      name = productOrCode.productName || code;
    }
    if (!code) return;
    showDeleteConfirm(code, name);
  };

  // Handle opening promotion modal for a product
  const handleAddPromotion = (product) => {
    setSelectedProduct(product);
    setPromotionSearchTerm("");
    setIsPromotionModalOpen(true);
  };

  // Handle applying promotion to product
  const handleApplyPromotion = async (promotionCode) => {
    if (!selectedProduct) return;

    setApplyingPromotionCode(promotionCode);
    setLoading(true);
    try {
      // Update product with promotion
      const updateData = {
        promotionCode: promotionCode,
        promotionName:
          promotions.find((p) => p.promotionCode === promotionCode)
            ?.promotionName || "",
        discountValue:
          promotions.find((p) => p.promotionCode === promotionCode)?.value || 0
      };

      await productService.updateProduct(
        selectedProduct.productCode,
        updateData
      );
      await loadProducts();
      setIsPromotionModalOpen(false);
      setSelectedProduct(null);

      showSuccessModal(
        "Thêm khuyến mãi thành công",
        `Đã áp dụng khuyến mãi cho sản phẩm "${selectedProduct.productName}"`
      );
    } catch (error) {
      console.error("Error applying promotion:", error);
      showErrorModal(
        "Lỗi khi thêm khuyến mãi",
        "Không thể áp dụng khuyến mãi cho sản phẩm. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
      setApplyingPromotionCode(null);
    }
  };

  // Handle removing promotion from product
  const handleRemovePromotion = async (product) => {
    // Optimistically update UI so the promotion column shows cleared immediately
    const prodCode = product?.productCode;
    if (prodCode) {
      // Only clear promotionCode locally (leave name/value intact until server confirms)
      setProducts((prev) =>
        Array.isArray(prev)
          ? prev.map((p) =>
              p.productCode === prodCode ? { ...p, promotionCode: null } : p
            )
          : prev
      );
      setFilteredProducts((prev) =>
        Array.isArray(prev)
          ? prev.map((p) =>
              p.productCode === prodCode ? { ...p, promotionCode: null } : p
            )
          : prev
      );
    }

    setLoading(true);
    try {
      // Only send promotionCode:null so backend will clear the code column
      const updateData = {
        promotionCode: null
      };

      await productService.updateProduct(product.productCode, updateData);
      // reload to ensure server canonical state
      await loadProducts();

      // close the promotion modal and clear selection
      setIsPromotionModalOpen(false);
      setSelectedProduct(null);
      setPromotionSearchTerm("");

      showSuccessModal(
        "Xóa khuyến mãi thành công",
        `Đã xóa khuyến mãi khỏi sản phẩm "${product.productName}"`
      );
    } catch (error) {
      console.error("Error removing promotion:", error);
      showErrorModal(
        "Lỗi khi xóa khuyến mãi",
        "Không thể xóa khuyến mãi khỏi sản phẩm. Vui lòng thử lại."
      );
      // rollback: reload products to restore previous values
      try {
        await loadProducts();
      } catch (e) {
        console.error(
          "Error reloading products after failed promotion removal:",
          e
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorModal(
        "File không hợp lệ",
        "Vui lòng chọn file ảnh hợp lệ (PNG, JPG, JPEG, GIF, WebP)."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorModal(
        "File quá lớn",
        "Kích thước file không được vượt quá 5MB. Vui lòng chọn file ảnh nhỏ hơn."
      );
      return;
    }

    if (previewImage && previewImage.startsWith("blob:"))
      URL.revokeObjectURL(previewImage);
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    setPreviewImageFile(file);
  };

  const removeImage = () => {
    if (previewImage && previewImage.startsWith("blob:"))
      URL.revokeObjectURL(previewImage);
    setPreviewImage("");
    setPreviewImageFile(null);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    const selectedCategoryCode = formData.get("categoryCode");
    const categoryObj =
      categories.find((c) => c.categoryCode === selectedCategoryCode) || {};

    const productData = {
      productCode:
        formData.get("productCode") ||
        (editingProduct && editingProduct.productCode) ||
        null,
      productName: formData.get("productName") || null,
      description: formData.get("description") || null,
      image: previewImage || (editingProduct && editingProduct.image) || null,
      author: formData.get("author") || null,
      publisher: formData.get("publisher") || null,
      price: formData.get("price")
        ? parseFloat(formData.get("price"))
        : editingProduct && editingProduct.price != null
        ? editingProduct.price
        : null,
      importPrice: formData.get("importPrice")
        ? parseFloat(formData.get("importPrice"))
        : editingProduct && editingProduct.importPrice != null
        ? editingProduct.importPrice
        : null,
      promotionCode: formData.get("promotionCode") || null,
      promotionName: formData.get("promotionName") || null,
      discountValue: formData.get("discountValue")
        ? parseFloat(formData.get("discountValue"))
        : null,
      categoryCode: selectedCategoryCode || categoryObj.categoryCode || null,
      stockQuantity: formData.get("stock")
        ? parseInt(formData.get("stock"))
        : editingProduct &&
          (editingProduct.stock ?? editingProduct.stockQuantity) != null
        ? editingProduct.stock ?? editingProduct.stockQuantity
        : null
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(productData).filter(
        ([, v]) => v !== null && v !== undefined
      )
    );

    const sendPayload = async () => {
      try {
        if (previewImageFile) {
          const fd = new FormData();
          fd.append("image", previewImageFile);
          Object.entries(cleanPayload).forEach(([k, v]) => {
            if (k === "image") return;
            if (v !== null && v !== undefined) fd.append(k, v);
          });

          if (editingProduct) {
            const codeToUse =
              editingProduct.productCode || cleanPayload.productCode;
            await productService.updateProduct(codeToUse, fd);
            showSuccessModal(
              "Cập nhật thành công",
              `Sản phẩm "${
                cleanPayload.productName || "sản phẩm"
              }" đã được cập nhật thành công!`
            );
          } else {
            await productService.createProduct(fd);
            showSuccessModal(
              "Thêm thành công",
              `Sản phẩm "${
                cleanPayload.productName || "sản phẩm"
              }" đã được thêm thành công!`
            );
          }
        } else {
          if (editingProduct) {
            const codeToUse =
              editingProduct.productCode || cleanPayload.productCode;
            await productService.updateProduct(codeToUse, cleanPayload);
            showSuccessModal(
              "Cập nhật thành công",
              `Sản phẩm "${
                cleanPayload.productName || "sản phẩm"
              }" đã được cập nhật thành công!`
            );
          } else {
            await productService.createProduct(cleanPayload);
            showSuccessModal(
              "Thêm thành công",
              `Sản phẩm "${
                cleanPayload.productName || "sản phẩm"
              }" đã được thêm thành công!`
            );
          }
        }
      } catch (err) {
        console.error(err);
        const productName = cleanPayload.productName || "sản phẩm";
        const action = editingProduct ? "cập nhật" : "thêm";
        showErrorModal(
          `Lỗi khi ${action} sản phẩm`,
          `Không thể ${action} sản phẩm "${productName}". Vui lòng kiểm tra thông tin và thử lại.`
        );
      }
    };

    (async () => {
      try {
        await sendPayload();
        await loadProducts();
        setIsModalOpen(false);
        setEditingProduct(null);
        setPreviewImage("");
        setPreviewImageFile(null);
      } finally {
        setLoading(false);
      }
    })();
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value)))
      return "-";
    try {
      return Number(value).toLocaleString("vi-VN");
    } catch (e) {
      return String(value);
    }
  };

  const normalizeImage = (img) => {
    if (!img) return null;
    if (typeof img !== "string") return img;
    if (img.startsWith("blob:") || img.startsWith("data:")) return img;
    return buildImageUrl(img);
  };

  // Filter promotions based on search
  const filteredPromotions = promotions.filter(
    (promotion) =>
      promotion.promotionName
        ?.toLowerCase()
        .includes(promotionSearchTerm.toLowerCase()) ||
      promotion.promotionCode
        ?.toLowerCase()
        .includes(promotionSearchTerm.toLowerCase())
  );

  const paginatedData = Array.isArray(filteredProducts)
    ? filteredProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      )
    : [];
  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  // derived counts for stats/chart
  const totalCount = Array.isArray(products) ? products.length : 0;
  const inStockCount = Array.isArray(products)
    ? products.filter((p) => (p?.stock ?? p?.stockQuantity ?? 0) > 0).length
    : 0;
  const outOfStockCount = totalCount - inStockCount;
  // low stock: stock >0 and <5
  const lowStockCount = Array.isArray(products)
    ? products.filter((p) => {
        const s = p?.stock ?? p?.stockQuantity ?? 0;
        return s > 0 && s < 5;
      }).length
    : 0;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <FaBook className="text-white text-lg" />
                  </div>
                  Quản lý sản phẩm
                </h1>
                <p className="text-gray-600 mt-1">
                  Quản lý toàn bộ sản phẩm trong cửa hàng
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/admin")}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  title="Quay về dashboard"
                >
                  <FaHome />
                  Dashboard
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <FaFileExport />
                  Xuất Excel
                </button>
                <button
                  onClick={handleAddProduct}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <FaPlus />
                  Thêm sản phẩm
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Dashboard top: stat cards + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left: stat cards grid (spans 2 cols on lg) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <FaBook />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tổng sản phẩm</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {totalCount}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                  <FaShoppingCart />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sản phẩm còn hàng</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {inStockCount}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                  <FaTimes />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sản phẩm hết hàng</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {outOfStockCount}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
                  <FaExclamationTriangle />
                </div>
                <div>
                  <div className="text-sm text-gray-500">
                    Sắp hết hàng (&lt;5)
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    {lowStockCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: chart */}
            <div className="lg:col-span-1">
              <ProductStatsChart
                counts={{
                  total: totalCount,
                  inStock: inStockCount,
                  outOfStock: outOfStockCount,
                  lowStock: lowStockCount
                }}
              />
            </div>
          </div>

          <FiltersBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categories={categories}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {paginatedData.map((product) => (
                <ProductCard
                  key={product.productCode}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onAddPromotion={handleAddPromotion}
                  onRemovePromotion={handleRemovePromotion}
                  promotions={promotions}
                  normalizeImage={normalizeImage}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            <ProductsTable
              paginatedData={paginatedData}
              normalizeImage={normalizeImage}
              formatCurrency={formatCurrency}
              handleEditProduct={handleEditProduct}
              handleDeleteProduct={handleDeleteProduct}
              handleAddPromotion={handleAddPromotion}
              handleRemovePromotion={handleRemovePromotion}
              promotions={promotions}
            />
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaBook className="text-gray-400 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy sản phẩm
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc thêm sản phẩm mới
              </p>
              <button
                onClick={handleAddProduct}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Thêm sản phẩm đầu tiên
              </button>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between mt-8 bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
              <div className="text-sm text-gray-600">
                Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredProducts.length)}{" "}
                trong tổng số {filteredProducts.length} sản phẩm
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={12}>12 / trang</option>
                  <option value={24}>24 / trang</option>
                  <option value={48}>48 / trang</option>
                  <option value={96}>96 / trang</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      Math.max(1, Math.min(totalPages - 4, currentPage - 2)) +
                      i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      {editingProduct ? (
                        <FaEdit className="text-lg" />
                      ) : (
                        <FaPlus className="text-lg" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {editingProduct
                          ? "Chỉnh sửa sản phẩm"
                          : "Thêm sản phẩm mới"}
                      </h2>
                      <p className="text-blue-100 text-sm">
                        {editingProduct
                          ? "Cập nhật thông tin sản phẩm"
                          : "Tạo sản phẩm mới trong hệ thống"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProduct(null);
                      removeImage();
                    }}
                    className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <ProductForm
                editingProduct={editingProduct}
                previewImage={previewImage}
                previewImageFile={previewImageFile}
                handleImageUpload={handleImageUpload}
                removeImage={removeImage}
                categories={categories}
                handleSaveProduct={handleSaveProduct}
                setIsModalOpen={setIsModalOpen}
                setEditingProduct={setEditingProduct}
                setPreviewImage={setPreviewImage}
                setPreviewImageFile={setPreviewImageFile}
                formatCurrency={formatCurrency}
                normalizeImage={normalizeImage}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Promotion Selection Modal */}
        {isPromotionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <FaTag className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        Thêm khuyến mãi cho sản phẩm
                      </h2>
                      <p className="text-purple-100 text-sm">
                        {selectedProduct?.productName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsPromotionModalOpen(false);
                      setSelectedProduct(null);
                      setPromotionSearchTerm("");
                    }}
                    className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Search promotions */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm khuyến mãi..."
                      value={promotionSearchTerm}
                      onChange={(e) => setPromotionSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pl-10"
                    />
                    <FaTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    {promotionSearchTerm && (
                      <button
                        onClick={() => setPromotionSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                        title="Xóa tìm kiếm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Current promotion */}
                {selectedProduct?.promotionCode && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-yellow-800">
                          Khuyến mãi hiện tại
                        </h4>
                        <p className="text-sm text-yellow-600">
                          {selectedProduct.promotionName} (
                          {selectedProduct.promotionCode})
                        </p>
                        <p className="text-sm text-yellow-600">
                          Giảm:{" "}
                          {selectedProduct.discountValue <= 1
                            ? `${(selectedProduct.discountValue * 100).toFixed(
                                0
                              )}%`
                            : formatCurrency(selectedProduct.discountValue)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemovePromotion(selectedProduct)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        disabled={loading}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}

                {/* Promotions list */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredPromotions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaTag className="mx-auto text-4xl mb-2 opacity-50" />
                      <p>Không tìm thấy khuyến mãi nào</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredPromotions.map((promotion) => {
                        const isApplied =
                          selectedProduct?.promotionCode ===
                          promotion.promotionCode;
                        return (
                          <div
                            key={promotion.promotionCode}
                            className={`relative rounded-lg p-4 border transition-colors cursor-pointer ${
                              isApplied
                                ? "border-purple-600 bg-purple-50 shadow-sm"
                                : "border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                    {promotion.promotionCode}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      promotion.status
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {promotion.status
                                      ? "Đang hoạt động"
                                      : "Tạm dừng"}
                                  </span>
                                </div>
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {promotion.promotionName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Giảm:{" "}
                                  {promotion.value <= 1
                                    ? `${(promotion.value * 100).toFixed(0)}%`
                                    : formatCurrency(promotion.value)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {promotion.startDate && promotion.endDate && (
                                    <>
                                      Từ{" "}
                                      {new Date(
                                        promotion.startDate
                                      ).toLocaleDateString("vi-VN")}{" "}
                                      đến{" "}
                                      {new Date(
                                        promotion.endDate
                                      ).toLocaleDateString("vi-VN")}
                                    </>
                                  )}
                                </p>
                              </div>

                              <div className="flex-shrink-0">
                                <button
                                  onClick={() =>
                                    handleApplyPromotion(
                                      promotion.promotionCode
                                    )
                                  }
                                  className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                                    isApplied
                                      ? "bg-gray-400 cursor-default"
                                      : "bg-purple-600 hover:bg-purple-700"
                                  }`}
                                  disabled={
                                    loading ||
                                    isApplied ||
                                    applyingPromotionCode
                                  }
                                  title={
                                    isApplied
                                      ? "Đang áp dụng"
                                      : "Áp dụng khuyến mãi"
                                  }
                                >
                                  {applyingPromotionCode ===
                                    promotion.promotionCode && loading ? (
                                    <svg
                                      className="animate-spin h-4 w-4 mx-auto"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                      ></path>
                                    </svg>
                                  ) : isApplied ? (
                                    "Đang áp dụng"
                                  ) : (
                                    "Áp dụng"
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div
                className={`p-6 ${
                  confirmModal.type === "delete"
                    ? "bg-red-50"
                    : confirmModal.type === "success"
                    ? "bg-green-50"
                    : confirmModal.type === "error"
                    ? "bg-red-50"
                    : "bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      confirmModal.type === "delete"
                        ? "bg-red-100"
                        : confirmModal.type === "success"
                        ? "bg-green-100"
                        : confirmModal.type === "error"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {confirmModal.type === "delete" && (
                      <FaExclamationTriangle className="text-red-600 text-xl" />
                    )}
                    {confirmModal.type === "success" && (
                      <FaCheck className="text-green-600 text-xl" />
                    )}
                    {confirmModal.type === "error" && (
                      <FaExclamationTriangle className="text-red-600 text-xl" />
                    )}
                    {confirmModal.type === "info" && (
                      <FaInfoCircle className="text-blue-600 text-xl" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold ${
                        confirmModal.type === "delete"
                          ? "text-red-800"
                          : confirmModal.type === "success"
                          ? "text-green-800"
                          : confirmModal.type === "error"
                          ? "text-red-800"
                          : "text-blue-800"
                      }`}
                    >
                      {confirmModal.title}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="px-6 pb-6 flex items-center justify-end gap-3">
                {confirmModal.cancelText && (
                  <button
                    onClick={confirmModal.onCancel}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {confirmModal.cancelText}
                  </button>
                )}
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    confirmModal.type === "delete"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : confirmModal.type === "success"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : confirmModal.type === "error"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ProductsPage;
