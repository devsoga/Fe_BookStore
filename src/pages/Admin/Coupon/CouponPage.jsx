// src/pages/admin/CouponPage.jsx
import React, { useEffect, useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaPercent,
  FaCalendarAlt,
  FaCopy,
  FaEye // 🔍 thêm icon xem chi tiết
} from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Table from "~/components/Admin/Table";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import couponService from "~/apis/couponService";
import promotionTypeService from "~/apis/promotionTypeService";
import { toast, ToastContainer } from "react-toastify";

const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;
const MAX_CODE_LEN = 50;

const CouponPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [promotionTypes, setPromotionTypes] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🔍 state xem chi tiết
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingCoupon, setViewingCoupon] = useState(null);

  // Form mapping CouponRequest:
  // couponCode, couponName, description, promotionTypeCode, value, startDate, endDate, status
  const [formData, setFormData] = useState({
    couponCode: "",
    couponName: "",
    description: "",
    promotionTypeCode: "",
    value: 0,
    startDate: "",
    endDate: "",
    status: true
  });

  // ========= Helpers datetime =========
  const pad = (n) => String(n).padStart(2, "0");

  const toDatetimeLocalInput = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const isoToDatetimeLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return toDatetimeLocalInput(d);
  };

  // Convert datetime-local ("YYYY-MM-DDTHH:mm") -> ISO_LOCAL_DATE_TIME ("YYYY-MM-DDTHH:mm:ss")
  const datetimeLocalToApi = (localStr) => {
    if (!localStr) return null;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStr)) {
      return `${localStr}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(localStr)) {
      return localStr;
    }
    const d = new Date(localStr);
    if (isNaN(d)) return null;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Detect percent type
  const isPercentType = (typeCode) => {
    if (!typeCode) return false;
    const t = promotionTypes.find((p) => p && p.promotionTypeCode === typeCode);
    const name = t ? t.promotionTypeName || "" : "";
    if (name.toLowerCase().includes("percent")) return true;
    if (
      typeof typeCode === "string" &&
      typeCode.toLowerCase().includes("pt_01")
    )
      return true;
    return false;
  };

  // ========= Load data =========
  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getAllCoupons();

      let data =
        (response &&
          Array.isArray(response.data?.data) &&
          response.data.data) ||
        (response && Array.isArray(response.data) && response.data) ||
        [];

      setCoupons(data);
      setFilteredCoupons(data);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Lỗi khi tải danh sách coupon");
    } finally {
      setLoading(false);
    }
  };

  const loadPromotionTypes = async () => {
    try {
      const response = await promotionTypeService.getAllPromotionTypes();
      const data =
        (response &&
          Array.isArray(response.data?.data) &&
          response.data.data) ||
        (response && Array.isArray(response.data) && response.data) ||
        [];
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
    loadCoupons();
    loadPromotionTypes();
  }, []);

  // ========= Search =========
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = coupons.filter(
      (c) =>
        c.couponName?.toLowerCase().includes(term) ||
        c.couponCode?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
    );
    setFilteredCoupons(filtered);
    setCurrentPage(1);
  }, [searchTerm, coupons]);

  // ========= Validation =========
  const validateForm = () => {
    if (!formData.couponName.trim()) {
      toast.error("Tên coupon không được để trống");
      return false;
    }
    if (formData.couponName.length > MAX_NAME_LEN) {
      toast.error(`Tên coupon không được vượt quá ${MAX_NAME_LEN} ký tự`);
      return false;
    }
    if (!formData.couponCode.trim()) {
      toast.error("Mã coupon không được để trống");
      return false;
    }
    if (formData.couponCode.length > MAX_CODE_LEN) {
      toast.error(`Mã coupon không được vượt quá ${MAX_CODE_LEN} ký tự`);
      return false;
    }
    if (!formData.promotionTypeCode) {
      toast.error("Vui lòng chọn loại giảm giá (Percent/Amount)");
      return false;
    }

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

  // ========= Generate Code =========
  const generateCouponCode = () => {
    const prefix = "COUP";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}_${timestamp}${random}`;
  };

  // ========= Modal Open =========
  const openCreateModal = () => {
    setCurrentCoupon(null);
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setFormData({
      couponCode: generateCouponCode(),
      couponName: "",
      description: "",
      promotionTypeCode: "",
      value: 0,
      startDate: toDatetimeLocalInput(today),
      endDate: toDatetimeLocalInput(nextMonth),
      status: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setCurrentCoupon(coupon);
    setFormData({
      couponCode: coupon.couponCode || "",
      couponName: coupon.couponName || "",
      description: coupon.description || "",
      promotionTypeCode: coupon.promotionTypeCode || "",
      value: coupon.value || 0,
      startDate: coupon.startDate ? isoToDatetimeLocal(coupon.startDate) : "",
      endDate: coupon.endDate ? isoToDatetimeLocal(coupon.endDate) : "",
      status: coupon.status !== undefined ? coupon.status : true
    });
    setIsModalOpen(true);
  };

  // 🔍 mở modal xem chi tiết
  const openViewModal = (coupon) => {
    setViewingCoupon(coupon);
    setIsViewModalOpen(true);
  };

  // ========= Submit =========
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const submitData = {
        couponCode: formData.couponCode,
        couponName: formData.couponName,
        description: formData.description,
        promotionTypeCode: formData.promotionTypeCode,
        value: parseFloat(formData.value),
        startDate: datetimeLocalToApi(formData.startDate),
        endDate: datetimeLocalToApi(formData.endDate),
        status: !!formData.status
      };

      if (currentCoupon) {
        const code = currentCoupon.couponCode;
        await couponService.updateCoupon(code, submitData);
        toast.success("Cập nhật coupon thành công!");
      } else {
        await couponService.createCoupon(submitData);
        toast.success("Tạo coupon mới thành công!");
      }

      setIsModalOpen(false);
      await loadCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error(
        currentCoupon ? "Lỗi khi cập nhật coupon" : "Lỗi khi tạo coupon"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ========= Delete =========
  const handleDelete = (coupon) => {
    setConfirmTarget(coupon);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      const code = confirmTarget.couponCode;
      await couponService.deleteCoupon(code);
      toast.success("Xóa (soft) coupon thành công!");
      await loadCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Lỗi khi xóa coupon");
    } finally {
      setIsConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // ========= Input change =========
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "promotionTypeCode") {
      setFormData((prev) => ({
        ...prev,
        promotionTypeCode: value,
        value: 0
      }));
      return;
    }

    if (name === "value") {
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

  // ========= Utils =========
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép mã coupon!");
  };

  const getPromotionTypeName = (typeCode) => {
    const type = promotionTypes.find(
      (t) => t && t.promotionTypeCode === typeCode
    );
    return type ? type.promotionTypeName : typeCode || "Không xác định";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("vi-VN");
  };

  const isCouponActive = (coupon) => {
    if (!coupon.status) return false;
    const now = new Date();
    if (coupon.startDate && coupon.endDate) {
      const start = new Date(coupon.startDate);
      const end = new Date(coupon.endDate);
      return now >= start && now <= end;
    }
    return true;
  };

  // ========= Pagination =========
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCoupons.slice(startIndex, endIndex);

  const activeCoupons = coupons.filter((c) => isCouponActive(c));
  const expiredCoupons = coupons.filter(
    (c) => c.endDate && new Date(c.endDate) < new Date()
  );

  // ========= Table Columns =========
  const columns = [
    {
      key: "couponCode",
      label: "Mã coupon",
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {item.couponCode}
          </span>
          <button
            onClick={() => copyToClipboard(item.couponCode)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Sao chép mã"
          >
            <FaCopy className="text-xs" />
          </button>
        </div>
      )
    },
    {
      key: "couponName",
      label: "Tên coupon",
      render: (value, item) => (
        <div className="font-medium text-gray-900">{item.couponName}</div>
      )
    },
    {
      key: "promotionType",
      label: "Loại",
      render: (value, item) => (
        <span className="text-sm text-gray-600">
          {getPromotionTypeName(item.promotionTypeCode)}
        </span>
      )
    },
    {
      key: "discountValue",
      label: "Giá trị giảm",
      render: (value, item) => {
        if (!item) return <span className="font-medium text-green-600">—</span>;
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
      render: (value, item) => (
        <div className="text-sm">
          <div>{formatDate(item.startDate)}</div>
          <div className="text-gray-500">đến {formatDate(item.endDate)}</div>
        </div>
      )
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
          {/* 🔍 nút xem chi tiết */}
          <button
            onClick={() => openViewModal(item)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Xem chi tiết"
          >
            <FaEye />
          </button>

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
                Quản lý coupon
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý các mã giảm giá (coupon) trong hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>Tạo coupon</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <SearchBar
            placeholder="Tìm kiếm coupon..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng coupon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {coupons.length}
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
                  {activeCoupons.length}
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
                  {expiredCoupons.length}
                </p>
              </div>
              <FaCalendarAlt className="text-red-500 text-xl" />
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
                emptyMessage="Không tìm thấy coupon nào"
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

        {/* Create / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentCoupon ? "Chỉnh sửa coupon" : "Tạo coupon mới"}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã coupon *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="couponCode"
                    value={formData.couponCode}
                    disabled={!!currentCoupon} // sửa không cho đổi mã
                    maxLength={MAX_CODE_LEN}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Mã coupon"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.couponCode)}
                    className="px-3 py-2 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                    title="Sao chép mã"
                  >
                    <FaCopy />
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.couponCode.length}/{MAX_CODE_LEN} ký tự
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại giảm giá *
                </label>
                <select
                  name="promotionTypeCode"
                  value={formData.promotionTypeCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Chọn loại giảm giá</option>
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

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên coupon *
              </label>
              <input
                type="text"
                name="couponName"
                value={formData.couponName}
                onChange={handleInputChange}
                maxLength={MAX_NAME_LEN}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên coupon"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.couponName.length}/{MAX_NAME_LEN} ký tự
              </div>
            </div>

            {/* Value */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        ? "Nhập số (vd: 10 cho 10%)"
                        : "Nhập số tiền (vd: 50000)"
                    }
                    required
                  />
                  <span className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-700">
                    {isPercentType(formData.promotionTypeCode) ? "%" : "VND"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isPercentType(formData.promotionTypeCode)
                    ? "Nhập phần trăm (ví dụ 10 cho 10%). Giá trị gửi lên sẽ là 0.10"
                    : "Nhập số tiền giảm (VND)"}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Nhập mô tả cho coupon"
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/{MAX_DESC_LEN} ký tự
              </div>
            </div>

            {/* Status */}
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
                  Kích hoạt coupon
                </label>
              </div>
            </div>

            {/* Actions */}
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
                    : currentCoupon
                    ? "Cập nhật"
                    : "Tạo mới"}
                </span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm delete */}
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setConfirmTarget(null);
          }}
          title="Xác nhận xóa coupon"
          size="sm"
        >
          <div className="space-y-4">
            <p>
              Bạn có chắc chắn muốn xóa coupon "
              {confirmTarget?.couponName || ""}"?
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

        {/* 🔍 View detail Coupon Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Chi tiết coupon"
          size="md"
        >
          {viewingCoupon && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã coupon:</span>
                <span className="font-mono font-medium">
                  {viewingCoupon.couponCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tên coupon:</span>
                <span className="font-medium">{viewingCoupon.couponName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loại giảm giá:</span>
                <span className="font-medium">
                  {getPromotionTypeName(viewingCoupon.promotionTypeCode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Giá trị giảm:</span>
                <span className="font-medium text-green-600">
                  {(() => {
                    const type = promotionTypes.find(
                      (t) =>
                        t &&
                        t.promotionTypeCode === viewingCoupon.promotionTypeCode
                    );
                    const isPercent =
                      (viewingCoupon.promotionTypeName &&
                        String(viewingCoupon.promotionTypeName)
                          .toLowerCase()
                          .includes("percent")) ||
                      (type &&
                        type.promotionTypeName &&
                        String(type.promotionTypeName)
                          .toLowerCase()
                          .includes("percent")) ||
                      (typeof viewingCoupon.value === "number" &&
                        viewingCoupon.value > 0 &&
                        viewingCoupon.value <= 1);

                    if (isPercent) {
                      return `${(
                        Number(viewingCoupon.value || 0) * 100
                      ).toFixed(0)}%`;
                    }
                    return formatCurrency(Number(viewingCoupon.value || 0));
                  })()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">
                  Thời gian áp dụng:
                </span>
                <div className="flex justify-between">
                  <span>Bắt đầu:</span>
                  <span className="font-medium">
                    {formatDate(viewingCoupon.startDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kết thúc:</span>
                  <span className="font-medium">
                    {formatDate(viewingCoupon.endDate)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Mô tả:</span>
                <p className="text-gray-800">
                  {viewingCoupon.description || "—"}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trạng thái:</span>
                <span
                  className={`font-medium ${
                    isCouponActive(viewingCoupon)
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {(() => {
                    if (!viewingCoupon.status) return "Tạm dừng";
                    if (
                      viewingCoupon.endDate &&
                      new Date(viewingCoupon.endDate) < new Date()
                    )
                      return "Hết hạn";
                    if (
                      viewingCoupon.startDate &&
                      new Date(viewingCoupon.startDate) > new Date()
                    )
                      return "Sắp diễn ra";
                    return "Đang hoạt động";
                  })()}
                </span>
              </div>
            </div>
          )}
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

export default CouponPage;
