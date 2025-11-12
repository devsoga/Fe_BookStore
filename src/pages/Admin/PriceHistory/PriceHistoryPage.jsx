import React, { useState, useEffect } from "react";
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaSort,
  FaDownload,
  FaDollarSign,
  FaProductHunt,
  FaCalendarAlt,
  FaUser,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaEye,
  FaChartLine,
  FaFileExport,
  FaEdit,
  FaSave,
  FaTimes,
  FaFileInvoice,
  FaBoxes,
  FaPlus
} from "react-icons/fa";
import ProductInfoCard from "./components/ProductInfoCard";
import InvoiceSelectionSection from "./components/InvoiceSelectionSection";
import PriceInputSection from "./components/PriceInputSection";
import PriceChangeSummary from "./components/PriceChangeSummary";
import { productService } from "~/apis/productService";
import { warehouseService } from "~/apis/warehouseService";
import { priceHistoryService } from "~/apis/price_history";
import { importInvoiceService } from "~/apis/importInvoiceService";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Pagination from "~/components/Admin/Pagination";

const PriceHistoryPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingInvoices, setEditingInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "productCode",
    direction: "asc"
  });
  const [loading, setLoading] = useState(false);

  // Price formatting helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(price || 0);
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  // Load products with import invoice details from API
  const loadProducts = async () => {
    try {
      setLoading(true);

      // 1. Get all products from system
      const allProductsRes = await productService.getAllProduct();
      const allProducts = allProductsRes?.data?.data || [];

      // Process each product to get import invoice data and price history
      const productsWithData = await Promise.all(
        allProducts.map(async (product) => {
          try {
            // 2. Get import invoices for this product
            const importInvoicesRes =
              await priceHistoryService.getImportInvoicesByProductCode(
                product.productCode
              );
            const importInvoices = importInvoicesRes?.data?.data || [];
            const quantityInStockRes =
              await warehouseService.getInventoryByProductCode(
                product.productCode
              );
            product.stockQuantity =
              quantityInStockRes?.data?.data[0]?.quantityOnHand || 0;
            // Calculate import invoice count and latest import price
            let invoiceCount = 0;
            let latestImportPrice = 0;
            let latestImportDate = null;

            if (importInvoices.length > 0) {
              // Count unique import invoice codes
              const uniqueInvoiceCodes = new Set();
              let latestDetail = null;

              importInvoices.forEach((invoice) => {
                if (invoice.importInvoiceCode) {
                  uniqueInvoiceCodes.add(invoice.importInvoiceCode);
                }

                // Find details for this product to get latest import price
                const details = invoice.details || [];
                details.forEach((detail) => {
                  if (detail.productCode === product.productCode) {
                    const detailDate = new Date(detail.createdDate);
                    if (
                      !latestDetail ||
                      detailDate > new Date(latestDetail.createdDate)
                    ) {
                      latestDetail = detail;
                    }
                  }
                });
              });

              invoiceCount = uniqueInvoiceCodes.size;
              if (latestDetail) {
                latestImportPrice = latestDetail.importPrice || 0;
                latestImportDate = latestDetail.createdDate;
              }
            }

            // 3. Get current selling price from price history
            let currentSellingPrice = product.price || 0; // fallback to product.price

            try {
              const priceHistoryRes =
                await priceHistoryService.getPriceHistoryByProductCode(
                  product.productCode
                );
              const priceHistory = priceHistoryRes?.data?.data || [];

              if (priceHistory.length > 0) {
                // Get the most recent price history entry
                const latestPriceEntry = priceHistory.reduce(
                  (latest, current) => {
                    const currentDate = new Date(current.createdDate);
                    const latestDate = new Date(latest.createdDate);
                    return currentDate > latestDate ? current : latest;
                  }
                );

                currentSellingPrice =
                  latestPriceEntry.unitPrice || product.price || 0;
              }
            } catch (priceError) {
              console.warn(
                `Could not get price history for ${product.productCode}:`,
                priceError
              );
              // Use product.price as fallback
            }

            return {
              id: product.productCode,
              productCode: product.productCode,
              productName: product.productName || "-",
              category: product.categoryName || "-",
              currentSellingPrice: currentSellingPrice,
              stockQuantity: product.stockQuantity,
              importInvoiceCount: invoiceCount,
              latestImportPrice: latestImportPrice,
              latestImportDate: latestImportDate,
              // Keep some import invoice data for compatibility
              importInvoices: []
            };
          } catch (error) {
            console.warn(
              `Error processing product ${product.productCode}:`,
              error
            );
            return {
              id: product.productCode,
              productCode: product.productCode,
              productName: product.productName || "-",
              category: product.categoryName || "-",
              currentSellingPrice: product.price || 0,
              stockQuantity: product.stockQuantity || 0,
              importInvoiceCount: 0,
              latestImportPrice: 0,
              latestImportDate: null,
              importInvoices: []
            };
          }
        })
      );

      setProducts(productsWithData);
      setFilteredProducts(productsWithData);
    } catch (error) {
      console.error("Error loading products:", error);
      // Fallback to empty state if API fails
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Search and filter products
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((product) => {
        const term = searchTerm.toLowerCase();
        return (
          product.productCode?.toLowerCase().includes(term) ||
          product.productName?.toLowerCase().includes(term) ||
          product.category?.toLowerCase().includes(term)
        );
      });
    }

    // Sort products
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortConfig.direction === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle sort
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // Handle view product detail (import invoices)
  const handleViewDetail = async (product) => {
    try {
      setLoading(true);

      // Call API to get detailed import invoices for this product
      const response = await priceHistoryService.getImportInvoicesByProductCode(
        product.productCode
      );
      const importInvoicesData = response?.data?.data || [];

      // Transform the data to match our display needs
      const transformedInvoices = [];

      importInvoicesData.forEach((invoice) => {
        // Each invoice can have multiple details for the same product
        invoice.details.forEach((detail) => {
          if (detail.productCode === product.productCode) {
            const quantity = detail.quantity ?? 0;
            const quantitySold = detail.quantitySold ?? 0;
            const remaining = Math.max(0, quantity - quantitySold);

            transformedInvoices.push({
              id: detail.id,
              importInvoiceCode: invoice.importInvoiceCode,
              importInvoiceDetailCode: detail.importInvoiceDetailCode,
              importDate: detail.createdDate || invoice.createdDate,
              importPrice: detail.importPrice,
              quantity: quantity,
              quantitySold: quantitySold,
              remaining: remaining,
              totalAmount: detail.totalAmount,
              status: invoice.status,
              description: invoice.description,
              employeeCode: invoice.employeeCode,
              supplierCode: invoice.supplierCode
            });
          }
        });
      });

      // Sort by date (latest first)
      transformedInvoices.sort(
        (a, b) => new Date(b.importDate) - new Date(a.importDate)
      );

      // Update selected product with detailed invoice data
      setSelectedProduct({
        ...product,
        detailedImportInvoices: transformedInvoices
      });
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error("Error loading detailed import invoices:", error);
      // Fallback to existing data if API fails
      setSelectedProduct(product);
      setIsDetailModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit selling price
  const handleEditPrice = async (product) => {
    try {
      setLoading(true);

      // Fetch import invoices for this product
      const response = await priceHistoryService.getImportInvoicesByProductCode(
        product.productCode
      );
      const importInvoicesData = response?.data?.data || [];

      // Transform invoices with price history data
      const invoicesWithPriceHistory = [];

      // Fetch price history for each invoice detail
      for (const invoice of importInvoicesData) {
        if (!invoice.details) continue;

        for (const detail of invoice.details) {
          if (detail.productCode !== product.productCode) continue;

          try {
            // Fetch price history for this specific invoice code and product code
            const priceHistoryResponse =
              await priceHistoryService.getPriceHistoryByImportInvoiceCodeAndProductCode(
                invoice.importInvoiceCode,
                product.productCode
              );
            const priceHistoryData =
              priceHistoryResponse?.data?.data?.[0] || {};

            const q = detail.quantity ?? 0;
            const qSold = detail.quantitySold ?? 0;
            const rem = Math.max(0, q - qSold);

            invoicesWithPriceHistory.push({
              id: detail.id,
              importInvoiceCode: invoice.importInvoiceCode,
              importInvoiceDetailCode: detail.importInvoiceDetailCode,
              importDate: detail.createdDate || invoice.createdDate,
              importPrice: priceHistoryData.importPrice || detail.importPrice,
              quantity: q,
              quantitySold: qSold,
              remaining: rem,
              totalAmount: detail.totalAmount,
              // Use status from API if available, otherwise use default
              status:
                priceHistoryData.status !== null
                  ? priceHistoryData.status
                  : detail.importPrice === product.currentSellingPrice,
              unitPrice: priceHistoryData.unitPrice, // Current selling price from price history
              priceHistoryCode: priceHistoryData.priceHistoryCode,
              description: invoice.description,
              supplierCode: invoice.supplierCode,
              // Keep raw price history data for reference
              priceHistoryData: priceHistoryData
            });
          } catch (priceError) {
            console.warn(
              `Could not fetch price history for ${invoice.importInvoiceCode}:`,
              priceError
            );
            // Fallback to basic invoice data without price history
            invoicesWithPriceHistory.push({
              id: detail.id,
              importInvoiceCode: invoice.importInvoiceCode,
              importInvoiceDetailCode: detail.importInvoiceDetailCode,
              importDate: detail.createdDate || invoice.createdDate,
              importPrice: detail.importPrice,
              quantity: detail.quantity,
              quantitySold: detail.quantitySold ?? 0,
              remaining: Math.max(
                0,
                (detail.quantity ?? 0) - (detail.quantitySold ?? 0)
              ),
              totalAmount: detail.totalAmount,
              status: detail.importPrice === product.currentSellingPrice,
              unitPrice: null,
              priceHistoryCode: null,
              description: invoice.description,
              supplierCode: invoice.supplierCode,
              priceHistoryData: null
            });
          }
        }
      }

      // Sort by date (latest first)
      invoicesWithPriceHistory.sort(
        (a, b) => new Date(b.importDate) - new Date(a.importDate)
      );

      // Find currently selected invoice (status = true) or default to first
      const currentlySelected = invoicesWithPriceHistory.find(
        (inv) => inv.status === true
      );
      const selectedId =
        currentlySelected?.id || invoicesWithPriceHistory[0]?.id;

      // Get the selling price: prefer unitPrice from price history, fallback to import price
      const sellingPrice =
        currentlySelected?.unitPrice ||
        currentlySelected?.importPrice ||
        product.currentSellingPrice;

      setEditingProduct({
        ...product,
        newSellingPrice: sellingPrice
      });
      setEditingInvoices(invoicesWithPriceHistory);
      setSelectedInvoiceId(selectedId);
      setIsEditPriceModalOpen(true);
    } catch (error) {
      console.error("Error loading import invoices for edit:", error);
      // Fallback to basic edit without invoice selection
      setEditingProduct({
        ...product,
        newSellingPrice: product.currentSellingPrice
      });
      setEditingInvoices([]);
      setSelectedInvoiceId(null);
      setIsEditPriceModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Get latest import price for profit calculation
  const getLatestImportPrice = (product) => {
    // Use pre-calculated latestImportPrice from loadProducts
    return product.latestImportPrice || 0;
  };

  // Get import price from the invoice that corresponds to the current selling price
  // Prefer an invoice with status === true, otherwise match by unitPrice === currentSellingPrice
  const getImportPriceOfAppliedInvoice = (product) => {
    if (!product) return 0;
    // Look for an invoice that is marked as applied (status true)
    let applied = editingInvoices.find((inv) => inv.status === true);
    if (!applied) {
      // Fallback: try to match by unitPrice equal to current selling price
      applied = editingInvoices.find(
        (inv) =>
          (inv.unitPrice != null &&
            inv.unitPrice === product.currentSellingPrice) ||
          (inv.priceHistoryData?.unitPrice != null &&
            inv.priceHistoryData.unitPrice === product.currentSellingPrice)
      );
    }
    return applied?.importPrice || product.latestImportPrice || 0;
  };

  // Calculate profit margin
  const calculateProfitMargin = (sellingPrice, latestImportPrice) => {
    if (!latestImportPrice || latestImportPrice === 0) return 0;
    return ((sellingPrice - latestImportPrice) / latestImportPrice) * 100;
  };

  // Get minimum price from selected invoice
  const getMinimumPrice = () => {
    if (!selectedInvoiceId) return 0;
    const selectedInvoice = editingInvoices.find(
      (inv) => inv.id === selectedInvoiceId
    );
    return selectedInvoice?.importPrice || 0;
  };

  // Check if current price is valid
  const isPriceValid = () => {
    if (!editingProduct?.newSellingPrice) return false;
    const minimumPrice = getMinimumPrice();
    return (
      minimumPrice === 0 || editingProduct?.newSellingPrice >= minimumPrice
    );
  };

  // Handle invoice selection toggle
  const handleInvoiceToggle = (invoiceId) => {
    const selectedInvoice = editingInvoices.find((inv) => inv.id === invoiceId);
    if (selectedInvoice) {
      // mark this invoice as selected and clear others (single-active)
      setSelectedInvoiceId(invoiceId);

      // Determine if this is edit or create mode
      const hasExistingPrice =
        selectedInvoice.unitPrice != null ||
        selectedInvoice.priceHistoryData?.priceHistoryCode;
      const priceToSet = hasExistingPrice
        ? selectedInvoice.unitPrice ||
          selectedInvoice.priceHistoryData?.unitPrice // Edit: use existing selling price
        : selectedInvoice.importPrice; // Create: start with import price

      setEditingProduct((prev) => ({
        ...prev,
        newSellingPrice: priceToSet
      }));

      const updated = editingInvoices.map((inv) => ({
        ...inv,
        status: inv.id === invoiceId
      }));
      setEditingInvoices(updated);
    }
  };

  // Handle save price update
  const handleSavePrice = async () => {
    try {
      setLoading(true);

      const selectedInvoice = editingInvoices.find(
        (inv) => inv.id === selectedInvoiceId
      );
      const priceToApply = editingProduct?.newSellingPrice;

      // Validate: selling price must not be less than import price of selected invoice
      if (!isPriceValid()) {
        const minimumPrice = getMinimumPrice();
        alert(
          `Giá bán không được nhỏ hơn giá nhập của hóa đơn được chọn (${formatPrice(
            minimumPrice
          )})`
        );
        setLoading(false);
        return;
      }

      // Use the API endpoint with invoice code and product code
      if (!selectedInvoice) {
        alert("Vui lòng chọn một hóa đơn nhập!");
        setLoading(false);
        return;
      }

      // Determine if this is create or update mode
      const hasExistingPrice =
        selectedInvoice.unitPrice != null ||
        selectedInvoice.priceHistoryData?.priceHistoryCode;

      if (hasExistingPrice) {
        // UPDATE existing price history using updatePriceHistory API
        await priceHistoryService.updatePriceHistory(
          selectedInvoice.priceHistoryData.priceHistoryCode,
          {
            productCode: editingProduct.productCode,
            unitPrice: priceToApply,
            status: true
          }
        );
        console.log("✓ Updated existing price history successfully!");
      } else {
        // CREATE new price history using createPriceHistory API
        const createData = {
          priceHistoryCode: `PH_${editingProduct.productCode}_${
            selectedInvoice.importInvoiceDetailCode
          }_${Date.now()}`,
          unitPrice: priceToApply,
          status: true,
          productCode: editingProduct.productCode,
          importInvoiceDetailCode: selectedInvoice.importInvoiceDetailCode
        };

        await priceHistoryService.createPriceHistory(createData);
        console.log("✓ Created new price history successfully!");
      }

      // Update all other invoice statuses to false (only one active at a time)
      if (editingInvoices.length > 1) {
        try {
          const otherInvoices = editingInvoices.filter(
            (inv) => inv.id !== selectedInvoiceId
          );
          const statusUpdatePromises = otherInvoices.map(async (invoice) => {
            try {
              if (invoice.priceHistoryData?.priceHistoryCode) {
                // Set other existing price histories to inactive
                await priceHistoryService.updatePriceHistory(
                  invoice.priceHistoryData.priceHistoryCode,
                  {
                    productCode: editingProduct.productCode,
                    unitPrice:
                      invoice.unitPrice || invoice.priceHistoryData?.unitPrice,
                    status: false
                  }
                );
              }
            } catch (statusError) {
              console.warn(
                `Could not update status for invoice ${invoice.importInvoiceCode}:`,
                statusError
              );
            }
          });

          await Promise.allSettled(statusUpdatePromises);
        } catch (error) {
          console.warn("Error updating other invoice statuses:", error);
        }
      }

      // Update local state
      const updatedProducts = products.map((product) => {
        if (product.id === editingProduct.id) {
          return {
            ...product,
            currentSellingPrice: priceToApply
          };
        }
        return product;
      });

      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
      setIsEditPriceModalOpen(false);
      setEditingProduct(null);
      setEditingInvoices([]);
      setSelectedInvoiceId(null);

      // Show success message (you can implement toast notification)
      console.log("✓ Cập nhật giá bán thành công!");
    } catch (error) {
      console.error("Error updating selling price:", error);
      alert("Cập nhật giá bán thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaDollarSign className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Quản lý giá bán sản phẩm
                </h1>
                <p className="text-gray-600 text-lg">
                  Quản lý giá bán sản phẩm dựa trên hóa đơn nhập hàng
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã sản phẩm, tên sản phẩm, danh mục..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value={10}>10 sản phẩm/trang</option>
                <option value={25}>25 sản phẩm/trang</option>
                <option value={50}>50 sản phẩm/trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Tổng sản phẩm
                </p>
                <p className="text-3xl font-bold">{products.length}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FaBoxes className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">
                  Tổng hóa đơn nhập
                </p>
                <p className="text-3xl font-bold">
                  {products.reduce(
                    (sum, p) => sum + (p.importInvoiceCount || 0),
                    0
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FaFileInvoice className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">
                  Tồn kho
                </p>
                <p className="text-3xl font-bold">
                  {products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FaChartLine className="text-white text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <FaBoxes className="text-blue-600" />
              Danh sách sản phẩm
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    <button
                      onClick={() => handleSort("productCode")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Mã sản phẩm
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    <button
                      onClick={() => handleSort("productName")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Tên sản phẩm
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Thông tin cơ bản
                  </th>
                  <th className="px-8 py-5 text-right text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    <button
                      onClick={() => handleSort("currentSellingPrice")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors ml-auto"
                    >
                      Giá bán hiện tại
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-8 py-5 text-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        <span className="mt-4 text-gray-600 font-medium">
                          Đang tải dữ liệu...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FaBoxes className="text-gray-300 text-6xl mb-4" />
                        <span className="text-gray-500 text-lg font-medium">
                          Không tìm thấy sản phẩm nào
                        </span>
                        <span className="text-gray-400 text-sm mt-2">
                          Thử thay đổi từ khóa tìm kiếm
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product) => {
                    const latestImportPrice = getLatestImportPrice(product);
                    const profitMargin = calculateProfitMargin(
                      product.currentSellingPrice,
                      latestImportPrice
                    );

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                              <FaBoxes className="text-blue-600 text-sm" />
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {product.productCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div>
                            <div className="text-lg font-semibold text-gray-900 mb-1 max-w-[320px] truncate">
                              {product.productName}
                            </div>
                            <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block">
                              {typeof product.category === "object"
                                ? product.category?.categoryName ||
                                  product.category?.categoryCode ||
                                  "Unknown Category"
                                : product.category || "Unknown Category"}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Tồn kho:</span>
                              <span className="font-semibold text-gray-900">
                                {product.stockQuantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Số hóa đơn:</span>
                              <span className="font-semibold text-gray-900">
                                {product.importInvoiceCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">
                                Nhập gần nhất:
                              </span>
                              <span className="font-semibold text-gray-900">
                                {formatPrice(latestImportPrice)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="space-y-2">
                            <div className="text-xl font-bold text-gray-900">
                              {formatPrice(product.currentSellingPrice)}
                            </div>
                            <div
                              className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${
                                profitMargin > 0
                                  ? "text-green-700 bg-green-100"
                                  : profitMargin < 0
                                  ? "text-red-700 bg-red-100"
                                  : "text-gray-700 bg-gray-100"
                              }`}
                            >
                              Lãi: {profitMargin.toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleViewDetail(product)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                              title="Xem chi tiết hóa đơn nhập"
                            >
                              <FaEye className="text-sm" />
                              Chi tiết
                            </button>
                            <button
                              onClick={() => handleEditPrice(product)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                              title="Cập nhật giá bán"
                            >
                              <FaEdit className="text-sm" />
                              Cập nhật giá
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Product Detail Modal - Import Invoices */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedProduct(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaFileInvoice className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Chi tiết hóa đơn nhập</span>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedProduct?.productName} ({selectedProduct?.productCode}
                  )
                </div>
              </div>
            </div>
          }
          size="full"
        >
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Thông tin sản phẩm
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Mã sản phẩm</p>
                    <p className="font-bold text-lg text-blue-600">
                      {selectedProduct.productCode}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Danh mục</p>
                    <p className="font-semibold text-gray-900">
                      {typeof selectedProduct.category === "object"
                        ? selectedProduct.category?.categoryName ||
                          selectedProduct.category?.categoryCode ||
                          "Unknown Category"
                        : selectedProduct.category || "Unknown Category"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Tồn kho</p>
                    <p className="font-bold text-lg text-green-600">
                      {selectedProduct.stockQuantity}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-1">
                      Giá bán hiện tại
                    </p>
                    <p className="font-bold text-lg text-purple-600">
                      {formatPrice(selectedProduct.currentSellingPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Import Invoices List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                  <FaFileInvoice className="text-blue-600" />
                  Danh sách hóa đơn nhập (
                  {selectedProduct.detailedImportInvoices?.length ||
                    selectedProduct.importInvoices?.length ||
                    0}{" "}
                  hóa đơn)
                </h4>

                {(!selectedProduct.detailedImportInvoices ||
                  selectedProduct.detailedImportInvoices.length === 0) &&
                (!selectedProduct.importInvoices ||
                  selectedProduct.importInvoices.length === 0) ? (
                  <div className="text-center py-12">
                    <FaFileInvoice className="text-gray-300 text-6xl mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">
                      Chưa có hóa đơn nhập nào
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Sản phẩm này chưa được nhập hàng
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">
                              Mã hóa đơn
                            </th>

                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">
                              Ngày nhập
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">
                              Số lượng
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">
                              Giá nhập
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">
                              Thành tiền
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(
                            selectedProduct.detailedImportInvoices ||
                            selectedProduct.importInvoices ||
                            []
                          ).map((invoice, index) => (
                            <tr
                              key={invoice.id || index}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <FaFileInvoice className="text-purple-600 text-xs" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-900 block">
                                      {invoice.importInvoiceCode || "N/A"}
                                    </span>
                                    {invoice.description && (
                                      <span className="text-xs text-gray-500">
                                        {invoice.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-gray-900">
                                {formatDate(invoice.importDate)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-semibold text-gray-900">
                                  {invoice.remaining ??
                                    Math.max(
                                      0,
                                      (invoice.quantity ?? 0) -
                                        (invoice.quantitySold ?? 0)
                                    )}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-bold text-lg text-green-600">
                                  {formatPrice(invoice.importPrice)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-bold text-lg text-blue-600">
                                  {formatPrice(
                                    invoice.totalAmount ||
                                      invoice.importPrice * invoice.quantity
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Invoice Info */}
                {selectedProduct.detailedImportInvoices &&
                  selectedProduct.detailedImportInvoices.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl">
                      <h5 className="text-md font-semibold text-gray-900 mb-3">
                        Thông tin bổ sung
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">
                            Tổng số lần nhập:
                          </span>
                          <span className="font-semibold text-gray-900 ml-2">
                            {selectedProduct.detailedImportInvoices.length}
                          </span>
                        </div>
                        <div>
                          <div>
                            <div>
                              <span className="text-gray-600">
                                Tổng số lượng nhập:
                              </span>
                              <span className="font-semibold text-gray-900 ml-2">
                                {selectedProduct.detailedImportInvoices.reduce(
                                  (sum, inv) => sum + (inv.quantity || 0),
                                  0
                                )}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className="text-gray-600">
                                Tổng tồn thực tế:
                              </span>
                              <span className="font-semibold text-gray-900 ml-2">
                                {selectedProduct.detailedImportInvoices.reduce(
                                  (sum, inv) =>
                                    sum +
                                    (inv.remaining ??
                                      Math.max(
                                        0,
                                        (inv.quantity ?? 0) -
                                          (inv.quantitySold ?? 0)
                                      )),
                                  0
                                )}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Tổng giá trị nhập:
                            </span>
                            <span className="font-semibold text-green-600 ml-2">
                              {formatPrice(
                                selectedProduct.detailedImportInvoices.reduce(
                                  (sum, inv) =>
                                    sum +
                                    (inv.totalAmount ||
                                      inv.importPrice * inv.quantity ||
                                      0),
                                  0
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Price Modal */}
        <Modal
          isOpen={isEditPriceModalOpen}
          onClose={() => {
            setIsEditPriceModalOpen(false);
            setEditingProduct(null);
            setEditingInvoices([]);
            setSelectedInvoiceId(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaEdit className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Cập nhật giá bán</span>
                <div className="text-sm text-gray-600 mt-1">
                  {editingProduct?.productName} ({editingProduct?.productCode})
                </div>
              </div>
            </div>
          }
          size="full"
        >
          {editingProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <ProductInfoCard
                product={editingProduct}
                importPrice={getImportPriceOfAppliedInvoice(editingProduct)}
                profitMargin={calculateProfitMargin(
                  editingProduct.currentSellingPrice,
                  getImportPriceOfAppliedInvoice(editingProduct)
                )}
                formatPrice={formatPrice}
              />

              {/* Invoice Selection Section */}
              <InvoiceSelectionSection
                editingInvoices={editingInvoices}
                selectedInvoiceId={selectedInvoiceId}
                handleInvoiceToggle={handleInvoiceToggle}
                formatPrice={formatPrice}
                formatDate={formatDate}
              />

              {/* Price Input Section */}
              <PriceInputSection
                selectedInvoiceId={selectedInvoiceId}
                editingInvoices={editingInvoices}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                getMinimumPrice={getMinimumPrice}
                isPriceValid={isPriceValid}
                formatPrice={formatPrice}
              />

              {/* Price Change Summary */}
              <PriceChangeSummary
                editingProduct={editingProduct}
                getLatestImportPrice={getImportPriceOfAppliedInvoice}
                calculateProfitMargin={calculateProfitMargin}
                formatPrice={formatPrice}
              />
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditPriceModalOpen(false);
                setEditingProduct(null);
                setEditingInvoices([]);
                setSelectedInvoiceId(null);
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleSavePrice}
              disabled={
                !editingProduct?.newSellingPrice ||
                (editingProduct?.newSellingPrice || 0) <= 0 ||
                editingProduct?.newSellingPrice ===
                  editingProduct?.currentSellingPrice ||
                !isPriceValid() ||
                loading
              }
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <FaSave className="text-lg" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default PriceHistoryPage;
