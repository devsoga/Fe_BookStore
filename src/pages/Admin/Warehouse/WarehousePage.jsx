import React, { useState, useEffect } from "react";
import {
  FaWarehouse,
  FaSearch,
  FaFilter,
  FaSort,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaBoxes,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBarcode,
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBox
} from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Pagination from "~/components/Admin/Pagination";
import { warehouseService } from "~/apis/warehouseService";
import { priceHistoryService } from "~/apis/price_history";
import { productService } from "~/apis/productService";
import { categoryService } from "~/apis/categoryService";
import { cancelProductService } from "~/apis/cancelProductService";
import axiosClient from "~/apis/axiosClient";
import { importInvoiceService } from "~/apis/importInvoiceService";

const WarehousePage = () => {
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "lotCode",
    direction: "asc"
  });
  const [lowStockViewActive, setLowStockViewActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importInvoices, setImportInvoices] = useState([]);
  const [loadingImportInvoices, setLoadingImportInvoices] = useState(false);
  const [cancelQuantity, setCancelQuantity] = useState(0);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelDetails, setCancelDetails] = useState([]);
  const [selectedCancelDetailCode, setSelectedCancelDetailCode] =
    useState(null);

  // New state for simplified warehouse creation
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [importTotalValue, setImportTotalValue] = useState(0);

  // Canceled products view
  const [isCanceledProductsModalOpen, setIsCanceledProductsModalOpen] =
    useState(false);
  const [canceledProducts, setCanceledProducts] = useState([]);
  const [loadingCanceledProducts, setLoadingCanceledProducts] = useState(false);
  // Filters for canceled products view
  const [filterImportCode, setFilterImportCode] = useState("all");
  const [filterImportDetailCode, setFilterImportDetailCode] = useState("all");
  const [filterProductCode, setFilterProductCode] = useState("all");

  // Load lots from API (fallback to mock data if API fails)
  const loadLots = async () => {
    // Load inventory items from API and map to the page's lot shape
    setLoading(true);
    try {
      const res = await warehouseService.getAllInventory();
      const items = res?.data?.data ?? res?.data ?? res;

      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((it, idx) => ({
          // keep existing field names used throughout the component
          id: it.id || idx + 1,
          lotCode: it.inventoryCode || `KHO-${idx + 1}`,
          productCode: it.product?.productCode || "",
          productName: it.product?.productName || "",
          category: it.product?.category || "",
          location: it.inventoryCode || "",
          zone: it.zone || "",
          shelf: it.shelf || "",
          quantity: it.quantityOnHand ?? 0,
          reservedQuantity: 0,
          availableQuantity: it.quantityOnHand ?? 0,
          unitPrice: 0,
          totalValue: 0,
          expiryDate: it.expiryDate || "",
          manufactureDate: it.manufactureDate || "",
          supplierCode: it.supplierCode || "",
          supplierName: it.supplierName || "",
          status: it.status ? "ACTIVE" : "OUT_OF_STOCK",
          createdDate: it.createdDate || it.createdAt || "",
          lastUpdated: it.updatedDate || it.updatedAt || "",
          notes: it.notes || "",
          // include product as the lot's products array for detail modal
          products: it.product
            ? [
                {
                  productCode: it.product.productCode,
                  productName: it.product.productName,
                  quantity: it.quantityOnHand ?? 0,
                  importPrice: it.importPrice || 0,
                  totalAmount: (it.importPrice || 0) * (it.quantityOnHand ?? 0),
                  importInvoiceDetailCode: it.importInvoiceDetailCode || "",
                  createdDate: it.createdDate || it.createdAt || ""
                }
              ]
            : []
        }));

        setLots(mapped);
        // Fetch inventory detail breakdown per inventoryCode and sum quantities
        try {
          const enriched = await Promise.all(
            mapped.map(async (lot) => {
              // inventoryCode is stored in lot.lotCode (from it.inventoryCode)
              try {
                const detRes =
                  await warehouseService.getInventoryDetailsByInventoryCode(
                    lot.lotCode
                  );
                const dets = detRes?.data?.data ?? detRes?.data ?? [];
                const countOfDetails = Array.isArray(dets) ? dets.length : 0;
                // Sum remaining quantity per detail (quantity - quantitySold)
                const summed = Array.isArray(dets)
                  ? dets.reduce(
                      (s, d) =>
                        s +
                        Math.max(
                          0,
                          (Number(d.quantity) || 0) -
                            (Number(d.quantitySold) || 0)
                        ),
                      0
                    )
                  : 0;

                // update lot quantities based on summed inventory details
                return {
                  ...lot,
                  quantity: summed || lot.quantity,
                  countOfDetails,
                  // also update products array quantities when appropriate
                  products:
                    lot.products && lot.products.length > 0
                      ? lot.products.map((p) => ({
                          ...p,
                          // try to keep original product quantity but prefer summed remaining
                          quantity: summed || p.quantity
                        }))
                      : lot.products,
                  availableQuantity: summed || lot.availableQuantity
                };
              } catch (err) {
                // if detail fetch fails, keep original lot
                console.warn(
                  `Could not fetch inventory details for ${lot.lotCode}:`,
                  err
                );
                return lot;
              }
            })
          );

          setLots(enriched);
          setFilteredLots(enriched);
        } catch (err) {
          // if anything goes wrong during enrichment, fall back to basic mapped
          console.warn("Error enriching lots with inventory details:", err);
          setFilteredLots(mapped);
        }
      } else {
        // fallback to mock data if API returns empty or unexpected shape
        setLots(mockLots);
        setFilteredLots(mockLots);
      }
    } catch (err) {
      console.error("Failed to load inventory from API, using mock data:", err);
      setLots(mockLots);
      setFilteredLots(mockLots);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
    loadProductsAndCategories();
    loadImportTotalValue();
  }, []);

  // Load products and categories for warehouse creation
  const loadProductsAndCategories = async () => {
    try {
      // Load products
      const productsRes = await productService.getAllProduct();
      const products = productsRes?.data?.data || [];
      setAvailableProducts(products);
      setFilteredProducts(products);

      // Load categories
      const categoriesRes = await categoryService.getAllCategory();
      const categories = categoriesRes?.data?.data || [];
      setAvailableCategories(categories);
    } catch (error) {
      console.error("Failed to load products and categories:", error);
      setAvailableProducts([]);
      setAvailableCategories([]);
    }
  };

  // Load import invoices and compute total value from details.totalAmount
  const loadImportTotalValue = async () => {
    try {
      const res = await importInvoiceService.getAllImportInvoices();
      const invoices = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(invoices) || invoices.length === 0) {
        setImportTotalValue(0);
        return;
      }

      // Only include invoices that have been approved
      const approvedInvoices = invoices.filter(
        (inv) => inv.status === "APPROVED"
      );
      const total = approvedInvoices.reduce((sumInv, inv) => {
        const details = inv.details || [];
        const sumDetails = Array.isArray(details)
          ? details.reduce((s, d) => s + (Number(d.totalAmount) || 0), 0)
          : 0;
        return sumInv + sumDetails;
      }, 0);
      setImportTotalValue(total);
    } catch (err) {
      console.error("Failed to load import invoices for total value:", err);
      setImportTotalValue(0);
    }
  };

  // Filter products by category
  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredProducts(availableProducts);
    } else {
      setFilteredProducts(
        availableProducts.filter(
          (product) =>
            product.categoryCode === selectedCategory ||
            product.category === selectedCategory ||
            product.categoryName === selectedCategory
        )
      );
    }
  }, [selectedCategory, availableProducts]);

  // Load canceled products
  const loadCanceledProducts = async () => {
    setLoadingCanceledProducts(true);
    try {
      // Try service method(s) first (names may vary across versions)
      if (cancelProductService.getAllCancelProducts) {
        const response = await cancelProductService.getAllCancelProducts();
        setCanceledProducts(response?.data?.data || []);
      } else if (cancelProductService.getAllCanceledProducts) {
        const response = await cancelProductService.getAllCanceledProducts();
        setCanceledProducts(response?.data?.data || []);
      } else if (cancelProductService.getAll) {
        const response = await cancelProductService.getAll();
        setCanceledProducts(response?.data?.data || []);
      } else if (axiosClient) {
        // Fallback to a GET on the likely base path
        const response = await axiosClient.get(`/cancel-products`);
        setCanceledProducts(response?.data?.data || response?.data || []);
      } else {
        setCanceledProducts([]);
      }
    } catch (error) {
      console.error("Failed to load canceled products:", error);
      setCanceledProducts([]);
    } finally {
      setLoadingCanceledProducts(false);
    }
  };

  // Handle view canceled products
  const handleViewCanceledProducts = () => {
    setIsCanceledProductsModalOpen(true);
    loadCanceledProducts();
  };

  // Show low-stock view (available <= 5)
  const handleShowLowStock = () => {
    setLowStockViewActive(true);
    // reset other filters so the low-stock view is clear
    setFilterStatus("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleClearLowStockFilter = () => {
    setLowStockViewActive(false);
    setFilteredLots(lots);
    setCurrentPage(1);
  };

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

  // Compute remaining quantity for selectedLot from loaded importInvoices (quantity - quantitySold)
  const getSelectedLotRemaining = (lot = selectedLot) => {
    if (!lot) return 0;
    // Prefer using loaded importInvoices for accurate detail quantities
    if (importInvoices && importInvoices.length > 0) {
      const details = importInvoices.flatMap((inv) => inv.details || []);
      const matched = details.filter((d) => d.productCode === lot.productCode);
      if (matched.length > 0) {
        return matched.reduce(
          (s, d) =>
            s +
            Math.max(
              0,
              (Number(d.quantity) || 0) - (Number(d.quantitySold) || 0)
            ),
          0
        );
      }
    }

    // Fallback to lot.quantity (which may have been set to summed remaining earlier)
    return lot.quantity ?? 0;
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      ACTIVE: {
        label: "Hoạt động",
        className: "bg-green-100 text-green-700",
        icon: FaCheckCircle
      },
      LOW_STOCK: {
        label: "Sắp hết",
        className: "bg-yellow-100 text-yellow-700",
        icon: FaExclamationTriangle
      },
      OUT_OF_STOCK: {
        label: "Hết hàng",
        className: "bg-red-100 text-red-700",
        icon: FaTimesCircle
      },
      EXPIRED: {
        label: "Quá hạn",
        className: "bg-gray-100 text-gray-700",
        icon: FaClock
      }
    };
    return statusMap[status] || statusMap.ACTIVE;
  };

  // Search and filter lots
  useEffect(() => {
    let filtered = lots;

    // If low-stock view active, show only items with available <= 5
    if (lowStockViewActive) {
      filtered = (lots || []).filter(
        (l) => Number(l.availableQuantity ?? l.quantity ?? 0) <= 5
      );
    } else {
      // Search filter
      if (searchTerm) {
        filtered = filtered.filter((lot) => {
          const term = searchTerm.toLowerCase();
          return (
            lot.lotCode?.toLowerCase().includes(term) ||
            lot.productCode?.toLowerCase().includes(term) ||
            lot.productName?.toLowerCase().includes(term) ||
            lot.location?.toLowerCase().includes(term) ||
            lot.supplierName?.toLowerCase().includes(term)
          );
        });
      }

      // Status filter
      if (filterStatus !== "all") {
        filtered = filtered.filter((lot) => lot.status === filterStatus);
      }
    }

    // Sort lots
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

    setFilteredLots(filtered);
    setCurrentPage(1);
  }, [lots, searchTerm, filterStatus, sortConfig, lowStockViewActive]);

  // Pagination
  const totalPages = Math.ceil(filteredLots.length / pageSize);
  const currentLots = filteredLots.slice(
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

  // Handle view lot detail
  const handleViewDetail = async (lot) => {
    setSelectedLot(lot);
    setIsDetailModalOpen(true);

    // Load import invoices for this product
    if (lot.productCode) {
      setLoadingImportInvoices(true);
      try {
        const res = await priceHistoryService.getImportInvoicesByProductCode(
          lot.productCode
        );
        const invoices = res?.data?.data ?? res?.data ?? [];
        setImportInvoices(invoices);
      } catch (err) {
        console.error("Failed to load import invoices:", err);
        setImportInvoices([]);
      } finally {
        setLoadingImportInvoices(false);
      }
    }
  };

  // Handle add new lot (simplified for warehouse creation)
  const handleAddLot = () => {
    setEditingLot({
      warehouseCode: "", // Mã kho
      warehouseName: "", // Tên kho
      warehouseType: "NORMAL", // Loại kho
      productCode: "", // Mã sản phẩm
      productName: "", // Auto-filled when product selected
      category: "", // Auto-filled when product selected
      status: "ACTIVE"
    });
    setSelectedCategory("all"); // Reset category filter
    setIsAddModalOpen(true);
  };

  // Handle edit lot
  const handleEditLot = (lot) => {
    setEditingLot({ ...lot });
    setIsEditModalOpen(true);
  };

  // Handle delete lot
  const handleDeleteLot = (lot) => {
    setSelectedLot(lot);
    setIsDeleteModalOpen(true);
  };

  // Handle cancel inventory
  const handleCancelInventory = async (lot) => {
    setSelectedLot(lot);
    setCancelQuantity(0);
    setCancelReason("");

    // Fetch inventory details for this lot to let user pick which import invoice to deduct from
    try {
      setLoading(true);
      const detRes = await warehouseService.getInventoryDetailsByInventoryCode(
        lot.lotCode
      );
      const dets = detRes?.data?.data ?? detRes?.data ?? [];
      // attach computed available = quantity - quantitySold for UI
      const mapped = Array.isArray(dets)
        ? dets.map((d) => ({
            ...d,
            available: Math.max(0, (d.quantity ?? 0) - (d.quantitySold ?? 0))
          }))
        : [];
      setCancelDetails(mapped);
      setSelectedCancelDetailCode(
        Array.isArray(dets) && dets.length > 0
          ? dets[0].importInvoiceDetailCode ||
              dets[0].inventoryDetailCode ||
              null
          : null
      );
    } catch (err) {
      console.warn("Could not load inventory details for cancel modal:", err);
      setCancelDetails([]);
      setSelectedCancelDetailCode(null);
    } finally {
      setLoading(false);
      setIsCancelModalOpen(true);
    }
  };

  // Handle confirm cancel inventory
  const handleConfirmCancel = async () => {
    if (!selectedLot) return;

    // Ensure a detail is selected to cancel from
    if (!selectedCancelDetailCode) {
      alert("Vui lòng chọn chi tiết hóa đơn nhập kho để hủy.");
      return;
    }

    // Find selected detail record
    const detail = cancelDetails.find(
      (d) =>
        d.importInvoiceDetailCode === selectedCancelDetailCode ||
        d.inventoryDetailCode === selectedCancelDetailCode
    );

    if (!detail) {
      alert("Chi tiết được chọn không hợp lệ.");
      return;
    }

    const availableInDetail =
      detail.available ??
      Math.max(
        0,
        (detail.quantity ?? 0) -
          (detail.quantitySold ?? 0) -
          (detail.quantityCanceled ??
            detail.quantityCancelled ??
            detail.cancelQuantity ??
            0)
      );
    if (cancelQuantity <= 0 || cancelQuantity > availableInDetail) {
      alert(
        `Số lượng hủy phải lớn hơn 0 và không vượt quá ${availableInDetail}`
      );
      return;
    }

    try {
      setLoading(true);

      // Build payload matching backend contract
      const payload = {
        cancelledProductCode: `CANCL_${Date.now()}`,
        quantity: cancelQuantity,
        importInvoiceCode:
          detail.importInvoiceCode || detail.inventoryCode || null,
        productCode: selectedLot.productCode,
        reason: cancelReason || "",
        importInvoiceDetailCode: selectedCancelDetailCode
      };

      // Try to persist cancellation via service (different repos expose different names)
      let created = null;
      try {
        let res;
        if (cancelProductService.createCancelProduct) {
          res = await cancelProductService.createCancelProduct(payload);
        } else if (cancelProductService.create) {
          res = await cancelProductService.create(payload);
        } else if (axiosClient) {
          res = await axiosClient.post(`/cancel-products/create`, payload);
        } else {
          throw new Error("No cancel-product create method available");
        }
        created = res?.data?.data || res?.data || payload;

        // add to canceled products list in UI
        setCanceledProducts((prev) => [created, ...(prev || [])]);

        // Update the cancelDetails array to reduce available/quantity and record canceled amount
        const newCancelDetails = cancelDetails.map((d) => {
          if (
            d.importInvoiceDetailCode === selectedCancelDetailCode ||
            d.inventoryDetailCode === selectedCancelDetailCode
          ) {
            const newQuantity = Math.max(0, (d.quantity ?? 0) - cancelQuantity);
            const newAvailable = Math.max(
              0,
              newQuantity - (d.quantitySold ?? 0)
            );
            return {
              ...d,
              quantity: newQuantity,
              available: newAvailable,
              quantityCanceled:
                (d.quantityCanceled ?? d.cancelQuantity ?? 0) + cancelQuantity
            };
          }
          return d;
        });
        setCancelDetails(newCancelDetails);

        // Update the lots array and selectedLot quantities
        const newLots = lots.map((l) => {
          if (l.lotCode === selectedLot.lotCode) {
            const newQty = Math.max(0, l.quantity - cancelQuantity);
            const newAvailable = Math.max(
              0,
              l.availableQuantity - cancelQuantity
            );
            return { ...l, quantity: newQty, availableQuantity: newAvailable };
          }
          return l;
        });
        setLots(newLots);
        setFilteredLots(newLots);

        setIsCancelModalOpen(false);
        setSelectedLot(null);
        setCancelQuantity(0);
        setCancelReason("");

        console.log(
          `✓ Đã hủy ${cancelQuantity} sản phẩm (persisted) từ chi tiết ${selectedCancelDetailCode}. Lý do: ${cancelReason}`
        );
      } catch (apiErr) {
        // Fallback to local optimistic update on API failure
        console.warn("Cancel API failed, applying local update:", apiErr);

        const newCancelDetails = cancelDetails.map((d) => {
          if (
            d.importInvoiceDetailCode === selectedCancelDetailCode ||
            d.inventoryDetailCode === selectedCancelDetailCode
          ) {
            const newQuantity = Math.max(0, (d.quantity ?? 0) - cancelQuantity);
            const newAvailable = Math.max(
              0,
              newQuantity - (d.quantitySold ?? 0)
            );
            return { ...d, quantity: newQuantity, available: newAvailable };
          }
          return d;
        });
        setCancelDetails(newCancelDetails);

        const newLots = lots.map((l) => {
          if (l.lotCode === selectedLot.lotCode) {
            const newQty = Math.max(0, l.quantity - cancelQuantity);
            const newAvailable = Math.max(
              0,
              l.availableQuantity - cancelQuantity
            );
            return { ...l, quantity: newQty, availableQuantity: newAvailable };
          }
          return l;
        });
        setLots(newLots);
        setFilteredLots(newLots);

        setIsCancelModalOpen(false);
        setSelectedLot(null);
        setCancelQuantity(0);
        setCancelReason("");
      }
    } catch (error) {
      console.error("Error canceling inventory:", error);
      alert("Hủy sản phẩm thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Handle save lot (add or edit) - wired to API with mock fallback
  const handleSaveLot = async () => {
    try {
      setLoading(true);

      // Calculate derived fields
      const availableQuantity =
        editingLot.quantity - (editingLot.reservedQuantity || 0);
      const totalValue = editingLot.quantity * editingLot.unitPrice;

      const lotToSave = {
        ...editingLot,
        availableQuantity,
        totalValue,
        lastUpdated: new Date().toISOString()
      };

      if (isAddModalOpen) {
        // Try create via API
        try {
          const res = await warehouseService.createLot(lotToSave);
          const saved = res?.data?.data ?? res?.data ?? res;
          // Ensure createdDate & id exist (fallback)
          const newLot = {
            ...(typeof saved === "object" ? saved : {}),
            ...(typeof saved !== "object" ? lotToSave : {}),
            id: (saved && saved.id) || lots.length + 1,
            createdDate:
              (saved && saved.createdDate) || new Date().toISOString()
          };
          setLots((prev) => [...prev, newLot]);
          setFilteredLots((prev) => [...prev, newLot]);
          setIsAddModalOpen(false);
        } catch (err) {
          // Fallback to local add when API fails
          console.error(
            "Create via API failed, falling back to mock add:",
            err
          );
          const newLot = {
            ...lotToSave,
            id: lots.length + 1,
            createdDate: new Date().toISOString()
          };
          setLots((prev) => [...prev, newLot]);
          setFilteredLots((prev) => [...prev, newLot]);
          setIsAddModalOpen(false);
        }
      } else {
        // Edit existing lot: try API update
        try {
          const res = await warehouseService.updateLot(
            editingLot.id,
            lotToSave
          );
          const updated = res?.data?.data ?? res?.data ?? lotToSave;
          setLots((prev) =>
            prev.map((lot) => (lot.id === editingLot.id ? updated : lot))
          );
          setFilteredLots((prev) =>
            prev.map((lot) => (lot.id === editingLot.id ? updated : lot))
          );
          setIsEditModalOpen(false);
        } catch (err) {
          console.error("Update via API failed, applying local update:", err);
          const updatedLots = lots.map((lot) =>
            lot.id === editingLot.id ? lotToSave : lot
          );
          setLots(updatedLots);
          setFilteredLots(updatedLots);
          setIsEditModalOpen(false);
        }
      }

      setEditingLot(null);
      console.log("✓ Lưu thông tin lô hàng thành công!");
    } catch (error) {
      console.error("Error saving lot:", error);
      alert("Lưu thông tin thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      // Try API delete
      try {
        await warehouseService.deleteLot(selectedLot.id);
        const updatedLots = lots.filter((lot) => lot.id !== selectedLot.id);
        setLots(updatedLots);
        setFilteredLots(updatedLots);
        setIsDeleteModalOpen(false);
        setSelectedLot(null);
        console.log("✓ Xóa hàng hóa thành công (API)");
      } catch (err) {
        // Fallback to local delete when API fails
        console.error("Delete via API failed, applying local delete:", err);
        const updatedLots = lots.filter((lot) => lot.id !== selectedLot.id);
        setLots(updatedLots);
        setFilteredLots(updatedLots);
        setIsDeleteModalOpen(false);
        setSelectedLot(null);
      }
    } catch (error) {
      console.error("Error deleting lot:", error);
      alert("Xóa hàng hóa thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaWarehouse className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Quản lý kho hàng
                </h1>
                <p className="text-gray-600 text-lg">
                  Quản lý hàng hóa, vị trí và tồn kho trong hệ thống
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleViewCanceledProducts}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-3 shadow-lg"
              >
                <FaTimes className="text-lg" />
                Xem sản phẩm bị hủy
              </button>
              <button
                onClick={handleAddLot}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-3 shadow-lg"
              >
                <FaPlus className="text-lg" />
                Tạo kho mới
              </button>
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
                  placeholder="Tìm kiếm theo mã hàng hóa, mã sản phẩm, tên sản phẩm, vị trí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOW_STOCK">Sắp hết</option>
                <option value="OUT_OF_STOCK">Hết hàng</option>
                <option value="EXPIRED">Quá hạn</option>
              </select>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value={10}>10 lô/trang</option>
                <option value={25}>25 lô/trang</option>
                <option value={50}>50 lô/trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {(() => {
            const source =
              filteredLots && filteredLots.length ? filteredLots : lots;
            const totalAvailable = source.reduce(
              (s, l) =>
                s + (Number(l.availableQuantity ?? l.quantity ?? 0) || 0),
              0
            );
            const totalValue =
              importTotalValue ||
              source.reduce((s, l) => s + (Number(l.totalValue ?? 0) || 0), 0);

            // Low-stock definition: available quantity <= 5
            const lowStockItems = source.filter(
              (l) => Number(l.availableQuantity ?? l.quantity ?? 0) <= 5
            );
            const lowStockCount = lowStockItems.length;
            const lowStockTotalValue = lowStockItems.reduce((s, l) => {
              const avail = Number(l.availableQuantity ?? l.quantity ?? 0) || 0;
              const tv = Number(l.totalValue ?? 0);
              if (tv > 0) return s + tv;
              const unit = Number(l.unitPrice ?? 0) || 0;
              return s + unit * avail;
            }, 0);

            return (
              <>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">
                        Tổng sản phẩm trong kho
                      </p>
                      <p className="text-3xl font-bold">{source.length}</p>
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
                        Hoạt động
                      </p>
                      <p className="text-3xl font-bold">
                        {source.filter((lot) => lot.status === "ACTIVE").length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <FaCheckCircle className="text-white text-xl" />
                    </div>
                  </div>
                </div>

                <div
                  onClick={handleShowLowStock}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleShowLowStock();
                  }}
                  title="Nhấn để xem danh sách sản phẩm sắp hết (tồn <= 5)"
                  className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium mb-1">
                        Sắp hết (tồn &lt;= 5)
                      </p>
                      <p className="text-3xl font-bold">{lowStockCount}</p>
                      <p className="text-sm opacity-90 mt-1">
                        Tổng giá trị: {formatPrice(lowStockTotalValue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <FaExclamationTriangle className="text-white text-xl" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium mb-1">
                        Tổng giá trị
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(totalValue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <FaBox className="text-white text-xl" />
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Lots Table */}
        {lowStockViewActive && (
          <div className="mb-4 px-8">
            <div className="inline-flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-full">
              <FaExclamationTriangle className="text-yellow-600" />
              <span className="font-medium">Bộ lọc: Sắp hết (tồn &lt;= 5)</span>
              <button
                onClick={handleClearLowStockFilter}
                className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded-full text-sm"
              >
                Bỏ lọc
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <FaBoxes className="text-blue-600" />
              Danh sách hàng hóa trong kho
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">
                    <button
                      onClick={() => handleSort("lotCode")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Mã sản phẩm
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">
                    Tên sản phẩm
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">
                    Mã kho
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">
                    Tồn kho
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase">
                    Trạng thái
                  </th>

                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        <span className="mt-4 text-gray-600 font-medium">
                          Đang tải dữ liệu...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : currentLots.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FaBoxes className="text-gray-300 text-6xl mb-4" />
                        <span className="text-gray-500 text-lg font-medium">
                          Không tìm thấy hàng hóa nào
                        </span>
                        <span className="text-gray-400 text-sm mt-2">
                          Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLots.map((lot) => {
                    const statusInfo = getStatusInfo(lot.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr
                        key={lot.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                              <FaBarcode className="text-blue-600 text-sm" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">
                                {lot.productCode || "-"}
                              </div>
                              <div className="text-sm text-gray-500">
                                Mã kho: {lot.lotCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900 mb-1">
                              {lot.productName}
                            </div>
                            <div className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block">
                              {lot.productCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {lot.location || lot.lotCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lot.zone} {lot.shelf ? `- ${lot.shelf}` : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="space-y-1">
                            <div className="font-bold text-lg text-gray-900">
                              {lot.availableQuantity}
                            </div>
                            <div className="text-sm text-gray-500">
                              Tổng: {lot.quantity} | Tổng số hóa đơn:{" "}
                              {lot.countOfDetails || 0}
                            </div>
                          </div>
                        </td>
                        {/* Giá trị column removed per request */}
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 justify-center ${statusInfo.className}`}
                          >
                            <StatusIcon className="text-xs" />
                            {statusInfo.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetail(lot)}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              title="Xem chi tiết"
                            >
                              <FaEye className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleCancelInventory(lot)}
                              className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                              title="Hủy sản phẩm"
                            >
                              <FaTimes className="text-sm" />
                            </button>
                            {/* <button
                              onClick={() => handleEditLot(lot)}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <FaEdit className="text-sm" />
                            </button> */}
                            <button
                              onClick={() => handleDeleteLot(lot)}
                              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="Xóa"
                            >
                              <FaTrash className="text-sm" />
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

        {/* Detail Modal */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedLot(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaEye className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Chi tiết hàng hóa</span>
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <span
                    className="font-medium max-w-[220px] truncate"
                    title={selectedLot?.lotCode}
                  >
                    {selectedLot?.lotCode}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span
                    className="max-w-[360px] truncate"
                    title={selectedLot?.productName}
                  >
                    {selectedLot?.productName}
                  </span>
                </div>
              </div>
            </div>
          }
          size="xl"
        >
          {selectedLot && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Mã kho hàng</p>
                    <p className="font-bold text-lg text-blue-600">
                      {selectedLot.lotCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Mã sản phẩm</p>
                    <p className="font-semibold text-gray-900">
                      {selectedLot.productCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Tên Sản phẩm</p>
                    <p className="font-semibold text-gray-900">
                      {selectedLot.productName}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600 text-sm mb-1">
                      Tổng số sản phẩm
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedLot.products?.reduce(
                        (s, p) => s + (p.quantity || 0),
                        0
                      ) ??
                        selectedLot.quantity ??
                        0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Import Invoices */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <FaBoxes className="text-blue-600" />
                  Hóa đơn nhập kho của sản phẩm
                </h4>

                {loadingImportInvoices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <span className="ml-3 text-gray-600">
                      Đang tải hóa đơn nhập...
                    </span>
                  </div>
                ) : importInvoices && importInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {importInvoices.map((invoice, idx) => (
                      <div
                        key={invoice.id || idx}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-semibold text-gray-900">
                              Hóa đơn: {invoice.importInvoiceCode}
                            </h5>
                            <p className="text-sm text-gray-600">
                              Trạng thái:{" "}
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  invoice.status === "APPROVED"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {invoice.status}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Nhà cung cấp:{" "}
                              <span className="font-semibold text-gray-900">
                                {invoice.supplierCode ||
                                invoice.supplier?.supplierCode
                                  ? `${
                                      invoice.supplierCode ||
                                      invoice.supplier?.supplierCode
                                    }${
                                      invoice.supplierName ||
                                      invoice.supplier?.name
                                        ? " - " +
                                          (invoice.supplierName ||
                                            invoice.supplier?.name)
                                        : ""
                                    }`
                                  : invoice.supplierName ||
                                    invoice.vendorName ||
                                    "-"}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Ngày nhập</p>
                            <p className="font-semibold">
                              {formatDate(invoice.createdDate)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            Mô tả: {invoice.description || "-"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Tổng tiền:{" "}
                            <span className="font-semibold text-green-600">
                              {formatPrice(invoice.totalAmount)}
                            </span>
                          </p>
                        </div>

                        {/* Invoice Details */}
                        {invoice.details && invoice.details.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                    Mã chi tiết
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Số lượng
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Đã bán
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Số lượng hủy
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Tồn thực tế
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Giá nhập
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                                    Thành tiền
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {invoice.details
                                  .filter(
                                    (detail) =>
                                      detail.productCode ===
                                      selectedLot?.productCode
                                  )
                                  .map((detail, detailIdx) => (
                                    <tr
                                      key={detail.id || detailIdx}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-3 py-2 text-gray-900">
                                        <div
                                          className="max-w-[220px] truncate"
                                          title={detail.importInvoiceDetailCode}
                                        >
                                          {detail.importInvoiceDetailCode}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold">
                                        {detail.quantity}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                                        {detail.quantitySold ?? 0}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-orange-600">
                                        {detail.quantityCancel ??
                                          detail.quantityCancelled ??
                                          detail.cancelQuantity ??
                                          0}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                        {(detail.quantity ?? 0) -
                                          (detail.quantitySold ?? 0) -
                                          (detail.quantityCancel ??
                                            detail.quantityCanceled ??
                                            detail.quantityCancelled ??
                                            detail.cancelQuantity ??
                                            0)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-green-600">
                                        {formatPrice(detail.importPrice)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-blue-600">
                                        {formatPrice(detail.totalAmount)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <FaBoxes className="text-gray-300 text-4xl mb-2 mx-auto" />
                    <p>Không có hóa đơn nhập nào cho sản phẩm này</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedLot.notes && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Ghi chú
                  </h4>
                  <p className="text-gray-700">{selectedLot.notes}</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedLot(null);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Simplified Warehouse Creation Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingLot(null);
            setSelectedCategory("all");
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaWarehouse className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Tạo kho mới</span>
                <div className="text-sm text-gray-600 mt-1">
                  Mỗi kho chỉ chứa duy nhất một loại sản phẩm
                </div>
              </div>
            </div>
          }
          size="lg"
        >
          {editingLot && (
            <div className="space-y-6">
              {/* Warehouse Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaWarehouse className="text-blue-600" />
                  Thông tin kho
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mã kho *
                    </label>
                    <input
                      type="text"
                      value={editingLot.warehouseCode || ""}
                      onChange={(e) =>
                        setEditingLot((prev) => ({
                          ...prev,
                          warehouseCode: e.target.value
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="VD: WH001, KHO-A001..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên kho *
                    </label>
                    <input
                      type="text"
                      value={editingLot.warehouseName || ""}
                      onChange={(e) =>
                        setEditingLot((prev) => ({
                          ...prev,
                          warehouseName: e.target.value
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="VD: Kho sách văn học, Kho đồ điện tử..."
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loại kho *
                  </label>
                  <select
                    value={editingLot.warehouseType || "NORMAL"}
                    onChange={(e) =>
                      setEditingLot((prev) => ({
                        ...prev,
                        warehouseType: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="NORMAL">Kho thường</option>
                    <option value="COLD">Kho lạnh</option>
                    <option value="FRAGILE">Kho đồ dễ vỡ</option>
                    <option value="HAZARDOUS">Kho chất nguy hiểm</option>
                    <option value="HIGH_VALUE">Kho hàng giá trị cao</option>
                  </select>
                </div>
              </div>

              {/* Product Selection */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaBoxes className="text-green-600" />
                  Chọn sản phẩm cho kho
                </h3>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lọc theo danh mục
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {availableCategories.map((category) => (
                      <option
                        key={category.id || category.categoryCode}
                        value={category.categoryCode || category.id}
                      >
                        {category.categoryName || category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sản phẩm *
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-xl">
                    {filteredProducts.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.productCode}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              editingLot.productCode === product.productCode
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 hover:border-green-300 hover:bg-green-25"
                            }`}
                            onClick={() => {
                              setEditingLot((prev) => ({
                                ...prev,
                                productCode: product.productCode,
                                productName: product.productName,
                                category:
                                  product.categoryName || product.category
                              }));
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  editingLot.productCode === product.productCode
                                    ? "border-green-500 bg-green-500"
                                    : "border-gray-300"
                                }`}
                              >
                                {editingLot.productCode ===
                                  product.productCode && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {product.productName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Mã: {product.productCode} | Danh mục:{" "}
                                  {product.categoryName ||
                                    product.category ||
                                    "Chưa phân loại"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <FaBoxes className="text-gray-300 text-3xl mx-auto mb-2" />
                        <p>Không có sản phẩm nào trong danh mục này</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Product Info */}
                {editingLot.productCode && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">
                      Sản phẩm đã chọn:
                    </h4>
                    <p>
                      <strong>Mã:</strong> {editingLot.productCode}
                    </p>
                    <p>
                      <strong>Tên:</strong> {editingLot.productName}
                    </p>
                    <p>
                      <strong>Danh mục:</strong>{" "}
                      {typeof editingLot.category === "object"
                        ? editingLot.category?.categoryName ||
                          editingLot.category?.categoryCode ||
                          "Unknown Category"
                        : editingLot.category || "Unknown Category"}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLot(null);
                    setSelectedCategory("all");
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveLot}
                  disabled={
                    !editingLot.warehouseCode ||
                    !editingLot.warehouseName ||
                    !editingLot.productCode ||
                    loading
                  }
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FaSave className="text-lg" />
                  )}
                  Tạo kho
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Modal (still uses original complex form for editing existing warehouses) */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingLot(null);
          }}
          title="Chỉnh sửa thông tin kho"
          size="xl"
        >
          <div className="p-6">
            <p className="text-gray-600">
              Chỉnh sửa kho hiện tại không khả dụng trong phiên bản này.
            </p>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedLot(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaTrash className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Xác nhận xóa</span>
                <div className="text-sm text-gray-600 mt-1">
                  Bạn có chắc muốn xóa hàng hóa này?
                </div>
              </div>
            </div>
          }
          size="md"
        >
          {selectedLot && (
            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <div className="flex items-center gap-3 mb-4">
                  <FaExclamationTriangle className="text-red-600 text-2xl" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">
                      Cảnh báo!
                    </h3>
                    <p className="text-red-700">
                      Hành động này không thể hoàn tác
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p>
                    <strong>Mã hàng hóa:</strong> {selectedLot.lotCode}
                  </p>
                  <p>
                    <strong>Sản phẩm:</strong> {selectedLot.productName}
                  </p>
                  <p>
                    <strong>Vị trí:</strong> {selectedLot.location}
                  </p>
                  <p>
                    <strong>Số lượng:</strong> {selectedLot.quantity}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedLot(null);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FaTrash className="text-lg" />
                  )}
                  Xóa hàng hóa
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Cancel Inventory Modal */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setSelectedLot(null);
            setCancelQuantity(0);
            setCancelReason("");
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaTimes className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">Hủy sản phẩm</span>
                <div className="text-sm text-gray-600 mt-1">
                  Hủy sản phẩm khỏi kho
                </div>
              </div>
            </div>
          }
          size="xl"
        >
          {selectedLot && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Thông tin sản phẩm
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Mã sản phẩm:</strong> {selectedLot.productCode}
                  </p>
                  <p>
                    <strong>Tên sản phẩm:</strong> {selectedLot.productName}
                  </p>
                  <p>
                    <strong>Tồn kho hiện tại:</strong>{" "}
                    <span className="text-blue-600 font-semibold">
                      {selectedLot.quantity}
                    </span>
                  </p>
                  <p>
                    <strong>Có sẵn:</strong>{" "}
                    <span className="text-green-600 font-semibold">
                      {selectedLot.availableQuantity}
                    </span>
                  </p>
                </div>
              </div>

              {/* Cancel Form */}
              <div className="space-y-4">
                {/* Choose which import invoice/detail to cancel from */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hủy theo hóa đơn nhập kho
                  </label>
                  {cancelDetails && cancelDetails.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-auto border rounded-lg p-2">
                      {cancelDetails.map((d) => {
                        const code =
                          d.importInvoiceDetailCode ||
                          d.inventoryDetailCode ||
                          d.id;
                        const available =
                          d.available ??
                          Math.max(
                            0,
                            (d.quantity ?? 0) - (d.quantitySold ?? 0)
                          );
                        return (
                          <label
                            key={code}
                            className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="cancelDetail"
                                value={code}
                                checked={selectedCancelDetailCode === code}
                                onChange={() =>
                                  setSelectedCancelDetailCode(code)
                                }
                                className="form-radio h-4 w-4 text-orange-600"
                              />
                              <div className="text-sm">
                                <div
                                  className="font-medium max-w-[240px] truncate"
                                  title={
                                    d.importInvoiceCode ||
                                    d.inventoryCode ||
                                    "-"
                                  }
                                >
                                  {d.importInvoiceCode ||
                                    d.inventoryCode ||
                                    "-"}
                                </div>
                                <div
                                  className="text-gray-500 max-w-[240px] truncate"
                                  title={code}
                                >
                                  Chi tiết: {code}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700">
                              Có sẵn:{" "}
                              <span className="font-semibold">{available}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Không có thông tin chi tiết nhập kho cho lô này.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số lượng hủy *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedLot.quantity}
                    value={cancelQuantity}
                    onChange={(e) => setCancelQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="Nhập số lượng cần hủy..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tối đa có thể hủy: {selectedLot.quantity} sản phẩm
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lý do hủy *
                  </label>
                  <textarea
                    rows="3"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
                    placeholder="Nhập lý do hủy sản phẩm (hỏng, hết hạn, mất mát, v.v.)..."
                  />
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-600 text-xl" />
                  <div>
                    <p className="font-semibold text-red-900">Cảnh báo!</p>
                    <p className="text-sm text-red-700">
                      Hành động này sẽ giảm số lượng tồn kho và không thể hoàn
                      tác.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    setSelectedLot(null);
                    setCancelQuantity(0);
                    setCancelReason("");
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={
                    !cancelQuantity ||
                    cancelQuantity <= 0 ||
                    cancelQuantity > selectedLot.quantity ||
                    !cancelReason.trim() ||
                    !selectedCancelDetailCode ||
                    loading
                  }
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FaTimes className="text-lg" />
                  )}
                  Xác nhận hủy
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Canceled Products Modal */}
        <Modal
          isOpen={isCanceledProductsModalOpen}
          onClose={() => {
            setIsCanceledProductsModalOpen(false);
            setCanceledProducts([]);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaTimes className="text-white text-xl" />
              </div>
              <div>
                <span className="text-xl font-bold">
                  Danh sách sản phẩm bị hủy
                </span>
                <div className="text-sm text-gray-600 mt-1">
                  Xem và quản lý các sản phẩm đã bị hủy khỏi kho
                </div>
              </div>
            </div>
          }
          size="xl"
        >
          <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600">Hóa đơn</label>
                <select
                  value={filterImportCode}
                  onChange={(e) => setFilterImportCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="all">Tất cả hóa đơn</option>
                  {[
                    ...new Set(
                      canceledProducts
                        .map((i) => i.importInvoiceCode)
                        .filter(Boolean)
                    )
                  ].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">
                  Chi tiết hóa đơn
                </label>
                <select
                  value={filterImportDetailCode}
                  onChange={(e) => setFilterImportDetailCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="all">Tất cả chi tiết</option>
                  {[
                    ...new Set(
                      canceledProducts
                        .map((i) => i.importInvoiceDetailCode)
                        .filter(Boolean)
                    )
                  ].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Mã sản phẩm</label>
                <select
                  value={filterProductCode}
                  onChange={(e) => setFilterProductCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="all">Tất cả sản phẩm</option>
                  {[
                    ...new Set(
                      canceledProducts.map((i) => i.productCode).filter(Boolean)
                    )
                  ].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const filtered = canceledProducts.filter(
                  (it) =>
                    (filterImportCode === "all" ||
                      it.importInvoiceCode === filterImportCode) &&
                    (filterImportDetailCode === "all" ||
                      it.importInvoiceDetailCode === filterImportDetailCode) &&
                    (filterProductCode === "all" ||
                      it.productCode === filterProductCode)
                );
                return (
                  <>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                      <div className="text-center">
                        <p className="text-red-600 text-sm font-medium mb-1">
                          Tổng sản phẩm bị hủy
                        </p>
                        <p className="text-2xl font-bold text-red-700">
                          {filtered.length}
                        </p>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                      <div className="text-center">
                        <p className="text-orange-600 text-sm font-medium mb-1">
                          Tổng số lượng bị hủy
                        </p>
                        <p className="text-2xl font-bold text-orange-700">
                          {filtered.reduce(
                            (sum, item) => sum + (item.quantity || 0),
                            0
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <div className="text-center">
                        <p className="text-purple-600 text-sm font-medium mb-1">
                          Tổng giá trị bị hủy
                        </p>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatPrice(
                            filtered.reduce(
                              (sum, item) =>
                                sum +
                                (item.totalValue ||
                                  item.quantity * item.unitPrice ||
                                  0),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Canceled Products List */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaBoxes className="text-red-600" />
                  Chi tiết sản phẩm bị hủy
                </h3>
              </div>

              {loadingCanceledProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">
                    Đang tải danh sách...
                  </span>
                </div>
              ) : canceledProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Mã hủy
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Mã sản phẩm
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Mã hóa đơn
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Mã chi tiết
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Số lượng hủy
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Lý do
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Ngày hủy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {canceledProducts
                        .filter(
                          (it) =>
                            (filterImportCode === "all" ||
                              it.importInvoiceCode === filterImportCode) &&
                            (filterImportDetailCode === "all" ||
                              it.importInvoiceDetailCode ===
                                filterImportDetailCode) &&
                            (filterProductCode === "all" ||
                              it.productCode === filterProductCode)
                        )
                        .map((item, index) => (
                          <tr
                            key={item.id || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {item.cancelledProductCode}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-900">
                                {item.productCode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-700">
                                {item.importInvoiceCode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-700">
                                {item.importInvoiceDetailCode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-red-600">
                                {item.quantity || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {item.reason ||
                                  item.cancelReason ||
                                  "Không có lý do"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-700">
                                {item.createdDate
                                  ? formatDate(item.createdDate)
                                  : "N/A"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaTimes className="text-gray-300 text-6xl mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    Chưa có sản phẩm nào bị hủy
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Danh sách sẽ hiển thị khi có sản phẩm bị hủy khỏi kho
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsCanceledProductsModalOpen(false);
                  setCanceledProducts([]);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default WarehousePage;
