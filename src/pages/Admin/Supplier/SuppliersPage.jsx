import React, { useState, useEffect } from "react";
import {
  FaEdit,
  FaPlus,
  FaTimes,
  FaTruck,
  FaHome,
  FaFileExport,
  FaExclamationTriangle,
  FaCheck,
  FaInfoCircle,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBuilding,
  FaSearch,
  FaEye,
  FaTrash,
  FaFilter,
  FaSort,
  FaDownload
} from "react-icons/fa";
import { supplierService } from "../../../apis/supplierService";
import Select from "react-select";
import { productService } from "../../../apis/productService";
import { buildImageUrl } from "../../../lib/utils";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/Admin/AdminLayout";
import Modal from "../../../components/Admin/Modal";
import Pagination from "../../../components/Admin/Pagination";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "supplierCode",
    direction: "asc"
  });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [products, setProducts] = useState([]);
  const [productProvideItems, setProductProvideItems] = useState([]);
  const navigate = useNavigate();

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

  const showDeleteConfirm = (supplierCode, supplierName) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      title: "Xóa nhà cung cấp",
      message: `Bạn có chắc muốn xóa nhà cung cấp "${supplierName}"?`,
      cancelText: "Hủy bỏ",
      confirmText: "Xóa",
      onCancel: () => setConfirmModal({ isOpen: false }),
      onConfirm: async () => {
        setLoading(true);
        try {
          await supplierService.deleteSupplier(supplierCode);
          await loadSuppliers();
          showSuccessModal(
            "Xóa thành công",
            `Nhà cung cấp "${supplierName}" đã được xóa.`
          );
        } catch (err) {
          console.error(err);
          showErrorModal(
            "Xóa thất bại",
            `Không thể xóa nhà cung cấp "${supplierName}". Vui lòng thử lại sau.`
          );
        } finally {
          setLoading(false);
          setConfirmModal({ isOpen: false });
        }
      }
    });
  };

  const generateSupplierCode = () => {
    const now = new Date();
    const code = `NCC${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;
    return code;
  };

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAllSuppliers();
      let suppliersData = response?.data?.data || response?.data || [];
      // normalize API shapes: some APIs return phoneNumber, some return phone
      suppliersData = suppliersData.map((s) => ({
        ...s,
        phone: s.phone || s.phoneNumber || "",
        phoneNumber: s.phoneNumber || s.phone || "",
        status: typeof s.status === "boolean" ? s.status : true,
        // productProvide from API: ensure it's always an array of link records
        productProvide: Array.isArray(s.productProvide)
          ? s.productProvide
          : Array.isArray(s.products)
          ? s.products
          : []
      }));
      setSuppliers(suppliersData);
      setFilteredSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      showErrorModal("Lỗi", "Không thể tải danh sách nhà cung cấp");
    } finally {
      setLoading(false);
    }
  };

  // Load products for product selector
  const loadProducts = async () => {
    try {
      const res = await productService.getAllProduct();
      // normalize: res may be array or axios response
      let data = [];
      if (Array.isArray(res)) data = res;
      else if (res && res.data) data = res.data.data || res.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const addProductProvideItem = () => {
    setProductProvideItems((prev) => [
      ...prev,
      {
        supplierProductCode: "",
        productCode: "",
        productName: "",
        importPrice: 0,
        status: true
      }
    ]);
  };

  const removeProductProvideItem = (index) => {
    setProductProvideItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProductProvideItem = (index, field, value) => {
    setProductProvideItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  // Search and filter
  useEffect(() => {
    let filtered = suppliers;

    if (searchTerm) {
      filtered = filtered.filter((supplier) => {
        const term = searchTerm.toLowerCase();
        return (
          supplier.supplierName?.toLowerCase().includes(term) ||
          supplier.supplierCode?.toLowerCase().includes(term) ||
          supplier.email?.toLowerCase().includes(term) ||
          (supplier.phone &&
            supplier.phone.toString().toLowerCase().includes(term)) ||
          (supplier.phoneNumber &&
            supplier.phoneNumber.toString().toLowerCase().includes(term))
        );
      });
    }

    // Filter by status (all / active / inactive)
    if (filterStatus === "active") {
      filtered = filtered.filter((s) => s.status === true);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((s) => s.status === false);
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

    setFilteredSuppliers(filtered);
    setCurrentPage(1);
  }, [suppliers, searchTerm, sortConfig, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / pageSize);
  const currentSuppliers = filteredSuppliers.slice(
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

  // Handle form submission
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    // Build payload exactly in the structure requested
    // supplierCode is not editable. When creating use generatedCode, when editing use existing code.
    const supplierCodeToUse = editingSupplier
      ? editingSupplier?.supplierCode || formData.get("supplierCode")
      : generatedCode || generateSupplierCode();

    const supplierData = {
      supplierCode: supplierCodeToUse,
      supplierName: formData.get("supplierName"),
      address: formData.get("address"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      description: formData.get("description"),
      status: formData.get("status") === "on"
    };

    // remove undefined keys (so create payload matches exactly)
    Object.keys(supplierData).forEach((k) => {
      if (supplierData[k] === undefined) delete supplierData[k];
    });

    // include productProvide payload if any rows present
    if (productProvideItems && productProvideItems.length > 0) {
      const pp = productProvideItems.map((item, idx) => {
        const productCode = item.productCode || "";
        return {
          supplierProductCode:
            item.supplierProductCode ||
            `SP_${supplierCodeToUse}_${productCode}_${idx + 1}`,
          supplierCode: supplierCodeToUse,
          productCode: productCode,
          importPrice: item.importPrice ? Number(item.importPrice) : 0,
          status: typeof item.status === "boolean" ? item.status : true
        };
      });
      supplierData.productProvide = pp;
    }

    try {
      if (editingSupplier) {
        // ensure supplierCode is present for update; prefer form value but fallback to editingSupplier
        const codeToSend =
          supplierData.supplierCode || editingSupplier.supplierCode;
        await supplierService.updateSupplier(codeToSend, supplierData);
        showSuccessModal(
          "Cập nhật thành công",
          "Thông tin nhà cung cấp đã được cập nhật"
        );
      } else {
        await supplierService.createSupplier(supplierData);
        showSuccessModal("Thêm thành công", "Nhà cung cấp mới đã được thêm");
      }

      setIsModalOpen(false);
      setEditingSupplier(null);
      setGeneratedCode("");
      setProductProvideItems([]);
      await loadSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      showErrorModal(
        "Lỗi",
        editingSupplier
          ? "Không thể cập nhật nhà cung cấp"
          : "Không thể thêm nhà cung cấp"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = async (supplier) => {
    setEditingSupplier(supplier);
    setGeneratedCode("");
    // populate productProvideItems for editing
    const items = Array.isArray(supplier.productProvide)
      ? supplier.productProvide.map((pp) => ({
          supplierProductCode: pp.supplierProductCode || pp.id || "",
          productCode: pp.productCode || "",
          productName: pp.productName || pp.name || "",
          importPrice: pp.importPrice || 0,
          status: typeof pp.status === "boolean" ? pp.status : true
        }))
      : [];
    setProductProvideItems(items.length ? items : []);
    await loadProducts();
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (supplier) => {
    setViewingSupplier(supplier);
    setIsViewModalOpen(true);
  };

  // Handle delete
  const handleDelete = (supplier) => {
    showDeleteConfirm(supplier.supplierCode, supplier.supplierName);
  };

  // Toggle status (show confirm then call API)
  const showToggleStatusConfirm = (supplier) => {
    setConfirmModal({
      isOpen: true,
      type: "info",
      title: supplier.status ? "Tắt nhà cung cấp" : "Bật nhà cung cấp",
      message: `Bạn có chắc muốn ${
        supplier.status ? "ngưng hoạt động" : "kích hoạt"
      } nhà cung cấp "${supplier.supplierName}"?`,
      cancelText: "Hủy",
      confirmText: supplier.status ? "Ngưng" : "Kích hoạt",
      onCancel: () => setConfirmModal({ isOpen: false }),
      onConfirm: async () => {
        setLoading(true);
        try {
          const newStatus = !supplier.status;
          await supplierService.updateSupplier(supplier.supplierCode, {
            status: newStatus
          });
          await loadSuppliers();
          showSuccessModal(
            "Cập nhật trạng thái",
            `Nhà cung cấp "${supplier.supplierName}" đã được ${
              newStatus ? "kích hoạt" : "ngưng hoạt động"
            }.`
          );
        } catch (err) {
          console.error(err);
          showErrorModal(
            "Lỗi",
            "Không thể cập nhật trạng thái. Vui lòng thử lại."
          );
        } finally {
          setLoading(false);
          setConfirmModal({ isOpen: false });
        }
      }
    });
  };

  // Export suppliers
  const handleExport = () => {
    const csvContent = [
      ["Mã NCC", "Tên nhà cung cấp", "Email", "Số điện thoại", "Địa chỉ"],
      ...filteredSuppliers.map((supplier) => [
        supplier.supplierCode,
        supplier.supplierName,
        supplier.email,
        supplier.phone || supplier.phoneNumber || "",
        supplier.address
      ])
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suppliers.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // counts for active / inactive suppliers (from full suppliers list)
  const activeCount = suppliers.filter((s) => s.status === true).length;
  const inactiveCount = suppliers.filter((s) => s.status === false).length;

  const productOptions = products.map((p) => ({
    label:
      p.productName ||
      p.name ||
      p.title ||
      p.productTitle ||
      p.productNameVN ||
      "",
    value: p.productCode || p.code || p.id || "",
    data: p
  }));

  return (
    <AdminLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaTruck className="text-blue-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản lý nhà cung cấp
                </h1>
                <p className="text-gray-600">
                  Quản lý thông tin các nhà cung cấp
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
              <button
                onClick={async () => {
                  setEditingSupplier(null);
                  const code = generateSupplierCode();
                  setGeneratedCode(code);
                  // initialize one empty productProvide row
                  setProductProvideItems([
                    {
                      supplierProductCode: ``,
                      productCode: ``,
                      productName: ``,
                      importPrice: 0,
                      status: true
                    }
                  ]);
                  // ensure products are loaded for selector
                  await loadProducts();
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaPlus />
                Thêm nhà cung cấp
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
                  placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-2 rounded-lg border ${
                  filterStatus === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700"
                }`}
                title="Hiển thị tất cả"
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-3 py-2 rounded-lg border ${
                  filterStatus === "active"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700"
                }`}
                title="Chỉ hiển thị nhà cung cấp đang hoạt động"
              >
                Hoạt động
              </button>
              <button
                onClick={() => setFilterStatus("inactive")}
                className={`px-3 py-2 rounded-lg border ${
                  filterStatus === "inactive"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700"
                }`}
                title="Chỉ hiển thị nhà cung cấp đang ngưng hoạt động"
              >
                Ngưng hoạt động
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng nhà cung cấp
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {suppliers.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaTruck className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoạt động</p>
                <p className="text-2xl font-bold text-green-700">
                  {activeCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheck className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Ngưng hoạt động
                </p>
                <p className="text-2xl font-bold text-red-700">
                  {inactiveCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FaTimes className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("supplierCode")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Mã NCC
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("supplierName")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Tên nhà cung cấp
                      <FaSort className="text-xs" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liên hệ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Địa chỉ
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentSuppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Không có nhà cung cấp nào
                    </td>
                  </tr>
                ) : (
                  currentSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier.supplierCode || index}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.supplierCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.supplierName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1 mb-1">
                            <FaPhone className="text-xs text-gray-400" />
                            <span>
                              {supplier.phone || supplier.phoneNumber || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaEnvelope className="text-xs text-gray-400" />
                            <span className="truncate max-w-[200px]">
                              {supplier.email || "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-[200px] truncate">
                          {supplier.address || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <button
                            onClick={() => showToggleStatusConfirm(supplier)}
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium focus:outline-none ${
                              supplier.status
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                            title={
                              supplier.status
                                ? "Nhấp để ngưng hoạt động"
                                : "Nhấp để kích hoạt"
                            }
                          >
                            {supplier.status ? "Hoạt động" : "Ngưng hoạt động"}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(supplier)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-yellow-600 hover:text-yellow-900 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => showToggleStatusConfirm(supplier)}
                            className={`${
                              supplier.status
                                ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                                : "text-green-600 hover:text-green-900 hover:bg-green-50"
                            } p-2 rounded-lg transition-colors`}
                            title={
                              supplier.status ? "Ngưng hoạt động" : "Kích hoạt"
                            }
                          >
                            {supplier.status ? <FaTimes /> : <FaCheck />}
                          </button>
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

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
            setGeneratedCode("");
            setProductProvideItems([]);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {editingSupplier ? (
                  <FaEdit className="text-blue-600" />
                ) : (
                  <FaPlus className="text-blue-600" />
                )}
              </div>
              <span>
                {editingSupplier
                  ? "Chỉnh sửa nhà cung cấp"
                  : "Thêm nhà cung cấp mới"}
              </span>
            </div>
          }
          size="xl"
        >
          <form onSubmit={handleSaveSupplier} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã nhà cung cấp
                </label>
                <input
                  type="text"
                  name="supplierCode"
                  defaultValue={
                    editingSupplier?.supplierCode || generatedCode || ""
                  }
                  disabled={true}
                  readOnly={true}
                  title={
                    editingSupplier
                      ? "Mã nhà cung cấp không thể chỉnh sửa"
                      : "Mã nhà cung cấp được tự động sinh theo thời gian"
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed`}
                  placeholder={
                    editingSupplier
                      ? "Mã nhà cung cấp (không thể chỉnh sửa)"
                      : "Mã nhà cung cấp sẽ được tự động sinh khi tạo"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhà cung cấp *
                </label>
                <input
                  type="text"
                  name="supplierName"
                  defaultValue={editingSupplier?.supplierName || ""}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập tên nhà cung cấp..."
                />
              </div>

              {/* contactPerson removed as requested */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingSupplier?.email || ""}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập email..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  defaultValue={
                    editingSupplier?.phoneNumber || editingSupplier?.phone || ""
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập số điện thoại..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ
              </label>
              <textarea
                name="address"
                rows="3"
                defaultValue={editingSupplier?.address || ""}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Nhập địa chỉ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                name="description"
                rows="4"
                defaultValue={editingSupplier?.description || ""}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Nhập mô tả về nhà cung cấp..."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="status"
                name="status"
                defaultChecked={editingSupplier?.status !== false}
                className="w-4 h-4"
              />
              <label htmlFor="status" className="text-sm text-gray-700">
                Kích hoạt (status)
              </label>
            </div>

            {/* ProductProvide editor */}
            <div>
              <div className="flex justify-between items-end py-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sản phẩm cung cấp
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addProductProvideItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Thêm sản phẩm
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">
                        Sản phẩm
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">
                        Giá nhập
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productProvideItems && productProvideItems.length > 0 ? (
                      productProvideItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select
                              value={item.productCode}
                              onChange={(e) =>
                                updateProductProvideItem(
                                  idx,
                                  "productCode",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Chọn sản phẩm</option>
                              {products.map((product) => {
                                const code =
                                  product.productCode ||
                                  product.code ||
                                  product.id ||
                                  "";
                                const name =
                                  product.productName ||
                                  product.name ||
                                  product.title ||
                                  code;
                                return (
                                  <option
                                    key={code || Math.random()}
                                    value={code}
                                  >
                                    {name} {code ? `(${code})` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                              value={item.importPrice}
                              onChange={(e) =>
                                updateProductProvideItem(
                                  idx,
                                  "importPrice",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.status === true}
                              onChange={(e) =>
                                updateProductProvideItem(
                                  idx,
                                  "status",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-gray-500"
                        >
                          Chưa có sản phẩm được thêm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {editingSupplier ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </form>
        </Modal>

        {/* View Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingSupplier(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaEye className="text-green-600" />
              </div>
              <span>Chi tiết nhà cung cấp</span>
            </div>
          }
          size="xl"
        >
          {viewingSupplier && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã nhà cung cấp
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingSupplier.supplierCode || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên nhà cung cấp
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingSupplier.supplierName || "N/A"}
                    </p>
                  </div>

                  {/* contactPerson removed from view modal */}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingSupplier.email || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {viewingSupplier.phone ||
                        viewingSupplier.phoneNumber ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ
                </label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                  {viewingSupplier.address || "N/A"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[100px]">
                  {viewingSupplier.description || "Không có mô tả"}
                </p>
              </div>

              {/* ProductProvide: list of supplier-product link records */}
              {viewingSupplier.productProvide &&
                viewingSupplier.productProvide.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Sản phẩm cung cấp ({viewingSupplier.productProvide.length}
                      )
                    </label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Ảnh
                            </th>

                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Mã sản phẩm
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Tên sản phẩm
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Loại sản phẩm
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Giá nhập
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewingSupplier.productProvide.map((pp, idx) => (
                            <tr
                              key={
                                pp.id ||
                                pp.supplierProductCode ||
                                pp.productCode ||
                                idx
                              }
                            >
                              <td className="px-3 py-2">
                                {pp.image ? (
                                  <img
                                    src={buildImageUrl(pp.image)}
                                    alt={pp.productName || pp.productCode}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                    No Img
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-2 text-sm text-gray-900">
                                {pp.productCode || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {pp.productName || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {pp.categoryName || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND"
                                }).format(pp.importPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                    pp.status
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {pp.status ? "Hoạt động" : "Ngưng hoạt động"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingSupplier(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
                    : confirmModal.type === "delete"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              >
                {confirmModal.type === "success" && (
                  <FaCheck className="text-green-600" />
                )}
                {confirmModal.type === "error" && (
                  <FaExclamationTriangle className="text-red-600" />
                )}
                {confirmModal.type === "delete" && (
                  <FaExclamationTriangle className="text-red-600" />
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
                confirmModal.type === "delete"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirmModal.confirmText || "OK"}
            </button>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default SuppliersPage;
