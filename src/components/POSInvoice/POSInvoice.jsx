import React from "react";
import {
  FaPrint,
  FaTimes,
  FaStore,
  FaCalendarAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaQrcode,
  FaCreditCard,
  FaMoneyBillWave,
  FaReceipt,
  FaTag,
  FaGift
} from "react-icons/fa";

const POSInvoice = ({ order, onClose, onPrint }) => {
  console.log(order);
  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("vi-VN");
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("vi-VN"),
      time: date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const { date, time } = formatDateTime(
    order.orderDate || order.orderDateString || new Date()
  );

  // Normalize items (server may return `details` or `items`)
  const items = order.items || order.details || [];

  // Calculate breakdown using server-provided totals when available
  const originalSubtotal =
    items.reduce((sum, item) => {
      const unit = Number(item.originalPrice ?? item.unitPrice ?? 0);
      const qty = Number(item.quantity ?? 0);
      return sum + unit * qty;
    }, 0) || 0;

  const serverSubtotal = Number(order.totalAmount ?? order.subtotal ?? 0);
  const productPromotionDiscount = Math.max(
    0,
    originalSubtotal - serverSubtotal
  );
  const memberDiscountAmount = Number(order.memberDiscountAmount ?? 0);
  const invoiceDiscount = Number(order.discount ?? 0);

  // Normalize payment method display
  const paymentMethodRaw = (order.paymentMethod || "").toString();
  const pm = paymentMethodRaw.trim().toLowerCase();
  const getPaymentLabel = () => {
    if (pm === "cash" || pm === "tiền mặt" || pm === "money") return "Tiền mặt";
    if (pm === "qr" || pm === "sepay" || pm.includes("qr")) return "MBBank";
    if (pm === "card" || pm === "credit" || pm.includes("card")) return "Thẻ";
    return paymentMethodRaw
      ? paymentMethodRaw.charAt(0).toUpperCase() + paymentMethodRaw.slice(1)
      : "";
  };

  const isCashMethod = () => pm === "cash" || pm === "tiền mặt";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* Print styles: when printing, hide all UI except the invoice content */}
      <style>{`@media print { body * { visibility: hidden; } #invoice-content, #invoice-content * { visibility: visible; } #invoice-content { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header with actions */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaReceipt />
            Hóa đơn bán hàng
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 print:p-4" id="invoice-content">
            {/* Store Header */}
            <div className="text-center border-b pb-6 mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-full">
                  <FaStore className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    BOOK STORE
                  </h1>
                  <p className="text-sm text-gray-600">
                    Cửa hàng sách trực tuyến
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>📍 123 Đường ABC, Quận 1, TP.HCM</p>
                <p>📞 Hotline: 1900-xxxx | Email: info@bookstore.com</p>
                <p>🌐 Website: www.bookstore.com</p>
              </div>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FaReceipt className="text-blue-600" />
                  Thông tin đơn hàng
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mã hóa đơn:</span>
                    <span className="font-mono font-medium">
                      {order.orderCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày:</span>
                    <span>{date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giờ:</span>
                    <span>{time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thu ngân:</span>
                    <span>Admin User</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FaUser className="text-green-600" />
                  Thông tin khách hàng
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <FaUser className="text-gray-400 mt-0.5 text-xs" />
                    <div>
                      <span className="text-gray-600">Tên:</span>
                      <span className="ml-2 font-medium">
                        {order.customerName}
                      </span>
                    </div>
                  </div>
                  {order.customerPhone && (
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-gray-400 text-xs" />
                      <span className="text-gray-600">SĐT:</span>
                      <span className="ml-2">{order.customerPhone}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-gray-400 text-xs" />
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2">{order.customerEmail}</span>
                    </div>
                  )}
                  {order.customerAddress && (
                    <div className="flex items-start gap-2">
                      <FaMapMarkerAlt className="text-gray-400 mt-0.5 text-xs" />
                      <div>
                        <span className="text-gray-600">Địa chỉ:</span>
                        <span className="ml-2">{order.customerAddress}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FaTag className="text-purple-600" />
                Chi tiết sản phẩm
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-3 font-medium text-gray-700">
                        STT
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Sản phẩm
                      </th>
                      <th className="text-center p-3 font-medium text-gray-700">
                        SL
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700">
                        Đơn giá
                      </th>
                      <th className="text-right p-3 font-medium text-gray-700">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.productCode}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 text-center">{index + 1}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mã: {item.productCode}
                            </div>
                            {(item.originalPrice &&
                              item.originalPrice > item.unitPrice) ||
                            (item.discountValue &&
                              Number(item.discountValue) > 0) ? (
                              <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                                <FaGift size={10} />
                                Khuyến mãi sản phẩm
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3 text-center font-medium">
                          {item.quantity}
                        </td>
                        <td className="p-3 text-right">
                          {item.originalPrice &&
                          item.originalPrice > (item.unitPrice ?? 0) ? (
                            <div>
                              <div className="line-through text-gray-400 text-xs">
                                {formatCurrency(item.originalPrice)}đ
                              </div>
                              <div className="font-medium text-red-600">
                                {formatCurrency(
                                  item.unitPrice ?? item.finalPrice ?? 0
                                )}
                                đ
                              </div>
                            </div>
                          ) : (
                            <div className="font-medium">
                              {formatCurrency(
                                item.unitPrice ?? item.finalPrice ?? 0
                              )}
                              đ
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(
                            item.finalPrice ??
                              item.totalAmount ??
                              (item.unitPrice ?? 0) * (item.quantity ?? 1)
                          )}
                          đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary (single column) */}
            <div className="border-t pt-6 space-y-4">
              {/* Highlighted payment method */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-full">
                    {isCashMethod() ? (
                      <FaMoneyBillWave className="text-green-600 text-xl" />
                    ) : pm.includes("qr") ? (
                      <FaQrcode className="text-blue-600 text-xl" />
                    ) : (
                      <FaCreditCard className="text-blue-600 text-xl" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">
                      Phương thức thanh toán
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                      {getPaymentLabel()}
                    </div>
                  </div>
                </div>
                {isCashMethod() ? (
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Khách đưa</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(order.receivedAmount)}đ
                    </div>
                    <div className="text-sm text-orange-600">
                      Tiền thừa: {formatCurrency(order.change)}đ
                    </div>
                  </div>
                ) : pm.includes("qr") ? (
                  <div className="text-right text-sm text-gray-600">
                    Chuyển khoản qua QR MBBANK
                    {order.orderCode && (
                      <div className="text-xs text-gray-500">
                        Mã đơn: {order.orderCode}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-right text-sm text-gray-600">
                    Thanh toán bằng thẻ
                  </div>
                )}
              </div>

              {/* Summary breakdown (use server fields if available) */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Tổng kết</h3>
                <div className="space-y-2 text-sm">
                  {originalSubtotal > (order.totalAmount ?? serverSubtotal) && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tạm tính (gốc):</span>
                        <span>{formatCurrency(originalSubtotal)}đ</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Giảm giá sản phẩm:</span>
                        <span>
                          -{formatCurrency(productPromotionDiscount)}đ
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span>
                      {formatCurrency(order.totalAmount ?? serverSubtotal)}đ
                    </span>
                  </div>

                  {Number(order.promotionCustomerValue ?? 0) > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>
                        Giảm giá KH (
                        {Math.round((order.promotionCustomerValue || 0) * 100)}
                        %):
                      </span>
                      <span>
                        -
                        {formatCurrency(
                          (order.totalAmount ?? serverSubtotal) *
                            (order.promotionCustomerValue || 0)
                        )}
                        đ
                      </span>
                    </div>
                  )}

                  {Number(order.couponDiscountValue ?? 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Giảm giá coupon:</span>
                      <span>-{formatCurrency(order.couponDiscountValue)}đ</span>
                    </div>
                  )}

                  {invoiceDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Giảm giá khác:</span>
                      <span>-{formatCurrency(invoiceDiscount)}đ</span>
                    </div>
                  )}

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng cộng:</span>
                      <span className="text-green-600">
                        {formatCurrency(
                          order.finalAmount ??
                            order.total ??
                            order.totalAmount ??
                            0
                        )}
                        đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 mt-6 text-center text-sm text-gray-600">
              <p className="mb-2">🎉 Cảm ơn quý khách đã mua hàng! 🎉</p>
              <p className="mb-2">
                Hotline hỗ trợ: <span className="font-medium">1900-xxxx</span>
              </p>
              <p className="text-xs">
                Hóa đơn được in lúc: {new Date().toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSInvoice;
