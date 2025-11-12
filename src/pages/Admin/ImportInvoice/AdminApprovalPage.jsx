import React, { useState, useEffect } from "react";
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaPrint,
  FaFileInvoice,
  FaClock,
  FaSearch,
  FaFilter,
  FaSort,
  FaDownload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaDollarSign,
  FaTruck,
  FaUser,
  FaStickyNote
} from "react-icons/fa";
import { importInvoiceService } from "../../../apis/importInvoiceService";
import { supplierService } from "../../../apis/supplierService";
import { productService } from "../../../apis/productService";
import { path } from "~/assets/Path/path";
import AdminLayout from "../../../components/Admin/AdminLayout";
import Modal from "../../../components/Admin/Modal";
import Pagination from "../../../components/Admin/Pagination";

const AdminApprovalPage = () => {
  const [importInvoices, setImportInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending"); // Default to pending only
  const [sortConfig, setSortConfig] = useState({
    key: "importDate",
    direction: "desc" // Newest first
  });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [rejectReason, setRejectReason] = useState("");
  // Confirmation modal helpers
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

  // Status constants returned by API
  const STATUS = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    DELETED: "DELETED"
  };

  const statusToLabel = (s) => {
    switch (s) {
      case STATUS.APPROVED:
        return "Đã duyệt";
      case STATUS.PENDING:
        return "Chờ duyệt";
      case STATUS.REJECTED:
        return "Đã từ chối";
      case STATUS.DELETED:
        return "Đã xóa";
      default:
        return s || "N/A";
    }
  };

  // helper to get product label
  const getProductLabel = (code) => {
    if (!code) return "N/A";
    const p = (products || []).find(
      (x) => x.productCode === code || x.code === code || x.id === code
    );
    return p
      ? `${p.productName || p.name || code} (${p.productCode || code})`
      : code;
  };

  const getProductName = (code) => {
    if (!code) return "N/A";
    const p = (products || []).find(
      (x) => x.productCode === code || x.code === code || x.id === code
    );
    return p ? p.productName || p.name || code : code;
  };

  const handleConfirmApprove = async (invoice) => {
    setLoading(true);
    try {
      await importInvoiceService.approveImportInvoice(invoice.invoiceCode);
      showSuccessModal(
        "Duyệt thành công",
        `Hóa đơn "${invoice.invoiceCode}" đã được duyệt.`
      );
      await loadImportInvoices();
    } catch (err) {
      console.error(err);
      showErrorModal(
        "Duyệt thất bại",
        `Không thể duyệt hóa đơn "${invoice.invoiceCode}". Vui lòng thử lại sau.`
      );
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false });
    }
  };

  const handleConfirmReject = async (invoice) => {
    if (!rejectReason.trim()) {
      showErrorModal("Lỗi", "Vui lòng nhập lý do từ chối.");
      return;
    }

    setLoading(true);
    try {
      await importInvoiceService.rejectImportInvoice(
        invoice.invoiceCode,
        rejectReason
      );
      showSuccessModal(
        "Từ chối thành công",
        `Hóa đơn "${invoice.invoiceCode}" đã bị từ chối.`
      );
      await loadImportInvoices();
    } catch (err) {
      console.error(err);
      showErrorModal(
        "Từ chối thất bại",
        `Không thể từ chối hóa đơn "${invoice.invoiceCode}". Vui lòng thử lại sau.`
      );
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false });
      setRejectReason("");
    }
  };

  const showApprovalConfirm = (invoice, action) => {
    const isApprove = action === "approve";
    setConfirmModal({
      isOpen: true,
      type: isApprove ? "approve" : "reject",
      title: isApprove
        ? "Duyệt hóa đơn nhập hàng"
        : "Từ chối hóa đơn nhập hàng",
      message: `Bạn có chắc muốn ${isApprove ? "duyệt" : "từ chối"} hóa đơn "${
        invoice.invoiceCode
      }"?`,
      cancelText: "Hủy bỏ",
      confirmText: isApprove ? "Duyệt" : "Từ chối",
      onCancel: () => {
        setConfirmModal({ isOpen: false });
        setRejectReason("");
      },
      onConfirm: () => {
        if (isApprove) {
          handleConfirmApprove(invoice);
        } else {
          handleConfirmReject(invoice);
        }
      }
    });
  };

  // Load import invoices
  const loadImportInvoices = async () => {
    try {
      setLoading(true);
      const response = await importInvoiceService.getAllImportInvoices();
      let invoicesData = response?.data?.data || response?.data || [];

      // Normalize API shapes and add supplier info.
      // Backend may return fields with names like importInvoiceCode, details, created_date and status as "1"/"0".
      invoicesData = invoicesData.map((inv) => {
        const supplier = suppliers.find(
          (s) => s.supplierCode === inv.supplierCode
        );

        // Normalize status -> string constants (keep backward compatibility)
        let status = STATUS.PENDING;
        if (typeof inv.status === "string") {
          const s = inv.status.trim().toUpperCase();
          if (s === "1" || s === "TRUE") status = STATUS.APPROVED;
          else if (s === "0" || s === "FALSE") status = STATUS.PENDING;
          else if (
            s === STATUS.PENDING ||
            s === STATUS.APPROVED ||
            s === STATUS.REJECTED ||
            s === STATUS.DELETED
          )
            status = s;
          else status = s; // unknown but keep the raw string
        } else if (typeof inv.status === "boolean") {
          status = inv.status ? STATUS.APPROVED : STATUS.PENDING;
        } else if (typeof inv.status === "number") {
          status = inv.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
        } else if (typeof inv.approved === "boolean") {
          // fall back to approved boolean if present
          status = inv.approved ? STATUS.APPROVED : STATUS.PENDING;
        }

        // Normalize items/details
        const items = (inv.details || inv.items || []).map((d) => ({
          productCode:
            d.productCode || d.product_code || d.productId || d.productCode,
          quantity: Number(d.quantity || d.qty || 0),
          unitPrice: Number(d.importPrice || d.unitPrice || d.price || 0)
        }));

        // Normalize import date (display-friendly string)
        const rawDate =
          inv.created_date ||
          inv.createdDate ||
          inv.importDate ||
          inv.createdAt ||
          null;
        const importDate = rawDate
          ? new Date(rawDate).toLocaleDateString("vi-VN")
          : null;

        return {
          // map backend importInvoiceCode -> invoiceCode for UI consistency
          invoiceCode: inv.importInvoiceCode || inv.invoiceCode || inv.id || "",
          supplierCode: inv.supplierCode,
          supplierName:
            supplier?.supplierName || inv.supplierName || "Unknown Supplier",
          supplierInfo: supplier,
          importDate,
          totalAmount: Number(inv.totalAmount || inv.total || 0),
          notes: inv.description || inv.notes || "",
          status,
          approved: status === STATUS.APPROVED,
          items,
          // keep original raw object in case it's needed
          _raw: inv
        };
      });

      setImportInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      console.error("Error loading import invoices:", error);
      showErrorModal("Lỗi", "Không thể tải danh sách hóa đơn nhập hàng");
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers for dropdown and lookup
  const loadSuppliers = async () => {
    try {
      const response = await supplierService.getAllSuppliers();
      setSuppliers(response?.data?.data || response?.data || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await productService.getAllProduct();
      setProducts(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  // Search and filter
  useEffect(() => {
    let filtered = importInvoices;

    if (searchTerm) {
      filtered = filtered.filter((invoice) => {
        const term = searchTerm.toLowerCase();
        return (
          invoice.invoiceCode?.toLowerCase().includes(term) ||
          invoice.supplierCode?.toLowerCase().includes(term) ||
          invoice.supplierName?.toLowerCase().includes(term) ||
          invoice.notes?.toLowerCase().includes(term)
        );
      });
    }

    // Filter by status (string values)
    if (filterStatus === "pending") {
      filtered = filtered.filter((inv) => inv.status === STATUS.PENDING);
    } else if (filterStatus === "approved") {
      filtered = filtered.filter((inv) => inv.status === STATUS.APPROVED);
    } else if (filterStatus === "rejected") {
      filtered = filtered.filter((inv) => inv.status === STATUS.REJECTED);
    } else if (filterStatus === "deleted") {
      filtered = filtered.filter((inv) => inv.status === STATUS.DELETED);
    } else if (filterStatus === "all") {
      // no-op: show all
    }

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";

        if (sortConfig.direction === "asc") {
          return aValue.toString().localeCompare(bValue.toString());
        } else {
          return bValue.toString().localeCompare(aValue.toString());
        }
      });
    }

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [importInvoices, searchTerm, sortConfig, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const currentInvoices = filteredInvoices.slice(
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

  // Handle view
  const handleView = async (invoice) => {
    // Try to fetch full details from API using importInvoiceCode (mapped to invoiceCode)
    const id =
      invoice.invoiceCode ||
      invoice._raw?.importInvoiceCode ||
      invoice._raw?.id;
    try {
      setLoading(true);
      const res = await importInvoiceService.getById(id);
      const data = res?.data?.data || res?.data || res;
      const inv = data || invoice._raw || invoice;

      // Normalize similarly to list
      const items = (inv.details || inv.items || []).map((d) => ({
        productCode: d.productCode || d.product_code || d.productId,
        quantity: Number(d.quantity || d.qty || 0),
        unitPrice: Number(d.importPrice || d.unitPrice || d.price || 0)
      }));

      const rawDate =
        inv.created_date ||
        inv.createdDate ||
        inv.importDate ||
        inv.createdAt ||
        null;
      const importDate = rawDate
        ? new Date(rawDate).toLocaleDateString("vi-VN")
        : null;

      // Normalize viewing status to STATUS string
      let viewingStatus = STATUS.PENDING;
      if (typeof inv.status === "string") {
        const s = inv.status.trim().toUpperCase();
        if (s === "1" || s === "TRUE") viewingStatus = STATUS.APPROVED;
        else if (s === "0" || s === "FALSE") viewingStatus = STATUS.PENDING;
        else if (
          s === STATUS.PENDING ||
          s === STATUS.APPROVED ||
          s === STATUS.REJECTED ||
          s === STATUS.DELETED
        )
          viewingStatus = s;
        else viewingStatus = s;
      } else if (typeof inv.status === "boolean") {
        viewingStatus = inv.status ? STATUS.APPROVED : STATUS.PENDING;
      } else if (typeof inv.status === "number") {
        viewingStatus = inv.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
      } else if (typeof inv.approved === "boolean") {
        viewingStatus = inv.approved ? STATUS.APPROVED : STATUS.PENDING;
      }

      const viewing = {
        invoiceCode: inv.importInvoiceCode || inv.invoiceCode || id,
        supplierCode: inv.supplierCode,
        supplierName:
          inv.supplierName ||
          invoice.supplierName ||
          invoice.supplierInfo?.supplierName,
        importDate,
        totalAmount: Number(inv.totalAmount || inv.total || 0),
        notes: inv.description || inv.notes || "",
        status: viewingStatus,
        items,
        _raw: inv
      };

      setViewingInvoice(viewing);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      // fallback to provided invoice object
      setViewingInvoice(invoice);
      setIsViewModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Print approved invoice - open print route in new tab
  const handlePrint = (invoice) => {
    try {
      const id =
        invoice.invoiceCode ||
        invoice._raw?.importInvoiceCode ||
        invoice._raw?.id;
      // Replace :id in path with actual id
      const url = `${window.location.origin}${path.AdminImportPrint.replace(
        ":id",
        encodeURIComponent(id)
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Print navigation error:", err);
    }
  };

  // Handle approve/reject
  const handleApprove = (invoice) => {
    showApprovalConfirm(invoice, "approve");
  };

  const handleReject = (invoice) => {
    showApprovalConfirm(invoice, "reject");
  };

  // Export invoices
  const handleExport = () => {
    const csvContent = [
      [
        "Mã hóa đơn",
        "Nhà cung cấp",
        "Ngày nhập",
        "Tổng tiền",
        "Trạng thái",
        "Ghi chú"
      ],
      ...filteredInvoices.map((invoice) => [
        invoice.invoiceCode,
        invoice.supplierName,
        invoice.importDate,
        invoice.totalAmount,
        statusToLabel(invoice.status),
        invoice.notes
      ])
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-invoices-approval.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0) {
      loadImportInvoices();
    }
  }, [suppliers]);

  // Counts for stats
  const pendingCount = importInvoices.filter(
    (inv) => inv.status === STATUS.PENDING
  ).length;
  const approvedCount = importInvoices.filter(
    (inv) => inv.status === STATUS.APPROVED
  ).length;
  const rejectedCount = importInvoices.filter(
    (inv) => inv.status === STATUS.REJECTED
  ).length;
  const deletedCount = importInvoices.filter(
    (inv) => inv.status === STATUS.DELETED
  ).length;
  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (inv.totalAmount || 0),
    0
  );

  const handleFilterByStatus = (status) => {
    setFilterStatus(status || "all");
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-purple-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Duyệt hóa đơn nhập hàng
                </h1>
                <p className="text-gray-600">
                  Quản lý và duyệt các hóa đơn nhập hàng chờ xử lý
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaDownload />
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã hóa đơn, nhà cung cấp, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={10}>10 / trang</option>
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleFilterByStatus("all")}
            onKeyDown={(e) => e.key === "Enter" && handleFilterByStatus("all")}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng hóa đơn
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {importInvoices.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaFileInvoice className="text-blue-600" />
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleFilterByStatus("pending")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("pending")
            }
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chờ duyệt</p>
                <p className="text-2xl font-bold text-orange-700">
                  {pendingCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FaClock className="text-orange-600" />
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleFilterByStatus("approved")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("approved")
            }
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-700">
                  {approvedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-green-600" />
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleFilterByStatus("rejected")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("rejected")
            }
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã từ chối</p>
                <p className="text-2xl font-bold text-red-700">
                  {rejectedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FaTimesCircle className="text-red-600" />
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleFilterByStatus("deleted")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("deleted")
            }
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã xóa</p>
                <p className="text-2xl font-bold text-gray-700">
                  {deletedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <FaTimesCircle className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Alert for Pending Items */}
        {pendingCount > 0 && filterStatus === "pending" && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <FaClock className="text-orange-600 text-lg" />
              <div>
                <h3 className="text-orange-800 font-medium">
                  Có {pendingCount} hóa đơn nhập hàng đang chờ duyệt
                </h3>
                <p className="text-orange-700 text-sm">
                  Vui lòng xem xét và duyệt các hóa đơn để hoàn tất quy trình
                  nhập hàng.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("invoiceCode")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Mã hóa đơn
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhà cung cấp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("importDate")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Ngày nhập
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("totalAmount")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Tổng tiền
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="ml-2 text-gray-600">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {filterStatus === "pending"
                        ? "Không có hóa đơn nào chờ duyệt"
                        : "Không có hóa đơn nhập hàng nào"}
                    </td>
                  </tr>
                ) : (
                  currentInvoices.map((invoice, index) => (
                    <tr
                      key={invoice.invoiceCode || index}
                      className={`hover:bg-gray-50 ${
                        invoice.status === STATUS.PENDING ? "bg-orange-25" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceCode}
                          </div>
                          {invoice.status === STATUS.PENDING && (
                            <div
                              className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                              title="Chờ duyệt"
                            ></div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {invoice.supplierName}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {invoice.supplierCode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.importDate || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND"
                          }).format(invoice.totalAmount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            invoice.status === STATUS.APPROVED
                              ? "bg-green-50 text-green-700"
                              : invoice.status === STATUS.PENDING
                              ? "bg-orange-50 text-orange-700"
                              : invoice.status === STATUS.REJECTED
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {invoice.status === STATUS.APPROVED ? (
                            <>
                              <FaCheckCircle className="text-xs" />
                              Đã duyệt
                            </>
                          ) : invoice.status === STATUS.PENDING ? (
                            <>
                              <FaClock className="text-xs" />
                              Chờ duyệt
                            </>
                          ) : invoice.status === STATUS.REJECTED ? (
                            <>
                              <FaTimes className="text-xs" />
                              Đã từ chối
                            </>
                          ) : (
                            <>{statusToLabel(invoice.status)}</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(invoice)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          {/* Print button: only enabled for approved invoices */}
                          {invoice.status === STATUS.APPROVED ? (
                            <button
                              onClick={() => handlePrint(invoice)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="In hóa đơn"
                            >
                              <FaPrint />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                showErrorModal(
                                  "Không thể in hóa đơn",
                                  "Chỉ có hóa đơn đã duyệt mới có thể in."
                                )
                              }
                              className="text-gray-400 p-2 rounded-lg"
                              title="Không thể in"
                            >
                              <FaPrint />
                            </button>
                          )}

                          {invoice.status === STATUS.PENDING && (
                            <>
                              <button
                                onClick={() => handleApprove(invoice)}
                                className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                title="Duyệt hóa đơn"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => handleReject(invoice)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Từ chối hóa đơn"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* View Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingInvoice(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaEye className="text-blue-600" />
              </div>
              <span>Chi tiết hóa đơn nhập hàng</span>
            </div>
          }
          size="xl"
        >
          {viewingInvoice && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FaFileInvoice className="inline mr-2" />
                      Mã hóa đơn
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg font-medium">
                      {viewingInvoice.invoiceCode || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FaTruck className="inline mr-2" />
                      Nhà cung cấp
                    </label>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                      <p className="text-gray-900 font-medium">
                        {viewingInvoice.supplierName}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {viewingInvoice.supplierCode}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FaCalendarAlt className="inline mr-2" />
                      Ngày nhập
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingInvoice.importDate || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        viewingInvoice.status === STATUS.APPROVED
                          ? "bg-green-50 text-green-700"
                          : viewingInvoice.status === STATUS.PENDING
                          ? "bg-orange-50 text-orange-700"
                          : viewingInvoice.status === STATUS.REJECTED
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {viewingInvoice.status === STATUS.APPROVED ? (
                        <>
                          <FaCheckCircle />
                          Đã duyệt
                        </>
                      ) : viewingInvoice.status === STATUS.PENDING ? (
                        <>
                          <FaClock />
                          Chờ duyệt
                        </>
                      ) : viewingInvoice.status === STATUS.REJECTED ? (
                        <>
                          <FaTimes />
                          Đã từ chối
                        </>
                      ) : (
                        <>{statusToLabel(viewingInvoice.status)}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaStickyNote className="inline mr-2" />
                  Ghi chú
                </label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[60px]">
                  {viewingInvoice.notes || "Không có ghi chú"}
                </p>
              </div>

              {viewingInvoice.status === STATUS.REJECTED && (
                <div className="mt-3 p-3 rounded bg-red-50 border border-red-100">
                  <div className="text-sm font-semibold text-red-800">
                    Lý do từ chối
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {viewingInvoice.reason ||
                      viewingInvoice.rejectReason ||
                      viewingInvoice.rejectedReason ||
                      "Không có lý do được cung cấp."}
                  </div>
                </div>
              )}

              {/* Items table */}
              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Chi tiết sản phẩm
                  </label>
                  {/* Make table scrollable inside modal to avoid page over-scroll */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Mã sản phẩm
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Tên sản phẩm
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              Số lượng
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Đơn giá
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Thành tiền
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewingInvoice.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {item.productCode}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {getProductName(item.productCode)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-center">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND"
                                }).format(item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                {new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND"
                                }).format(item.quantity * item.unitPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td
                              colSpan="4"
                              className="px-4 py-3 text-right font-bold text-gray-900"
                            >
                              Tổng cộng:
                            </td>
                            <td className="px-4 py-3 font-bold text-lg text-gray-900 text-right">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND"
                              }).format(viewingInvoice.totalAmount || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                {/* Approval Actions */}
                {viewingInvoice.status === STATUS.PENDING && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleApprove(viewingInvoice);
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <FaCheck />
                      Duyệt hóa đơn
                    </button>
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleReject(viewingInvoice);
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <FaTimes />
                      Từ chối
                    </button>
                  </div>
                )}

                {/* Print button moved to the table actions column. */}

                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingInvoice(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-auto"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false })}
          title={
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  confirmModal.type === "success"
                    ? "bg-green-100"
                    : confirmModal.type === "error"
                    ? "bg-red-100"
                    : confirmModal.type === "approve"
                    ? "bg-green-100"
                    : confirmModal.type === "reject"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              >
                {confirmModal.type === "success" && (
                  <FaCheckCircle className="text-green-600" />
                )}
                {confirmModal.type === "error" && (
                  <FaExclamationTriangle className="text-red-600" />
                )}
                {confirmModal.type === "approve" && (
                  <FaCheck className="text-green-600" />
                )}
                {confirmModal.type === "reject" && (
                  <FaTimes className="text-red-600" />
                )}
                {confirmModal.type === "info" && (
                  <FaInfoCircle className="text-blue-600" />
                )}
              </div>
              <span>{confirmModal.title}</span>
            </div>
          }
        >
          <div className="text-gray-700 mb-6">{confirmModal.message}</div>
          {confirmModal.type === "reject" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập lý do từ chối (bắt buộc)"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            {confirmModal.onCancel && (
              <button
                onClick={confirmModal.onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {confirmModal.cancelText || "Hủy"}
              </button>
            )}
            <button
              onClick={confirmModal.onConfirm}
              className={`px-4 py-2 rounded-lg transition-colors ${
                confirmModal.type === "reject"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : confirmModal.type === "approve"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={confirmModal.type === "reject" && !rejectReason.trim()}
            >
              {confirmModal.confirmText || "OK"}
            </button>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovalPage;
