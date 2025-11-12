import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaPercent,
  FaCalendarAlt,
  FaEye,
  FaCopy
} from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Table from "~/components/Admin/Table";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import promotionService from "~/apis/promotionService";
import promotionTypeService from "~/apis/promotionTypeService";
import { toast, ToastContainer } from "react-toastify";

const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;
const MAX_CODE_LEN = 50;

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [promotionTypes, setPromotionTypes] = useState([]);
  const [filteredPromotions, setFilteredPromotions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form matches API shape: promotionCode, promotionName, value, promotionTypeCode, startDate, endDate, status
  const [formData, setFormData] = useState({
    promotionCode: "",
    promotionName: "",
    description: "",
    promotionTypeCode: "",
    value: 0,
    startDate: "",
    endDate: "",
    status: true
  });

  // Load promotions from API
  const loadPromotions = async () => {
    try {
      setLoading(true);
      const response = await promotionService.getAllPromotions();
      // Log response shape for debugging when data is not showing
      console.debug("promotions response:", response);

      let data =
        (response &&
          Array.isArray(response.data?.data) &&
          response.data.data) ||
        (response && Array.isArray(response.data) && response.data) ||
        [];

      // Fallback: try active promotions endpoint if primary returns empty
      if (
        (!data || data.length === 0) &&
        promotionService.getActivePromotions
      ) {
        try {
          const r2 = await promotionService.getActivePromotions();
          console.debug("promotions fallback (active):", r2);
          data =
            (r2 && Array.isArray(r2.data?.data) && r2.data.data) ||
            (r2 && Array.isArray(r2.data) && r2.data) ||
            data;
        } catch (err2) {
          console.warn("promotions fallback failed", err2);
        }
      }

      setPromotions(data);
      setFilteredPromotions(data);
    } catch (error) {
      console.error("Error loading promotions:", error);
      toast.error("Lỗi khi tải danh sách khuyến mãi");
    } finally {
      setLoading(false);
    }
  };

  // Load promotion types from API
  const loadPromotionTypes = async () => {
    try {
      const response = await promotionTypeService.getAllPromotionTypes();
      const data =
        (response &&
          Array.isArray(response.data?.data) &&
          response.data.data) ||
        (response && Array.isArray(response.data) && response.data) ||
        [];
      // Normalize promotion types to ensure consistent keys
      const normalized = data.map((t) => ({
        ...t,
        promotionTypeCode: t.promotionTypeCode || t.typeCode || t.code,
        promotionTypeName: t.promotionTypeName || t.typeName || t.name,
        isActive: t.isActive !== undefined ? t.isActive : true
      }));
      setPromotionTypes(normalized.filter((type) => type.isActive));
    } catch (error) {
      console.error("Error loading promotion types:", error);
      toast.error("Lỗi khi tải danh sách loại khuyến mãi");
    }
  };

  useEffect(() => {
    loadPromotions();
    loadPromotionTypes();
  }, []);

  // Search functionality
  useEffect(() => {
    const filtered = promotions.filter(
      (promotion) =>
        promotion.promotionName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        promotion.promotionCode
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        promotion.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPromotions(filtered);
    setCurrentPage(1);
  }, [searchTerm, promotions]);

  // Form validation
  const validateForm = () => {
    if (!formData.promotionName.trim()) {
      toast.error("Tên khuyến mãi không được để trống");
      return false;
    }
    if (formData.promotionName.length > MAX_NAME_LEN) {
      toast.error(`Tên khuyến mãi không được vượt quá ${MAX_NAME_LEN} ký tự`);
      return false;
    }
    if (!formData.promotionCode.trim()) {
      toast.error("Mã khuyến mãi không được để trống");
      return false;
    }
    if (formData.promotionCode.length > MAX_CODE_LEN) {
      toast.error(`Mã khuyến mãi không được vượt quá ${MAX_CODE_LEN} ký tự`);
      return false;
    }
    if (!formData.promotionTypeCode) {
      toast.error("Vui lòng chọn loại khuyến mãi");
      return false;
    }
    // Validate value depending on type
    const isPercent = isPercentType(formData.promotionTypeCode);
    const storedValue = parseFloat(formData.value);
    if (isNaN(storedValue) || storedValue <= 0) {
      toast.error("Giá trị giảm giá phải lớn hơn 0");
      return false;
    }
    if (isPercent && storedValue > 1) {
      toast.error("Giá trị phần trăm phải nhỏ hơn hoặc bằng 100%");
      return false;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc");
      return false;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return false;
    }
    if (formData.description && formData.description.length > MAX_DESC_LEN) {
      toast.error(`Mô tả không được vượt quá ${MAX_DESC_LEN} ký tự`);
      return false;
    }
    return true;
  };

  // Generate promotion code
  const generatePromotionCode = () => {
    const prefix = "PM";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}_${timestamp}${random}`;
  };

  // Open modal for creating new promotion
  const openCreateModal = () => {
    setCurrentPromotion(null);
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Use datetime-local format for inputs (YYYY-MM-DDTHH:MM)
    setFormData({
      promotionCode: generatePromotionCode(),
      promotionName: "",
      description: "",
      promotionTypeCode: "",
      value: 0,
      startDate: toDatetimeLocalInput(today),
      endDate: toDatetimeLocalInput(nextMonth),
      status: true
    });
    setIsModalOpen(true);
  };

  // Open modal for editing promotion
  const openEditModal = (promotion) => {
    setCurrentPromotion(promotion);
    setFormData({
      promotionCode: promotion.promotionCode || "",
      promotionName: promotion.promotionName || "",
      description: promotion.description || "",
      promotionTypeCode:
        promotion.promotionTypeCode || promotion.promotionType || "",
      value: promotion.value || 0,
      startDate: promotion.startDate
        ? isoToDatetimeLocal(promotion.startDate)
        : "",
      endDate: promotion.endDate ? isoToDatetimeLocal(promotion.endDate) : "",
      status: promotion.status !== undefined ? promotion.status : true
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const submitData = {
        promotionCode: formData.promotionCode,
        promotionName: formData.promotionName,
        description: formData.description,
        promotionTypeCode: formData.promotionTypeCode,
        value: parseFloat(formData.value),
        startDate: datetimeLocalToApi(formData.startDate),
        endDate: datetimeLocalToApi(formData.endDate),
        status: !!formData.status
      };

      if (currentPromotion) {
        // Update existing promotion (use promotionCode as identifier)
        const code =
          currentPromotion.promotionCode || currentPromotion.promotionCode;
        await promotionService.updatePromotion(code, submitData);
        toast.success("Cập nhật khuyến mãi thành công!");
      } else {
        // Create new promotion
        await promotionService.createPromotion(submitData);
        toast.success("Tạo khuyến mãi thành công!");
      }

      setIsModalOpen(false);
      loadPromotions();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error(
        currentPromotion
          ? "Lỗi khi cập nhật khuyến mãi"
          : "Lỗi khi tạo khuyến mãi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open confirmation modal for delete
  const handleDelete = (promotion) => {
    setConfirmTarget(promotion);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      const code = confirmTarget.promotionCode || confirmTarget.promotionCode;
      await promotionService.deletePromotion(code);
      toast.success("Xóa khuyến mãi thành công!");
      loadPromotions();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Lỗi khi xóa khuyến mãi");
    } finally {
      setIsConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // When changing the promotion type, reset the value to avoid unit confusion
    if (name === "promotionTypeCode") {
      setFormData((prev) => ({
        ...prev,
        promotionTypeCode: value,
        value: 0
      }));
      return;
    }

    // When editing the value field, interpret input as percent (whole number) if type is percent
    if (name === "value") {
      // allow empty
      if (value === "") {
        setFormData((prev) => ({ ...prev, value: "" }));
        return;
      }
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return;
      setFormData((prev) => {
        const isPercent = isPercentType(prev.promotionTypeCode);
        return {
          ...prev,
          value: isPercent ? parsed / 100 : parsed
        };
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Copy promotion code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép mã khuyến mãi!");
  };

  // Check if promotion is currently active (based on status and dates)
  const isPromotionActive = (promotion) => {
    if (!promotion.status) return false;
    const now = new Date();
    if (promotion.startDate && promotion.endDate) {
      const start = new Date(promotion.startDate);
      const end = new Date(promotion.endDate);
      return now >= start && now <= end;
    }
    // If no date range specified, consider it active when status=true
    return true;
  };

  // Get promotion type name by code
  const getPromotionTypeName = (typeCode) => {
    const type = promotionTypes.find(
      (t) => t && t.promotionTypeCode === typeCode
    );
    return type ? type.promotionTypeName : typeCode || "Không xác định";
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("vi-VN");
  };

  // Helpers to work with datetime-local inputs and API ISO_LOCAL_DATE_TIME
  const pad = (n) => String(n).padStart(2, "0");

  // Convert a Date to a string suitable for <input type="datetime-local"> (YYYY-MM-DDTHH:MM)
  const toDatetimeLocalInput = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Parse an incoming ISO date (with/without timezone) to datetime-local string
  const isoToDatetimeLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return toDatetimeLocalInput(d);
  };

  // Convert datetime-local input value (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS) to ISO_LOCAL_DATE_TIME (YYYY-MM-DDTHH:MM:SS)
  const datetimeLocalToApi = (localStr) => {
    if (!localStr) return null;
    // If seconds present, keep them; otherwise add :00
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStr)) {
      return `${localStr}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(localStr)) {
      return localStr;
    }
    // Fallback: try parsing and formatting
    const d = new Date(localStr);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Detect if a promotion type (by code) is a percentage type
  const isPercentType = (typeCode) => {
    if (!typeCode) return false;
    const t = promotionTypes.find(
      (p) => p && (p.promotionTypeCode === typeCode || p.code === typeCode)
    );
    const name = t ? t.promotionTypeName || t.typeName || "" : "";
    if (name && name.toLowerCase().includes("percent")) return true;
    // Sometimes backend uses keys like PERCENTAGE in discountType
    if (t?.discountType && t.discountType === "PERCENTAGE") return true;
    // Fallback: check typeCode naming
    if (
      typeof typeCode === "string" &&
      typeCode.toLowerCase().includes("pt_01")
    )
      return true;
    return false;
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredPromotions.slice(startIndex, endIndex);

  // Get promotion statistics
  const activePromotions = promotions.filter((p) => isPromotionActive(p));
  const expiredPromotions = promotions.filter(
    (p) => p.endDate && new Date(p.endDate) < new Date()
  );
  const usedUpPromotions = [];

  // Table columns
  const columns = [
    {
      key: "promotionCode",
      label: "Mã khuyến mãi",
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {item.promotionCode}
          </span>
          <button
            onClick={() => copyToClipboard(item.promotionCode)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Sao chép mã"
          >
            <FaCopy className="text-xs" />
          </button>
        </div>
      )
    },
    {
      key: "promotionName",
      label: "Tên khuyến mãi",
      render: (value, item) => (
        <div className="font-medium text-gray-900">{item.promotionName}</div>
      )
    },
    {
      key: "promotionType",
      label: "Loại",
      render: (value, item) => {
        if (!item) return <span className="text-sm text-gray-600">—</span>;
        return (
          <span className="text-sm text-gray-600">
            {getPromotionTypeName(
              item.promotionTypeCode || item.promotionTypeName
            )}
          </span>
        );
      }
    },
    {
      key: "discountValue",
      label: "Giá trị giảm",
      render: (value, item) => {
        if (!item) return <span className="font-medium text-green-600">—</span>;
        // Determine display by type name or value
        const type = promotionTypes.find(
          (t) => t && t.promotionTypeCode === item.promotionTypeCode
        );
        const isPercent =
          (item.promotionTypeName &&
            String(item.promotionTypeName).toLowerCase().includes("percent")) ||
          (type &&
            type.promotionTypeName &&
            String(type.promotionTypeName).toLowerCase().includes("percent")) ||
          (typeof item.value === "number" && item.value > 0 && item.value <= 1);
        if (isPercent) {
          return (
            <span className="font-medium text-green-600">
              {(Number(item.value || 0) * 100).toFixed(0)}%
            </span>
          );
        }
        return (
          <span className="font-medium text-green-600">
            {formatCurrency(Number(item.value || 0))}
          </span>
        );
      }
    },
    {
      key: "dateRange",
      label: "Thời gian",
      render: (value, item) => {
        if (!item)
          return (
            <div className="text-sm">
              <div>—</div>
              <div className="text-gray-500">đến —</div>
            </div>
          );
        return (
          <div className="text-sm">
            <div>{formatDate(item.startDate)}</div>
            <div className="text-gray-500">đến {formatDate(item.endDate)}</div>
          </div>
        );
      }
    },

    {
      key: "status",
      label: "Trạng thái",
      render: (value, item) => {
        if (!item.status) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Tạm dừng
            </span>
          );
        }
        if (item.endDate && new Date(item.endDate) < new Date()) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Hết hạn
            </span>
          );
        }
        if (item.startDate && new Date(item.startDate) > new Date()) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Sắp diễn ra
            </span>
          );
        }
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Đang hoạt động
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (value, item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(item)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Chỉnh sửa"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Xóa"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaPercent className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Quản lý khuyến mãi
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý các chương trình khuyến mãi trong hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>Tạo khuyến mãi</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <SearchBar
            placeholder="Tìm kiếm khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng khuyến mãi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotions.length}
                </p>
              </div>
              <FaPercent className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-green-600">
                  {activePromotions.length}
                </p>
              </div>
              <FaCalendarAlt className="text-green-500 text-xl" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hết hạn</p>
                <p className="text-2xl font-bold text-red-600">
                  {expiredPromotions.length}
                </p>
              </div>
              <FaCalendarAlt className="text-red-500 text-xl" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hết lượt sử dụng</p>
                <p className="text-2xl font-bold text-orange-600">
                  {usedUpPromotions.length}
                </p>
              </div>
              <FaEye className="text-orange-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={currentItems}
                emptyMessage="Không tìm thấy khuyến mãi nào"
              />
              {totalPages > 1 && (
                <div className="p-4 border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            currentPromotion ? "Chỉnh sửa khuyến mãi" : "Tạo khuyến mãi mới"
          }
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Promotion Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã khuyến mãi *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="promotionCode"
                    value={formData.promotionCode}
                    disabled
                    maxLength={MAX_CODE_LEN}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Mã khuyến mãi"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.promotionCode)}
                    className="px-3 py-2 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                    title="Sao chép mã"
                  >
                    <FaCopy />
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.promotionCode.length}/{MAX_CODE_LEN} ký tự
                </div>
              </div>

              {/* Promotion Type (use code) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại khuyến mãi *
                </label>
                <select
                  name="promotionTypeCode"
                  value={formData.promotionTypeCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Chọn loại khuyến mãi</option>
                  {promotionTypes.filter(Boolean).map((type) => (
                    <option
                      key={type.promotionTypeCode}
                      value={type.promotionTypeCode}
                    >
                      {type.promotionTypeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Promotion Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên khuyến mãi *
              </label>
              <input
                type="text"
                name="promotionName"
                value={formData.promotionName}
                onChange={handleInputChange}
                maxLength={MAX_NAME_LEN}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên khuyến mãi"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.promotionName.length}/{MAX_NAME_LEN} ký tự
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị giảm *
                </label>
                <div className="flex">
                  <input
                    type="number"
                    name="value"
                    value={
                      isPercentType(formData.promotionTypeCode)
                        ? formData.value === ""
                          ? ""
                          : formData.value * 100
                        : formData.value
                    }
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={
                      isPercentType(formData.promotionTypeCode)
                        ? "Nhập số (ví dụ 10 cho 10%)"
                        : "Nhập số tiền (ví dụ 100000)"
                    }
                    required
                  />
                  <span className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-700">
                    {isPercentType(formData.promotionTypeCode) ? "%" : "VND"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isPercentType(formData.promotionTypeCode)
                    ? "Nhập phần trăm (ví dụ 10 cho 10%). Giá trị sẽ được gửi dưới dạng 0.10"
                    : "Nhập số tiền giảm (VND)"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu *
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc *
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={MAX_DESC_LEN}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mô tả cho khuyến mãi"
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/{MAX_DESC_LEN} ký tự
              </div>
            </div>

            {/* Status checkbox */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Kích hoạt khuyến mãi
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {submitting
                    ? "Đang lưu..."
                    : currentPromotion
                    ? "Cập nhật"
                    : "Tạo mới"}
                </span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirmation Modal for delete */}
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setConfirmTarget(null);
          }}
          title="Xác nhận xóa"
          size="sm"
        >
          <div className="space-y-4">
            <p>
              Bạn có chắc chắn muốn xóa khuyến mãi "
              {confirmTarget?.promotionName || ""}"?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setConfirmTarget(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </Modal>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AdminLayout>
  );
};

export default PromotionsPage;
