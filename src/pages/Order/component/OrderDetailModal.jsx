import React, { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { productService } from "~/apis/productService";
import { buildImageUrl } from "~/lib/utils";

const statusMetaDefaults = {
  pending: { label: "Chờ xử lý", className: "bg-yellow-100 text-yellow-700" },
  confirmed: {
    label: "Đã xác nhận - Đang giao",
    className: "bg-blue-100 text-blue-700"
  },
  completed: { label: "Hoàn thành", className: "bg-green-100 text-green-700" },
  cancel: { label: "Đã hủy", className: "bg-red-100 text-red-700" }
};

export default function OrderDetailModal({ isOpen, onClose, order }) {
  const dialogRef = useRef(null);
  const { formatVND } = useStransferToVND();
  const [productMap, setProductMap] = useState({});
  console.log(order);
  // focus modal khi mở
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  // derive status label + classes from order shape (supports boolean status/isPaid)
  const sMeta = useMemo(() => {
    if (!order)
      return {
        label: "Không xác định",
        className: "bg-gray-100 text-gray-700"
      };
    if (order.status === false && !order.isPaid)
      return statusMetaDefaults.pending;
    if (
      order.status === true &&
      !order.isPaid &&
      order.paymentMethod === "Cash"
    )
      return statusMetaDefaults.confirmed;
    if (order.status === true && order.isPaid)
      return statusMetaDefaults.completed;
    // fallback to named keys if provided
    if (typeof order.status === "string" && statusMetaDefaults[order.status])
      return statusMetaDefaults[order.status];
    return {
      label: order.status ?? "Không xác định",
      className: "bg-gray-100 text-gray-700"
    };
  }, [order]);

  // memoize product rows and support both `details` and `listProduct` shapes
  const productRows = useMemo(() => {
    const products = order?.details ?? order?.listProduct ?? [];
    return (products || []).map((p, idx) => {
      const code = p.productCode ?? p.product_code ?? p.code ?? "--";
      const productInfo = productMap[code];
      const name =
        p.productName ??
        p.name ??
        p.title ??
        productInfo?.productName ??
        productInfo?.name ??
        "Sản phẩm";
      const qty = p.quantity ?? p.qty ?? 0;
      const unitPrice =
        p.unitPrice ??
        p.unit_price ??
        p.price ??
        p.priceSale ??
        productInfo?.price ??
        productInfo?.unitPrice ??
        0;
      // compute totals and discount per item
      const total = Number(p.totalAmount) || unitPrice * qty;
      const finalPrice = Number(p.finalPrice) || total;
      const discountAmt = Math.max(0, total - finalPrice);
      const subtotal = finalPrice;
      const image =
        productInfo?.image ?? productInfo?.imageUrl ?? productInfo?.thumbnail;
      const imageUrl = image ? buildImageUrl(image) : null;

      return (
        <tr
          key={p.orderDetailCode || code || idx}
          className="hover:bg-gray-50 transition"
        >
          <td className="px-4 py-2">{code}</td>
          <td className="px-4 py-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-12 h-12 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded" />
            )}
          </td>
          <td className="px-4 py-2">
            <span>{name}</span>
          </td>
          <td className="px-4 py-2 text-center">{qty}</td>
          <td className="px-4 py-2 text-right">{formatVND(unitPrice)}</td>
          <td className="px-4 py-2 text-right">
            {discountAmt > 0 ? (
              <div>
                <span className="font-medium text-red-600">
                  -{formatVND(discountAmt)}
                </span>
                {Number(p.discountValue) && Number(p.discountValue) < 1 ? (
                  <span className="text-xs text-gray-500 ml-2">
                    ({Math.round(Number(p.discountValue) * 100)}%)
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
          <td className="px-4 py-2 text-right">{formatVND(subtotal)}</td>
        </tr>
      );
    });
  }, [order, productMap]);

  // Fetch product details for items that only have productCode
  useEffect(() => {
    if (!isOpen || !order) return;

    const products = order?.details ?? order?.listProduct ?? [];
    const codes = Array.from(
      new Set(
        (products || [])
          .map((p) => p.productCode ?? p.product_code ?? p.code)
          .filter(Boolean)
      )
    ).filter((code) => !productMap[code]);

    if (codes.length === 0) return;

    Promise.all(
      codes.map((code) =>
        productService
          .getById(code)
          .then((res) => {
            // Handle both raw axios result and inner data
            const product = res?.data?.data ?? res?.data ?? res;
            return { code, product };
          })
          .catch(() => ({ code, product: null }))
      )
    ).then((results) => {
      setProductMap((prev) => {
        const next = { ...prev };
        results.forEach(({ code, product }) => {
          if (product) next[code] = product;
        });
        return next;
      });
    });
  }, [isOpen, order, productMap]);

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            className="relative z-10 w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold truncate">
                Hóa đơn: #{order.orderCode || order._id}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${sMeta.className}`}
              >
                {sMeta.label}
              </span>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p>
                  <strong>Khách hàng:</strong>{" "}
                  {(() => {
                    try {
                      const stored = JSON.parse(
                        localStorage.getItem("userInfo") || "{}"
                      );
                      return (
                        stored?.customerName ??
                        order.customerName ??
                        `${order.firstName ?? ""} ${order.lastName ?? ""}`
                      );
                    } catch (e) {
                      return (
                        order.customerName ??
                        `${order.firstName ?? ""} ${order.lastName ?? ""}`
                      );
                    }
                  })()}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {(() => {
                    try {
                      const stored = JSON.parse(
                        localStorage.getItem("userInfo") || "{}"
                      );
                      return (
                        stored?.email ??
                        order.email ??
                        order.customerEmail ??
                        "--"
                      );
                    } catch (e) {
                      return order.email ?? order.customerEmail ?? "--";
                    }
                  })()}
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  {order.phoneNumber ?? order.phone ?? "--"}
                </p>
                <p className="col-span-2">
                  <strong>Địa chỉ:</strong>{" "}
                  {order.address ??
                    `${order.streetAddress ?? ""} ${order.city ?? ""} ${
                      order.country ?? ""
                    }`}
                </p>
                <p>
                  <strong>Phương thức thanh toán:</strong>{" "}
                  {order.paymentMethod ?? "--"}
                </p>
                <p>
                  <strong>Trạng thái thanh toán:</strong>{" "}
                  {(() => {
                    const paid = Boolean(order.isPaid ?? order.isPayment);
                    return (
                      <span
                        className={paid ? "text-green-500" : "text-red-500"}
                      >
                        {paid ? "Đã thanh toán" : "Chưa thanh toán"}
                      </span>
                    );
                  })()}
                </p>
                <p>
                  <strong>Coupon:</strong>{" "}
                  {order.couponCode ?? order.coupon ?? "--"}
                </p>
                <p>
                  <strong>Ghi chú:</strong> {order.note || "--"}
                </p>
              </div>

              {/* Order Info */}
              <div className="text-sm">
                <p>
                  <strong>Ngày tạo:</strong>{" "}
                  {new Date(
                    order.orderDate ??
                      order.createAt ??
                      order.createdAt ??
                      Date.now()
                  ).toLocaleString("vi-VN")}
                </p>
                <p>
                  <strong>Tổng tiền:</strong>{" "}
                  <span className="text-red-500 font-semibold">
                    {formatVND(
                      order.finalAmount ??
                        order.totalPriceOrder ??
                        order.totalAmount ??
                        0
                    )}
                  </span>
                </p>
              </div>

              {/* Product List */}
              <div>
                <h3 className="font-semibold mb-2">Products</h3>
                <div className="overflow-hidden rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Mã SP</th>
                        <th className="px-4 py-2 text-left">Hình ảnh</th>
                        <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                        <th className="px-4 py-2 text-center">SL</th>
                        <th className="px-4 py-2 text-right">Đơn giá</th>
                        <th className="px-4 py-2 text-right">Giảm giá</th>
                        <th className="px-4 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">{productRows}</tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
