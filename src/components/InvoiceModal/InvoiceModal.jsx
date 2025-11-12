import React, { forwardRef, useState, useContext } from "react";
import {
  FaStore,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendar,
  FaCreditCard,
  FaStar,
  FaRegStar,
  FaTimes,
  FaExclamationTriangle
} from "react-icons/fa";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import { orderService } from "~/apis/orderService";

const InvoiceModal = forwardRef(({ order, onClose }, ref) => {
  if (!order) return null;

  // Try to read customer name from localStorage `userInfo` key
  let localCustomerName = null;
  try {
    const raw = localStorage.getItem("userInfo");
    if (raw) {
      const parsed = JSON.parse(raw);
      localCustomerName = parsed?.customerName || parsed?.fullName || null;
    }
  } catch (e) {
    // ignore parse errors
    localCustomerName = null;
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value)))
      return "0";
    try {
      return Number(value).toLocaleString("vi-VN");
    } catch (e) {
      return String(value);
    }
  };

  const formatDateTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

  const { toast } = useContext(ToastifyContext);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingType, setRatingType] = useState("overall"); // 'overall' or 'individual'
  const [overallRating, setOverallRating] = useState(0);
  const [productRatings, setProductRatings] = useState({});
  const [ratingComment, setRatingComment] = useState("");

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);
      const code = order.orderCode || order.id || order._id || order.code;
      if (!code) throw new Error("Order code not found");
      await orderService.deleteOrder(code);
      setIsCancelling(false);
      setShowCancelConfirm(false);
      setShowCancelSuccess(true);
      toast && toast.success("Hủy đơn hàng thành công");
    } catch (err) {
      setIsCancelling(false);
      console.error(err);
      toast && toast.error("Hủy đơn thất bại. Vui lòng thử lại.");
    }
  };

  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onRatingChange(star)}
            className={`text-2xl ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } transition-transform`}
          >
            {star <= rating ? (
              <FaStar className="text-yellow-400" />
            ) : (
              <FaRegStar className="text-gray-300" />
            )}
          </button>
        ))}
      </div>
    );
  };

  const handleProductRatingChange = (productCode, rating) => {
    setProductRatings((prev) => ({
      ...prev,
      [productCode]: rating
    }));
  };

  const handleSubmitRating = () => {
    // Here you would typically send the rating to your API
    console.log("Rating submitted:", {
      type: ratingType,
      overallRating: ratingType === "overall" ? overallRating : null,
      productRatings: ratingType === "individual" ? productRatings : null,
      comment: ratingComment,
      orderCode: order.orderCode || order.id
    });
    toast && toast.success("Cảm ơn bạn đã đánh giá!");
    setShowRating(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-screen overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Hóa đơn bán hàng</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRating(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
            >
              <FaStar className="text-sm" />
              Đánh giá
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
              className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 ${
                isCancelling ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isCancelling ? "Đang hủy..." : "Hủy đơn hàng"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Đóng
            </button>
          </div>
        </div>
        {/* Invoice Content */}
        <div ref={ref} className="p-6 print:p-0">
          {/* Store Header */}
          <div className="text-center mb-6 pb-4 border-b print:border-black">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FaStore className="text-blue-600 text-2xl" />
              <h1 className="text-2xl font-bold text-blue-600">BookVerse</h1>
            </div>
            <div className="text-gray-600 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <FaMapMarkerAlt className="text-sm" />
                <span>123 Đường ABC, Quận XYZ, TP.HCM</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FaPhone className="text-sm" />
                <span>Hotline: 0123-456-789</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Mã đơn:</strong>{" "}
                  {order.orderCode || order.id || "N/A"}
                </div>
                <div className="flex items-center gap-1">
                  <FaCalendar />
                  <strong>Ngày bán:</strong>{" "}
                  {formatDateTime(order.orderDate || new Date())}
                </div>
                <div className="flex items-center gap-1">
                  <FaCreditCard />
                  <strong>Thanh toán:</strong>{" "}
                  {order.paymentMethod === "Cash"
                    ? "Cash on Delivery"
                    : order.paymentMethod === "QR"
                    ? "QR Code"
                    : "Khác"}
                </div>
                <div>
                  <strong>Trạng thái:</strong>{" "}
                  <span
                    className={
                      order.isPaid ? "text-green-600" : "text-orange-600"
                    }
                  >
                    {order.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Thông tin giao hàng</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Khách hàng:</strong>{" "}
                  {localCustomerName || order.customerName || "Khách lẻ"}
                </div>
                {order.phoneNumber && (
                  <div>
                    <strong>Điện thoại:</strong> {order.phoneNumber}
                  </div>
                )}
                {order.address && (
                  <div>
                    <strong>Địa chỉ:</strong> {order.address}
                  </div>
                )}
                {order.note && (
                  <div>
                    <strong>Ghi chú:</strong> {order.note}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Chi tiết đơn hàng</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    STT
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Sản phẩm
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center">
                    SL
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Đơn giá
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Giảm giá
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {(order.details || order.items)?.map((item, index) => {
                  const hasDiscount = item.discountValue > 0;
                  return (
                    <tr key={item.orderDetailCode || index}>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div>
                          <div className="font-medium">
                            {item.productName || `Sản phẩm ${item.productCode}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.productCode}
                          </div>
                          {item.promotionCode && (
                            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mt-1 inline-block">
                              KM: {item.promotionCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {formatCurrency(item.unitPrice)}đ
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {hasDiscount ? (
                          <span className="text-red-600">
                            {item.discountValue < 1
                              ? `${Math.round(item.discountValue * 100)}%`
                              : `${formatCurrency(item.discountValue)}đ`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                        {formatCurrency(
                          item.finalPrice || item.unitPrice * item.quantity
                        )}
                        đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(order.totalAmount)}đ</span>
              </div>

              {order.promotionCustomerValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>
                    Giảm giá KH (
                    {Math.round(order.promotionCustomerValue * 100)}%):
                  </span>
                  <span>
                    -
                    {formatCurrency(
                      order.totalAmount * order.promotionCustomerValue
                    )}
                    đ
                  </span>
                </div>
              )}

              {order.couponDiscountValue > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Giảm giá coupon:</span>
                  <span>
                    -
                    {formatCurrency(
                      order.couponDiscountValue < 1
                        ? (order.totalAmount -
                            order.totalAmount * order.promotionCustomerValue) *
                            order.couponDiscountValue
                        : order.couponDiscountValue
                    )}
                    đ
                  </span>
                </div>
              )}

              {order.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Giảm giá khác:</span>
                  <span>-{formatCurrency(order.discount)}đ</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(order.finalAmount)}đ</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center">
            <div className="text-sm text-gray-600 mb-2">
              Cảm ơn quý khách! Hẹn gặp lại!
            </div>
            <div className="text-xs text-gray-500">
              Hóa đơn được in lúc: {formatDateTime(new Date())}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-96 mx-4">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-red-500 text-2xl mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">
                Xác nhận hủy đơn hàng
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không
              thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                  isCancelling ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isCancelling ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel success modal */}
      {showCancelSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-96 mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">
              Hủy đơn hàng thành công!
            </h3>
            <p className="text-gray-600 mb-6">
              Đơn hàng của bạn đã được hủy thành công. Cảm ơn bạn đã sử dụng
              dịch vụ.
            </p>
            <button
              onClick={() => {
                setShowCancelSuccess(false);
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Đánh giá đơn hàng
              </h3>
              <button
                onClick={() => setShowRating(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Rating type selector */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Chọn loại đánh giá:</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setRatingType("overall")}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    ratingType === "overall"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                  }`}
                >
                  Đánh giá toàn bộ hóa đơn
                </button>
                <button
                  onClick={() => setRatingType("individual")}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    ratingType === "individual"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                  }`}
                >
                  Đánh giá từng sản phẩm
                </button>
              </div>
            </div>

            {/* Overall rating */}
            {ratingType === "overall" && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Đánh giá tổng thể:
                </p>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={overallRating}
                    onRatingChange={setOverallRating}
                  />
                  <span className="text-sm text-gray-600">
                    {overallRating > 0
                      ? `${overallRating}/5 sao`
                      : "Chưa đánh giá"}
                  </span>
                </div>
              </div>
            )}

            {/* Individual product ratings */}
            {ratingType === "individual" && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Đánh giá từng sản phẩm:
                </p>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {(order.details || order.items || []).map((item, index) => (
                    <div
                      key={item.orderDetailCode || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {item.productName || `Sản phẩm ${item.productCode}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.productCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating
                          rating={productRatings[item.productCode] || 0}
                          onRatingChange={(rating) =>
                            handleProductRatingChange(item.productCode, rating)
                          }
                        />
                        <span className="text-sm text-gray-600 min-w-[60px]">
                          {productRatings[item.productCode] > 0
                            ? `${productRatings[item.productCode]}/5`
                            : "0/5"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhận xét (tùy chọn):
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Chia sẻ trải nghiệm của bạn..."
              />
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={
                  ratingType === "overall"
                    ? overallRating === 0
                    : Object.keys(productRatings).length === 0
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          .fixed {
            position: relative;
          }
          .bg-black {
            background: transparent;
          }
          .rounded-lg {
            border-radius: 0;
          }
          .max-w-5xl {
            max-width: 100%;
          }
          .mx-4 {
            margin: 0;
          }
          .max-h-screen {
            max-height: none;
          }
          .overflow-auto {
            overflow: visible;
          }
          .p-4.border-b {
            display: none;
          }
        }
      `}</style>
    </div>
  );
});

InvoiceModal.displayName = "InvoiceModal";

export default InvoiceModal;
