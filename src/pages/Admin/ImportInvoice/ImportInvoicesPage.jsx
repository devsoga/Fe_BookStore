import React, { useState, useEffect, useMemo } from "react";
import {
  FaEdit,
  FaPlus,
  FaTimes,
  FaStickyNote,
  FaTimesCircle,
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
  FaUndo,
  FaFilter,
  FaSort,
  FaDownload,
  FaClock,
  FaTruck,
  FaBoxes,
  FaCalendarAlt,
  FaDollarSign,
  FaCog,
  FaLayerGroup,
  FaClipboardList,
  FaFileInvoice
} from "react-icons/fa";

import { importInvoiceService } from "~/apis/importInvoiceService";
import { supplierService } from "~/apis/supplierService";
import { productService } from "~/apis/productService";
import { buildImageUrl } from "~/lib/utils";
import { useNavigate } from "react-router-dom";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Pagination from "~/components/Admin/Pagination";

const ImportInvoicesPage = () => {
  const [importInvoices, setImportInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [autoInvoiceCode, setAutoInvoiceCode] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "invoiceCode",
    direction: "asc"
  });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [invoiceItems, setInvoiceItems] = useState([
    { importInvoiceDetailCode: "", productCode: "", quantity: 1, unitPrice: 0 }
  ]);

  // Display mode state
  const [displayMode, setDisplayMode] = useState("supplier-first"); // "supplier-first" or "product-first"
  const [selectedSupplierCode, setSelectedSupplierCode] = useState("");
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  // Product picker helpers
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [pendingProduct, setPendingProduct] = useState(null); // product selected from cards, waiting for supplier/qty
  // Supplier picker modal for a selected product
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalProduct, setSupplierModalProduct] = useState(null);
  const [supplierModalQty, setSupplierModalQty] = useState(1);
  const [supplierModalPrice, setSupplierModalPrice] = useState(0);
  // Selected products for the new 3-panel modal (may include items from multiple suppliers)
  const [selectedProducts, setSelectedProducts] = useState([]);
  // supplier code while editing an existing invoice
  const [editingSupplierCode, setEditingSupplierCode] = useState("");
  // Notes and date for invoices created from the modal
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  // Recreate-from-rejection state
  const [showRecreateForm, setShowRecreateForm] = useState(false);
  const [recreateItems, setRecreateItems] = useState([]);
  const [recreateNotes, setRecreateNotes] = useState("");
  const [recreateDate, setRecreateDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [recreateLoading, setRecreateLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(""); // Lý do từ chối để hiển thị trong modal
  const [isRecreatingFromRejection, setIsRecreatingFromRejection] =
    useState(false);

  const updateRecreateItem = (index, field, value) => {
    setRecreateItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateFromRejection = async () => {
    if (!viewingInvoice) return;
    setRecreateLoading(true);
    try {
      const importInvoiceCode = `PN_${Date.now()}`;
      const supplierCode =
        viewingInvoice.supplierCode || viewingInvoice._raw?.supplierCode;
      const details = (recreateItems || []).map((it, idx) => ({
        importInvoiceDetailCode: `CTPN_${Date.now()}_${idx}`,
        productCode: it.productCode,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0
      }));

      const payload = {
        importInvoiceCode,
        supplierCode,
        importDate: recreateDate,
        notes: recreateNotes,
        details,
        totalAmount: details.reduce(
          (s, d) => s + (d.quantity || 0) * (d.unitPrice || 0),
          0
        )
      };

      await importInvoiceService.createImportInvoice(payload);
      showSuccessModal("Tạo thành công", "Hóa đơn mới đã được tạo thành công.");
      setShowRecreateForm(false);
      setIsViewModalOpen(false);
      setViewingInvoice(null);
      await loadImportInvoices();
    } catch (err) {
      console.error(err);
      showErrorModal(
        "Tạo thất bại",
        "Không thể tạo hóa đơn mới. Vui lòng thử lại."
      );
    } finally {
      setRecreateLoading(false);
    }
  };

  // helper to convert API datetime/string to yyyy-mm-dd for <input type="date">
  const formatToDateInput = (value) => {
    if (!value) return "";
    // if value contains T (ISO), take date part, otherwise try to parse simple formats
    try {
      if (typeof value === "string" && value.includes("T"))
        return value.split("T")[0];
      // if it's a number (timestamp)
      if (typeof value === "number") {
        const d = new Date(value);
        return d.toISOString().split("T")[0];
      }
      // fallback: attempt Date parse
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      return "";
    } catch (err) {
      return "";
    }
  };

  // Create one invoice per supplier from the modal selection
  const handleSaveInvoiceFromModal = async ({
    groupedBySupplier,
    invoiceDate,
    invoiceNotes,
    selectedProducts
  }) => {
    if (!groupedBySupplier || Object.keys(groupedBySupplier).length === 0) {
      showErrorModal("Lỗi", "Không có sản phẩm để tạo hóa đơn.");
      return;
    }

    setLoading(true);
    try {
      const results = [];
      for (const supplierCode of Object.keys(groupedBySupplier)) {
        const items = groupedBySupplier[supplierCode];
        if (!items || items.length === 0) continue;

        const details = items.map((p, idx) => ({
          importInvoiceDetailCode:
            p.importInvoiceDetailCode || `CTPN_${Date.now()}_${idx}`,
          productCode: p.productCode,
          quantity: Number(p.quantity) || 0,
          importPrice: Number(p.unitPrice) || 0,
          totalAmount: (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)
        }));

        const totalAmount = details.reduce(
          (s, d) => s + (d.totalAmount || 0),
          0
        );

        const invoiceData = {
          importInvoiceCode: `PN_${new Date()
            .toISOString()
            .replace(/[^0-9]/g, "")}_${supplierCode}`,
          supplierCode,
          created_date: invoiceDate || new Date().toISOString().split("T")[0],
          description: invoiceNotes || "",
          details,
          totalAmount,
          discount: 0,
          reason: null,
          status: STATUS.PENDING,
          employeeCode: editingInvoice?.employeeCode || "NV_KETOAN"
        };

        // call API
        // await sequentially to keep load limited; could be parallel if desired
        const res = await importInvoiceService.createImportInvoice(invoiceData);
        results.push(res);
      }

      await loadImportInvoices();
      setIsModalOpen(false);
      setSelectedProducts([]);
      showSuccessModal(
        "Tạo thành công",
        `Đã tạo ${results.length} hóa đơn nhập.`
      );
    } catch (err) {
      console.error("Error creating invoices from modal:", err);
      showErrorModal(
        "Lỗi",
        "Không thể tạo hóa đơn từ lựa chọn. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();

  // derive categories from products for the category filter
  const productCategoryOptions = useMemo(() => {
    const m = {};
    (products || []).forEach((p) => {
      const code =
        p.categoryCode ||
        p.category ||
        p.productType ||
        p.type ||
        p.categoryName;
      const name = p.categoryName || p.category || code;
      if (code) m[code] = name;
    });
    return Object.keys(m).map((k) => ({ code: k, name: m[k] }));
  }, [products]);

  // displayed products for the picker (search + category)
  const displayedProducts = useMemo(() => {
    let list = products || [];
    if (productCategoryFilter && productCategoryFilter !== "all") {
      list = list.filter((p) => {
        const code =
          p.categoryCode ||
          p.category ||
          p.productType ||
          p.type ||
          p.categoryName;
        return code === productCategoryFilter;
      });
    }
    const q = (productSearch || "").toString().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const name = (p.productName || "").toString().toLowerCase();
      const code = (p.productCode || "").toString().toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [products, productSearch, productCategoryFilter]);

  // products displayed when a supplier is selected (apply same search/category filters)
  const supplierDisplayedProducts = useMemo(() => {
    let list = filteredProducts || [];
    if (productCategoryFilter && productCategoryFilter !== "all") {
      list = list.filter((p) => {
        const code =
          p.categoryCode ||
          p.category ||
          p.productType ||
          p.type ||
          p.categoryName;
        return code === productCategoryFilter;
      });
    }
    const q = (productSearch || "").toString().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const name = (p.productName || "").toString().toLowerCase();
      const code = (p.productCode || "").toString().toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [filteredProducts, productSearch, productCategoryFilter]);

  // Add product for a specific supplier (reads qty/price inputs)
  const addProductForSupplier = (productCode, supplierCode) => {
    // fallback: use global inputs if present, otherwise defaults
    const qtyInput = document.getElementById("quantity-input");
    const priceInput = document.getElementById("price-input");
    const quantity = supplierModalQty || parseInt(qtyInput?.value) || 1;
    // Determine unitPrice: prefer explicit supplierModalPrice (>0), else DOM price input, else supplier's listed importPrice
    let unitPrice =
      supplierModalPrice && supplierModalPrice > 0
        ? supplierModalPrice
        : parseFloat(priceInput?.value) || 0;
    if ((!unitPrice || unitPrice === 0) && suppliers && suppliers.length) {
      const supplier = suppliers.find((s) => s.supplierCode === supplierCode);
      const pp = (supplier?.productProvide || []).find(
        (p) => p.productCode === productCode
      );
      if (pp && (pp.importPrice || pp.price)) {
        unitPrice = pp.importPrice || pp.price;
      }
    }

    if (!productCode || !supplierCode) {
      showErrorModal(
        "Thiếu thông tin",
        "Vui lòng chọn sản phẩm và nhà cung cấp."
      );
      return;
    }
    if (quantity <= 0) {
      showErrorModal("Số lượng không hợp lệ", "Số lượng phải lớn hơn 0.");
      return;
    }

    const newProduct = {
      id: `${productCode}_${supplierCode}_${Date.now()}`,
      productCode,
      supplierCode,
      quantity,
      unitPrice
    };

    setSelectedProducts((prev) => [...prev, newProduct]);

    if (qtyInput) qtyInput.value = "";
    if (priceInput) priceInput.value = "";
    setPendingProduct(null);
    setSelectedProductCode("");
    // close supplier modal if open
    setSupplierModalOpen(false);
    setSupplierModalProduct(null);
    setSupplierModalQty(1);
    setSupplierModalPrice(0);
  };

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

  const showDeleteConfirm = (invoiceCode, invoiceNote) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      title: "Xóa hóa đơn nhập hàng",
      message: `Bạn có chắc muốn xóa hóa đơn "${invoiceCode}"?`,
      cancelText: "Hủy bỏ",
      confirmText: "Xóa",
      onCancel: () => setConfirmModal({ isOpen: false }),
      onConfirm: async () => {
        setLoading(true);
        try {
          await importInvoiceService.deleteImportInvoice(invoiceCode);
          await loadImportInvoices();
          showSuccessModal(
            "Xóa thành công",
            `Hóa đơn "${invoiceCode}" đã được xóa.`
          );
        } catch (err) {
          console.error(err);
          showErrorModal(
            "Xóa thất bại",
            `Không thể xóa hóa đơn "${invoiceCode}". Vui lòng thử lại sau.`
          );
        } finally {
          setLoading(false);
          setConfirmModal({ isOpen: false });
        }
      }
    });
  };

  const showRestoreConfirm = (invoice) => {
    const id = invoice.importInvoiceCode || invoice.invoiceCode;
    setConfirmModal({
      isOpen: true,
      type: "info",
      title: "Khôi phục hóa đơn",
      message: `Bạn có chắc muốn khôi phục hóa đơn "${id}" về trạng thái chờ duyệt?`,
      cancelText: "Hủy bỏ",
      confirmText: "Khôi phục",
      onCancel: () => setConfirmModal({ isOpen: false }),
      onConfirm: async () => {
        setLoading(true);
        try {
          // update status to PENDING
          await importInvoiceService.updateImportInvoice(id, {
            status: STATUS.PENDING
          });
          await loadImportInvoices();
          showSuccessModal(
            "Khôi phục thành công",
            `Hóa đơn "${id}" đã được khôi phục về trạng thái chờ duyệt.`
          );
        } catch (err) {
          console.error(err);
          showErrorModal(
            "Khôi phục thất bại",
            `Không thể khôi phục hóa đơn "${id}". Vui lòng thử lại sau.`
          );
        } finally {
          setLoading(false);
          setConfirmModal({ isOpen: false });
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
      // normalize API shapes coming from backend
      invoicesData = invoicesData.map((inv) => ({
        // keep original backend fields
        ...inv,
        // friendly aliases used by the UI
        invoiceCode: inv.importInvoiceCode || inv.invoiceCode || "",
        notes: inv.description || inv.notes || "",
        // map createdDate/created_date -> importDate for UI (user: 'Ngày nhập là createdDate')
        importDate: formatToDateInput(
          inv.createdDate ||
            inv.created_date ||
            inv.importDate ||
            inv.importedDate ||
            ""
        ),
        // map details -> items for UI editing
        items: (inv.details || inv.items || []).map((d) => ({
          id: d.id,
          detailCode: d.importInvoiceDetailCode || d.detailCode,
          productCode: d.productCode,
          quantity: d.quantity,
          unitPrice: d.importPrice || d.unitPrice || 0,
          totalAmount: d.totalAmount
        })),
        // normalize status -> string constants (keep backward compatibility)
        status: (() => {
          if (typeof inv.status === "string") {
            const s = inv.status.trim().toUpperCase();
            if (s === "1" || s === "TRUE") return STATUS.APPROVED;
            if (s === "0" || s === "FALSE") return STATUS.PENDING;
            if (
              s === STATUS.PENDING ||
              s === STATUS.APPROVED ||
              s === STATUS.REJECTED ||
              s === STATUS.DELETED
            )
              return s;
            return s; // unknown raw string
          }
          if (typeof inv.status === "boolean")
            return inv.status ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof inv.status === "number")
            return inv.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof inv.approved === "boolean")
            return inv.approved ? STATUS.APPROVED : STATUS.PENDING;
          return STATUS.PENDING;
        })(),
        approved: (function (st) {
          const s = (() => {
            if (typeof inv.status === "string")
              return inv.status.trim().toUpperCase();
            if (typeof inv.status === "boolean")
              return inv.status ? STATUS.APPROVED : STATUS.PENDING;
            if (typeof inv.status === "number")
              return inv.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
            if (typeof inv.approved === "boolean")
              return inv.approved ? STATUS.APPROVED : STATUS.PENDING;
            return STATUS.PENDING;
          })();
          return s === STATUS.APPROVED;
        })()
      }));
      setImportInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      console.error("Error loading import invoices:", error);
      showErrorModal("Lỗi", "Không thể tải danh sách hóa đơn nhập hàng");
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers and products for dropdowns
  const loadSuppliers = async () => {
    try {
      const response = await supplierService.getAllSuppliers();
      let suppliersData = response?.data?.data || response?.data || [];
      // normalize status to boolean so UI can reliably filter active suppliers
      suppliersData = suppliersData.map((s) => ({
        ...s,
        status: (() => {
          if (typeof s.status === "boolean") return s.status;
          // check common active indicators
          const raw = (s.status ?? s.active ?? "")
            .toString()
            .trim()
            .toLowerCase();
          return raw === "true" || raw === "1" || raw === "active";
        })()
      }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.getAllProduct();
      setProducts(response?.data?.data || response?.data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Load products for selected supplier
  const loadProductsForSupplier = async (supplierCode) => {
    if (!supplierCode) {
      setFilteredProducts([]);
      return;
    }

    try {
      const supplier = suppliers.find((s) => s.supplierCode === supplierCode);
      if (supplier && supplier.productProvide) {
        // Get product codes from supplier's productProvide
        const productCodes = supplier.productProvide.map(
          (pp) => pp.productCode
        );
        // Filter products that this supplier provides
        const supplierProducts = products.filter((p) =>
          productCodes.includes(p.productCode || p.code || p.id)
        );
        setFilteredProducts(supplierProducts);
      } else {
        // Fallback: show all products if no productProvide data
        setFilteredProducts(products);
      }
    } catch (error) {
      console.error("Error loading products for supplier:", error);
      setFilteredProducts([]);
    }
  };

  // Load suppliers for selected product
  const loadSuppliersForProduct = async (productCode) => {
    if (!productCode) {
      setFilteredSuppliers([]);
      return;
    }

    try {
      // Find suppliers that provide this product
      const productSuppliers = suppliers.filter((supplier) => {
        if (supplier.productProvide && Array.isArray(supplier.productProvide)) {
          return supplier.productProvide.some(
            (pp) => pp.productCode === productCode
          );
        }
        return false;
      });
      setFilteredSuppliers(productSuppliers);
    } catch (error) {
      console.error("Error loading suppliers for product:", error);
      setFilteredSuppliers([]);
    }
  };

  // Search and filter
  useEffect(() => {
    let filtered = importInvoices;

    if (searchTerm) {
      filtered = filtered.filter((invoice) => {
        const term = searchTerm.toLowerCase();
        return (
          (invoice.invoiceCode || invoice.importInvoiceCode || "")
            .toString()
            .toLowerCase()
            .includes(term) ||
          (invoice.supplierCode || "")
            .toString()
            .toLowerCase()
            .includes(term) ||
          (invoice.notes || invoice.description || "")
            .toString()
            .toLowerCase()
            .includes(term)
        );
      });
    }

    // Filter by status (all / pending / approved / rejected / deleted)
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
  const handleEdit = async (invoice) => {
    // fetch full invoice details by importInvoiceCode before editing
    const id = invoice.importInvoiceCode || invoice.invoiceCode;
    if (!id) {
      showErrorModal("Lỗi", "Không tìm thấy mã hóa đơn để chỉnh sửa.");
      return;
    }
    setLoading(true);
    try {
      const res = await importInvoiceService.getById(id);
      const data = res?.data?.data || res?.data || res;
      const inv = {
        ...data,
        // Normalize supplier info from various API shapes
        supplierCode:
          data.supplierCode ||
          data.supplier?.supplierCode ||
          data.supplier?.code ||
          data.supplier_code ||
          data.supplierId ||
          data.supplier_id ||
          "",
        supplierName:
          data.supplierName ||
          data.supplier?.supplierName ||
          data.supplier?.name ||
          data.supplier_name ||
          "",
        invoiceCode: data.importInvoiceCode || data.invoiceCode || "",
        notes: data.description || data.notes || "",
        importDate: formatToDateInput(
          data.createdDate || data.created_date || data.importDate || ""
        ),
        items: (data.details || data.items || []).map((d) => ({
          id: d.id,
          detailCode: d.importInvoiceDetailCode || d.detailCode,
          productCode: d.productCode,
          quantity: d.quantity,
          unitPrice: d.importPrice || d.unitPrice || 0,
          totalAmount: d.totalAmount
        })),
        status: (() => {
          if (typeof data.status === "string") {
            const s = data.status.trim().toUpperCase();
            if (s === "1" || s === "TRUE") return STATUS.APPROVED;
            if (s === "0" || s === "FALSE") return STATUS.PENDING;
            if (
              s === STATUS.PENDING ||
              s === STATUS.APPROVED ||
              s === STATUS.REJECTED ||
              s === STATUS.DELETED
            )
              return s;
            return s;
          }
          if (typeof data.status === "boolean")
            return data.status ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof data.status === "number")
            return data.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof data.approved === "boolean")
            return data.approved ? STATUS.APPROVED : STATUS.PENDING;
          return STATUS.PENDING;
        })()
      };

      setEditingInvoice(inv);
      // set editing supplier code so select becomes controlled
      setEditingSupplierCode(inv.supplierCode || "");
      setInvoiceItems(
        inv.items && inv.items.length > 0
          ? inv.items.map((it) => ({
              productCode: it.productCode,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              // preserve original detail id/code so update payload can include it
              importInvoiceDetailCode:
                it.detailCode || it.importInvoiceDetailCode || it.id || null
            }))
          : [
              {
                importInvoiceDetailCode: "",
                productCode: "",
                quantity: 1,
                unitPrice: 0
              }
            ]
      );
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error loading invoice for edit:", err);
      showErrorModal("Lỗi", "Không thể tải chi tiết hóa đơn để chỉnh sửa.");
    } finally {
      setLoading(false);
    }
  };

  const removeInvoiceItem = (index) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  // When changing supplier while editing an invoice, update unitPrice for items if supplier provides prices
  const updatePricesForEditingSupplier = (supplierCode) => {
    if (!supplierCode) return;
    const supplier = suppliers.find((s) => s.supplierCode === supplierCode);
    if (!supplier) return;

    setInvoiceItems((prev) =>
      prev.map((it) => {
        const pp = (supplier.productProvide || []).find(
          (p) => p.productCode === it.productCode
        );
        if (pp && (pp.importPrice || pp.price)) {
          return { ...it, unitPrice: pp.importPrice || pp.price };
        }
        return it;
      })
    );
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;
    setInvoiceItems(updated);
  };

  // Add a new empty item row (only used when creating a new invoice)
  const addInvoiceItem = () => {
    // Prevent adding new rows when using product-first mode
    if (displayMode === "product-first") {
      showErrorModal(
        "Không thể thêm sản phẩm",
        "Khi đã chọn sản phẩm trước, không thể thêm dòng sản phẩm mới."
      );
      return;
    }
    // generate detail code if creating new invoice
    const genDetailCode = `CTPN_${Date.now()}`;
    setInvoiceItems([
      ...invoiceItems,
      {
        importInvoiceDetailCode: genDetailCode,
        productCode: "",
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  // Calculate total amount
  const calculateTotal = () => {
    return invoiceItems.reduce((total, item) => {
      return (
        total +
        (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      );
    }, 0);
  };

  // Handle form submission
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    // Build payload matching backend shape
    const formStatus = formData.get("status");
    const normalizedStatus = formStatus
      ? formStatus.toString().trim().toUpperCase()
      : editingInvoice?.status || STATUS.PENDING;

    const invoiceData = {
      importInvoiceCode: formData.get("invoiceCode"),
      supplierCode: formData.get("supplierCode"),
      // backend expects created_date as the invoice date
      created_date: formData.get("importDate") || undefined,
      description: formData.get("notes"),
      details: invoiceItems
        .filter((item) => item.productCode && Number(item.quantity) > 0)
        .map((item) => ({
          importInvoiceDetailCode:
            item.importInvoiceDetailCode || item.detailCode || item.id || null,
          productCode: item.productCode,
          quantity: Number(item.quantity),
          importPrice: Number(item.unitPrice) || 0,
          totalAmount:
            (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
        })),
      totalAmount: calculateTotal(),
      discount: Number(formData.get("discount") || 0),
      reason: formData.get("reason") || null,
      // status: send canonical string (APPROVED/PENDING/REJECTED/DELETED)
      status: normalizedStatus,
      // default employee code when editing/creating if not provided by UI
      employeeCode: editingInvoice?.employeeCode || "NV_KETOAN"
    };

    // Validate items
    if (invoiceData.details.length === 0) {
      showErrorModal("Lỗi", "Phải có ít nhất một sản phẩm trong hóa đơn");
      setLoading(false);
      return;
    }

    try {
      if (editingInvoice) {
        // prefer backend key if present
        const id =
          editingInvoice.importInvoiceCode || editingInvoice.invoiceCode;
        await importInvoiceService.updateImportInvoice(id, invoiceData);
        showSuccessModal(
          "Cập nhật thành công",
          "Hóa đơn nhập hàng đã được cập nhật"
        );
      } else {
        await importInvoiceService.createImportInvoice(invoiceData);
        showSuccessModal(
          "Tạo thành công",
          "Hóa đơn nhập hàng mới đã được tạo (chờ duyệt)"
        );
      }

      setIsModalOpen(false);
      setEditingInvoice(null);
      setEditingSupplierCode("");
      setInvoiceItems([
        {
          importInvoiceDetailCode: "",
          productCode: "",
          quantity: 1,
          unitPrice: 0
        }
      ]);
      await loadImportInvoices();
    } catch (error) {
      console.error("Error saving invoice:", error);
      showErrorModal(
        "Lỗi",
        editingInvoice ? "Không thể cập nhật hóa đơn" : "Không thể tạo hóa đơn"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle view
  const handleView = async (invoice) => {
    const id = invoice.importInvoiceCode || invoice.invoiceCode;
    if (!id) {
      showErrorModal("Lỗi", "Không tìm thấy mã hóa đơn để xem chi tiết.");
      return;
    }
    setLoading(true);
    try {
      const res = await importInvoiceService.getById(id);
      const data = res?.data?.data || res?.data || res;
      const inv = {
        ...data,
        invoiceCode: data.importInvoiceCode || data.invoiceCode || "",
        notes: data.description || data.notes || "",
        importDate: formatToDateInput(
          data.createdDate || data.created_date || data.importDate || ""
        ),
        items: (data.details || data.items || []).map((d) => ({
          id: d.id,
          detailCode: d.importInvoiceDetailCode || d.detailCode,
          productCode: d.productCode,
          quantity: d.quantity,
          unitPrice: d.importPrice || d.unitPrice || 0,
          totalAmount: d.totalAmount
        })),
        status: (() => {
          if (typeof data.status === "string") {
            const s = data.status.trim().toUpperCase();
            if (s === "1" || s === "TRUE") return STATUS.APPROVED;
            if (s === "0" || s === "FALSE") return STATUS.PENDING;
            if (
              s === STATUS.PENDING ||
              s === STATUS.APPROVED ||
              s === STATUS.REJECTED ||
              s === STATUS.DELETED
            )
              return s;
            return s;
          }
          if (typeof data.status === "boolean")
            return data.status ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof data.status === "number")
            return data.status === 1 ? STATUS.APPROVED : STATUS.PENDING;
          if (typeof data.approved === "boolean")
            return data.approved ? STATUS.APPROVED : STATUS.PENDING;
          return STATUS.PENDING;
        })()
      };

      setViewingInvoice(inv);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error("Error loading invoice details:", err);
      showErrorModal("Lỗi", "Không thể tải chi tiết hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (invoice) => {
    const id = invoice.importInvoiceCode || invoice.invoiceCode;
    showDeleteConfirm(id, invoice.notes || invoice.description);
  };

  // Export invoices
  const handleExport = () => {
    const csvContent = [
      [
        "Mã hóa đơn",
        "Mã NCC",
        "Ngày nhập",
        "Tổng tiền",
        "Trạng thái",
        "Ghi chú"
      ],
      ...filteredInvoices.map((invoice) => [
        invoice.importInvoiceCode || invoice.invoiceCode,
        invoice.supplierCode,
        invoice.importDate || "",
        invoice.totalAmount,
        statusToLabel(invoice.status),
        invoice.description || invoice.notes || ""
      ])
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-invoices.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadImportInvoices();
    loadSuppliers();
    loadProducts();
  }, []);

  // When in product-first mode and a product is selected, ensure every invoice item uses that productCode
  useEffect(() => {
    if (
      !editingInvoice &&
      displayMode === "product-first" &&
      selectedProductCode
    ) {
      setInvoiceItems((prev) =>
        prev.map((it) => ({
          ...it,
          productCode: selectedProductCode
        }))
      );

      // If supplier already selected, try to prefill unitPrice from supplier.productProvide
      if (selectedSupplierCode) {
        const supplier = suppliers.find(
          (s) => s.supplierCode === selectedSupplierCode
        );
        if (supplier && supplier.productProvide) {
          const pp = supplier.productProvide.find(
            (p) => p.productCode === selectedProductCode
          );
          if (pp && pp.importPrice) {
            setInvoiceItems((prev) =>
              prev.map((it) => ({ ...it, unitPrice: pp.importPrice }))
            );
          }
        }
      }
    }
  }, [
    selectedProductCode,
    displayMode,
    editingInvoice,
    selectedSupplierCode,
    suppliers
  ]);

  // When selected supplier changes in product-first mode, update unitPrice for items that match selectedProductCode
  useEffect(() => {
    if (
      !editingInvoice &&
      displayMode === "product-first" &&
      selectedSupplierCode &&
      selectedProductCode
    ) {
      const supplier = suppliers.find(
        (s) => s.supplierCode === selectedSupplierCode
      );
      if (supplier && supplier.productProvide) {
        const pp = supplier.productProvide.find(
          (p) => p.productCode === selectedProductCode
        );
        if (pp) {
          setInvoiceItems((prev) =>
            prev.map((it) =>
              it.productCode === selectedProductCode
                ? { ...it, unitPrice: pp.importPrice || it.unitPrice }
                : it
            )
          );
        }
      }
    }
  }, [
    selectedSupplierCode,
    selectedProductCode,
    displayMode,
    editingInvoice,
    suppliers
  ]);

  // Status constants (match API)
  const STATUS = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    DELETED: "DELETED"
  };

  // helper to show product label (name + code) in view modal
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

  // counts for pending / approved invoices
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
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaFileInvoice className="text-blue-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản lý hóa đơn nhập hàng
                </h1>
                <p className="text-gray-600">
                  Tạo và quản lý các hóa đơn nhập hàng
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
                onClick={() => {
                  // Auto-generate invoice code and first detail code for new invoice
                  const genInvoiceCode = `PN_${new Date()
                    .toISOString()
                    .replace(/[^0-9]/g, "")}`;
                  setAutoInvoiceCode(genInvoiceCode);
                  setEditingInvoice(null);
                  setInvoiceItems([
                    {
                      importInvoiceDetailCode: `CTPN_${Date.now()}`,
                      productCode: "",
                      quantity: 1,
                      unitPrice: 0
                    }
                  ]);
                  // Reset display mode state
                  setSelectedSupplierCode("");
                  setSelectedProductCode("");
                  setFilteredProducts([]);
                  setFilteredSuppliers([]);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaPlus />
                Tạo hóa đơn nhập hàng
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
                  placeholder="Tìm kiếm theo mã hóa đơn, mã NCC, ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            aria-pressed={filterStatus === "all"}
            onClick={() => handleFilterByStatus("all")}
            onKeyDown={(e) => e.key === "Enter" && handleFilterByStatus("all")}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md ${
              filterStatus === "all"
                ? "bg-blue-50 border-blue-300 shadow-md"
                : ""
            }`}
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
            aria-pressed={filterStatus === "pending"}
            onClick={() => handleFilterByStatus("pending")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("pending")
            }
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md ${
              filterStatus === "pending"
                ? "bg-orange-50 border-orange-300 shadow-md"
                : ""
            }`}
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
            aria-pressed={filterStatus === "approved"}
            onClick={() => handleFilterByStatus("approved")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("approved")
            }
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md ${
              filterStatus === "approved"
                ? "bg-green-50 border-green-300 shadow-md"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-700">
                  {approvedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheck className="text-green-600" />
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-pressed={filterStatus === "rejected"}
            onClick={() => handleFilterByStatus("rejected")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("rejected")
            }
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md ${
              filterStatus === "rejected"
                ? "bg-red-50 border-red-300 shadow-md"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã từ chối</p>
                <p className="text-2xl font-bold text-red-600">
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
            aria-pressed={filterStatus === "deleted"}
            onClick={() => handleFilterByStatus("deleted")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleFilterByStatus("deleted")
            }
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md ${
              filterStatus === "deleted"
                ? "bg-gray-50 border-gray-300 shadow-md"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã xóa</p>
                <p className="text-2xl font-bold text-gray-700">
                  {deletedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <FaTrash className="text-gray-600" />
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
                    Ngày nhập
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
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
                ) : currentInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Không có hóa đơn nhập hàng nào
                    </td>
                  </tr>
                ) : (
                  currentInvoices.map((invoice, index) => (
                    <tr
                      key={invoice.invoiceCode || index}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.supplierName || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.importDate || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND"
                          }).format(invoice.totalAmount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            invoice.status === STATUS.APPROVED
                              ? "bg-green-50 text-green-700"
                              : invoice.status === STATUS.PENDING
                              ? "bg-orange-50 text-orange-700"
                              : invoice.status === STATUS.REJECTED
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {invoice.status === STATUS.APPROVED
                            ? "Đã duyệt"
                            : invoice.status === STATUS.PENDING
                            ? "Chờ duyệt"
                            : invoice.status === STATUS.REJECTED
                            ? "Đã từ chối"
                            : statusToLabel(invoice.status)}
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
                          {invoice.status === STATUS.PENDING && (
                            <button
                              onClick={() => handleEdit(invoice)}
                              className="text-yellow-600 hover:text-yellow-900 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <FaEdit />
                            </button>
                          )}

                          {invoice.status === STATUS.DELETED && (
                            <button
                              onClick={() => showRestoreConfirm(invoice)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Khôi phục hóa đơn"
                            >
                              <FaUndo />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(invoice)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <FaTrash />
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

        {/* Add/Edit Modal - Modern 3-Panel Layout */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingInvoice(null);
            setInvoiceItems([
              {
                importInvoiceDetailCode: "",
                productCode: "",
                quantity: 1,
                unitPrice: 0
              }
            ]);
            setSelectedProducts([]);
            setSelectedSupplierCode("");
            setSelectedProductCode("");
            setInvoiceNotes("");
            setInvoiceDate(new Date().toISOString().split("T")[0]);
            setEditingSupplierCode("");
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                {editingInvoice ? (
                  <FaEdit className="text-white text-lg" />
                ) : (
                  <FaPlus className="text-white text-lg" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingInvoice
                    ? "Chỉnh sửa hóa đơn nhập hàng"
                    : "Tạo hóa đơn nhập hàng mới"}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingInvoice
                    ? "Cập nhật thông tin hóa đơn"
                    : "Hệ thống tự động tạo nhiều hóa đơn theo nhà cung cấp"}
                </p>
              </div>
            </div>
          }
          size="6xl"
        >
          {/* Hiển thị lý do từ chối khi tạo lại hóa đơn */}
          {isRecreatingFromRejection && rejectionReason && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800 mb-1">
                    Lý do từ chối hóa đơn gốc
                  </h4>
                  <p className="text-sm text-amber-700">{rejectionReason}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Vui lòng kiểm tra và chỉnh sửa thông tin trước khi tạo lại
                    hóa đơn mới.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Edit Form for Existing Invoices */}
          {editingInvoice ? (
            <form onSubmit={handleSaveInvoice} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã hóa đơn *
                  </label>
                  <input
                    type="text"
                    name="invoiceCode"
                    defaultValue={editingInvoice?.invoiceCode || ""}
                    required
                    readOnly={true}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nhà cung cấp *
                  </label>

                  {/* Display-only supplier name (read-only). Keep a hidden input with supplierCode for form submission. */}
                  <input
                    type="text"
                    readOnly
                    value={
                      suppliers.find(
                        (s) => s.supplierCode === editingSupplierCode
                      )?.supplierName ||
                      editingInvoice?.supplierName ||
                      ""
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <input
                    type="hidden"
                    name="supplierCode"
                    value={
                      editingSupplierCode || editingInvoice?.supplierCode || ""
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày nhập *
                  </label>
                  <input
                    type="date"
                    name="importDate"
                    defaultValue={editingInvoice?.importDate || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100"
                  />
                  <input
                    type="hidden"
                    name="importDate"
                    value={editingInvoice.importDate || ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú
                </label>
                <textarea
                  name="notes"
                  rows="3"
                  defaultValue={editingInvoice?.notes || ""}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Invoice Items Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Chi tiết sản phẩm
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Số lượng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Đơn giá
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <select
                              value={item.productCode}
                              onChange={(e) =>
                                updateInvoiceItem(
                                  index,
                                  "productCode",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Chọn sản phẩm</option>
                              {products.map((product) => (
                                <option
                                  key={product.productCode}
                                  value={product.productCode}
                                >
                                  {product.productName} ({product.productCode})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateInvoiceItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateInvoiceItem(
                                  index,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND"
                              }).format(
                                (parseFloat(item.quantity) || 0) *
                                  (parseFloat(item.unitPrice) || 0)
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <input
                  type="hidden"
                  name="discount"
                  value={editingInvoice?.discount ?? 0}
                />
                <input
                  type="hidden"
                  name="reason"
                  value={editingInvoice?.reason ?? ""}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsRecreatingFromRejection(false);
                    setRejectionReason("");
                    setSelectedProducts([]);
                    setEditingSupplierCode("");
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  Cập nhật hóa đơn
                </button>
              </div>
            </form>
          ) : (
            /* New 3-Panel Modern Layout for Creating Invoices */
            <div className="flex h-[70vh] bg-gray-50 rounded-lg overflow-hidden">
              {/* Left Sidebar - Creation Mode Menu */}
              <div className="w-1/6 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FaCog className="text-blue-500" />
                    Phương thức tạo
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Chọn cách thức tạo hóa đơn
                  </p>
                </div>

                <nav className="flex-1 p-2">
                  <ul className="space-y-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setDisplayMode("supplier-first");
                          setSelectedProducts([]);
                          setSelectedSupplierCode("");
                          setSelectedProductCode("");
                        }}
                        className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3 ${
                          displayMode === "supplier-first"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            displayMode === "supplier-first"
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <FaTruck className="text-sm" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            Theo nhà cung cấp
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Chọn nhà cung cấp trước, sau đó chọn sản phẩm
                          </div>
                        </div>
                      </button>
                    </li>

                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setDisplayMode("product-first");
                          setSelectedProducts([]);
                          setSelectedSupplierCode("");
                          setSelectedProductCode("");
                        }}
                        className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3 ${
                          displayMode === "product-first"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            displayMode === "product-first"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <FaBoxes className="text-sm" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            Theo sản phẩm
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Chọn sản phẩm trước, sau đó chọn nhà cung cấp
                          </div>
                        </div>
                      </button>
                    </li>

                    {/* multi-supplier option removed per request */}
                  </ul>
                </nav>

                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-600">
                    <FaInfoCircle className="inline mr-1" />
                    Hệ thống sẽ tự động tách hóa đơn theo nhà cung cấp
                  </div>
                </div>
              </div>

              {/* Middle Panel - Input Form */}
              <div className="w-3/6 flex flex-col bg-white">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FaClipboardList className="text-green-500" />
                    Thông tin hóa đơn
                  </h3>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Basic Invoice Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaCalendarAlt className="inline mr-1" />
                          Ngày nhập *
                        </label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaStickyNote className="inline mr-1" />
                          Ghi chú
                        </label>
                        <textarea
                          value={invoiceNotes}
                          onChange={(e) => setInvoiceNotes(e.target.value)}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ghi chú cho hóa đơn..."
                        />
                      </div>
                    </div>

                    {/* Product Selection Area */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Thêm sản phẩm
                      </h4>

                      {/* Dynamic form based on display mode */}
                      {displayMode === "supplier-first" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Chọn nhà cung cấp
                            </label>
                            <select
                              value={selectedSupplierCode}
                              onChange={(e) => {
                                setSelectedSupplierCode(e.target.value);
                                loadProductsForSupplier(e.target.value);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="">-- Chọn nhà cung cấp --</option>
                              {suppliers
                                .filter((s) => s.status)
                                .map((supplier) => (
                                  <option
                                    key={supplier.supplierCode}
                                    value={supplier.supplierCode}
                                  >
                                    {supplier.supplierName}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {selectedSupplierCode && (
                            <div>
                              {/* Search + Category for supplier-first picker */}
                              <div className="flex items-center gap-3 mb-3">
                                <input
                                  type="text"
                                  value={productSearch}
                                  onChange={(e) =>
                                    setProductSearch(e.target.value)
                                  }
                                  placeholder="Tìm theo tên hoặc mã sản phẩm..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                />

                                <select
                                  value={productCategoryFilter}
                                  onChange={(e) =>
                                    setProductCategoryFilter(e.target.value)
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                  <option value="all">Tất cả loại</option>
                                  {productCategoryOptions.map((opt) => (
                                    <option key={opt.code} value={opt.code}>
                                      {opt.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Product list for this supplier (open supplier modal on choose) */}
                              <div className="flex flex-col divide-y max-h-64 overflow-y-auto">
                                {supplierDisplayedProducts &&
                                supplierDisplayedProducts.length > 0 ? (
                                  supplierDisplayedProducts.map((product) => (
                                    <div
                                      key={product.productCode}
                                      className="flex items-center gap-3 px-2 py-2"
                                    >
                                      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                        <img
                                          src={buildImageUrl(
                                            product.image ||
                                              product.thumbnail ||
                                              product.avatar
                                          )}
                                          alt={product.productName}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-500">
                                          {product.productCode}
                                        </div>
                                        <div className="font-medium text-sm truncate">
                                          {product.productName}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // Prefilter suppliers to the selected supplier and open supplier modal
                                            const supplier = suppliers.find(
                                              (s) =>
                                                s.supplierCode ===
                                                selectedSupplierCode
                                            );
                                            if (supplier)
                                              setFilteredSuppliers([supplier]);
                                            setSupplierModalProduct(product);
                                            setSupplierModalQty(1);
                                            // default supplier modal price to supplier's productProvide price if available
                                            const pp = (
                                              supplier?.productProvide || []
                                            ).find(
                                              (p) =>
                                                p.productCode ===
                                                product.productCode
                                            );
                                            setSupplierModalPrice(
                                              pp?.importPrice ?? pp?.price ?? 0
                                            );
                                            setSupplierModalOpen(true);
                                          }}
                                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                                        >
                                          Chọn
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-2 py-3 text-sm text-gray-500">
                                    Không có sản phẩm cho nhà cung cấp này.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {displayMode === "product-first" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Chọn sản phẩm
                            </label>

                            {/* Search + Category for product-first picker */}
                            <div className="flex items-center gap-3 mb-3">
                              <input
                                type="text"
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                                placeholder="Tìm theo tên hoặc mã sản phẩm..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />

                              <select
                                value={productCategoryFilter}
                                onChange={(e) =>
                                  setProductCategoryFilter(e.target.value)
                                }
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="all">Tất cả loại</option>
                                {productCategoryOptions.map((opt) => (
                                  <option key={opt.code} value={opt.code}>
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Product list (one row per product) */}
                            <div className="flex flex-col divide-y max-h-64 overflow-y-auto">
                              {displayedProducts.map((product) => (
                                <div
                                  key={product.productCode}
                                  className="flex items-center gap-3 px-2 py-2"
                                >
                                  <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                    <img
                                      src={buildImageUrl(
                                        product.image ||
                                          product.thumbnail ||
                                          product.avatar
                                      )}
                                      alt={product.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500">
                                      {product.productCode}
                                    </div>
                                    <div className="font-medium text-sm truncate">
                                      {product.productName}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // open supplier modal overlay for this product
                                        loadSuppliersForProduct(
                                          product.productCode
                                        );
                                        setSupplierModalProduct(product);
                                        setSupplierModalQty(1);
                                        setSupplierModalPrice(0);
                                        setSupplierModalOpen(true);
                                      }}
                                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                                    >
                                      Chọn
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Pending product -> show suppliers for this product */}
                            {pendingProduct && (
                              <div className="mt-20 border rounded-lg p-3 bg-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-20 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                    <img
                                      src={buildImageUrl(
                                        pendingProduct.image ||
                                          pendingProduct.thumbnail ||
                                          pendingProduct.avatar
                                      )}
                                      alt={pendingProduct.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500">
                                      {pendingProduct.productCode}
                                    </div>
                                    <div className="font-medium">
                                      {pendingProduct.productName}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPendingProduct(null)}
                                    className="px-2 py-1 text-sm text-gray-600"
                                  >
                                    Hủy
                                  </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {filteredSuppliers &&
                                  filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map((supplier) => (
                                      <div
                                        key={supplier.supplierCode}
                                        className="flex items-center justify-between p-2 border rounded"
                                      >
                                        <div>
                                          <div className="font-medium">
                                            {supplier.supplierName}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {supplier.supplierCode}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              addProductForSupplier(
                                                pendingProduct.productCode,
                                                supplier.supplierCode
                                              )
                                            }
                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                                          >
                                            Lựa chọn
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      Không tìm thấy nhà cung cấp cho sản phẩm
                                      này.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* multi-supplier UI removed */}

                      {/* Add Product Button */}
                      {((displayMode === "supplier-first" &&
                        selectedSupplierCode &&
                        selectedProductCode) ||
                        (displayMode === "product-first" &&
                          selectedProductCode &&
                          selectedSupplierCode)) && (
                        <button
                          type="button"
                          onClick={() => {
                            const qtyInput =
                              document.getElementById("quantity-input");
                            const priceInput =
                              document.getElementById("price-input");
                            const quantity = parseInt(qtyInput.value) || 1;
                            const unitPrice = parseFloat(priceInput.value) || 0;

                            if (
                              selectedProductCode &&
                              selectedSupplierCode &&
                              quantity > 0
                            ) {
                              const newProduct = {
                                id: `${selectedProductCode}_${selectedSupplierCode}_${Date.now()}`,
                                productCode: selectedProductCode,
                                supplierCode: selectedSupplierCode,
                                quantity: quantity,
                                unitPrice: unitPrice
                              };

                              setSelectedProducts([
                                ...selectedProducts,
                                newProduct
                              ]);

                              // Reset inputs
                              qtyInput.value = "";
                              priceInput.value = "";
                              setSelectedProductCode("");
                            }
                          }}
                          className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaPlus />
                          Thêm sản phẩm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className="w-2/6 bg-white border-l border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FaEye className="text-purple-500" />
                    Xem trước hóa đơn
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedProducts.length} sản phẩm đã chọn
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {selectedProducts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FaClipboardList className="mx-auto text-3xl mb-2 opacity-50" />
                      <p className="text-sm">Chưa có sản phẩm nào</p>
                      <p className="text-xs">
                        Thêm sản phẩm để xem trước hóa đơn
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {/* Group products by supplier */}
                      {Object.entries(
                        selectedProducts.reduce((groups, product) => {
                          const supplierCode = product.supplierCode;
                          if (!groups[supplierCode]) {
                            groups[supplierCode] = [];
                          }
                          groups[supplierCode].push(product);
                          return groups;
                        }, {})
                      ).map(([supplierCode, products]) => {
                        const supplier = suppliers.find(
                          (s) => s.supplierCode === supplierCode
                        );
                        const supplierTotal = products.reduce(
                          (sum, p) => sum + p.quantity * p.unitPrice,
                          0
                        );

                        return (
                          <div
                            key={supplierCode}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm text-gray-900 flex items-center gap-1">
                                <FaTruck className="text-blue-500 text-xs" />
                                {supplier?.supplierName || supplierCode}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {products.length} sản phẩm
                              </span>
                            </div>

                            <div className="space-y-2">
                              {products.map((product) => {
                                const productInfo = products.find(
                                  (p) => p.productCode === product.productCode
                                );
                                return (
                                  <div
                                    key={product.id}
                                    className="bg-white rounded p-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900">
                                        {productInfo?.productName ||
                                          product.productCode}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedProducts(
                                            selectedProducts.filter(
                                              (p) => p.id !== product.id
                                            )
                                          );
                                        }}
                                        className="text-red-500 hover:text-red-700 ml-2"
                                      >
                                        <FaTimes />
                                      </button>
                                    </div>
                                    <div className="flex justify-between text-gray-600 mt-1">
                                      <span>SL: {product.quantity}</span>
                                      <span>
                                        {new Intl.NumberFormat("vi-VN", {
                                          style: "currency",
                                          currency: "VND"
                                        }).format(
                                          product.quantity * product.unitPrice
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-sm font-medium">
                                <span>Tổng nhà cung cấp:</span>
                                <span className="text-blue-600">
                                  {new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND"
                                  }).format(supplierTotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer with totals and submit */}
                {selectedProducts.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Số hóa đơn sẽ tạo:</span>
                        <span className="font-bold text-blue-600">
                          {
                            Object.keys(
                              selectedProducts.reduce((groups, product) => {
                                groups[product.supplierCode] = true;
                                return groups;
                              }, {})
                            ).length
                          }
                        </span>
                      </div>

                      <div className="flex justify-between text-sm font-bold">
                        <span>Tổng cộng:</span>
                        <span className="text-green-600">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND"
                          }).format(
                            selectedProducts.reduce(
                              (sum, p) => sum + p.quantity * p.unitPrice,
                              0
                            )
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProducts.length > 0) {
                            const groupedBySupplier = selectedProducts.reduce(
                              (groups, product) => {
                                const supplierCode = product.supplierCode;
                                if (!groups[supplierCode]) {
                                  groups[supplierCode] = [];
                                }
                                groups[supplierCode].push(product);
                                return groups;
                              },
                              {}
                            );

                            handleSaveInvoiceFromModal({
                              selectedProducts,
                              invoiceDate,
                              invoiceNotes,
                              groupedBySupplier
                            });
                          }
                        }}
                        disabled={loading || selectedProducts.length === 0}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                      >
                        {loading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        <FaCheck />
                        Tạo hóa đơn
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer với nút đóng modal cho 3-panel layout */}
            </div>
          )}
        </Modal>

        {/* View Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingInvoice(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaEye className="text-green-600" />
              </div>
              <span>Chi tiết hóa đơn nhập hàng</span>
            </div>
          }
          size="full"
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
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        viewingInvoice.status === STATUS.APPROVED
                          ? "bg-green-50 text-green-700"
                          : viewingInvoice.status === STATUS.PENDING
                          ? "bg-orange-50 text-orange-700"
                          : viewingInvoice.status === STATUS.REJECTED
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {viewingInvoice.status === STATUS.APPROVED
                        ? "Đã duyệt"
                        : viewingInvoice.status === STATUS.PENDING
                        ? "Chờ duyệt"
                        : viewingInvoice.status === STATUS.REJECTED
                        ? "Đã từ chối"
                        : statusToLabel(viewingInvoice.status)}
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
                <div className="mt-6 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg shadow-sm">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-red-200 bg-red-50/80">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <FaTimesCircle className="text-red-600 text-lg" />
                      </div>
                      <h4 className="font-semibold text-red-800 text-lg">
                        Hóa đơn đã bị từ chối
                      </h4>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-red-700 mb-2">
                        <FaExclamationTriangle className="inline mr-2" />
                        Lý do từ chối:
                      </label>
                      <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                        <p className="text-red-800 leading-relaxed">
                          {viewingInvoice.reason ||
                            viewingInvoice.rejectReason ||
                            viewingInvoice.rejectedReason ||
                            "Không có lý do được cung cấp."}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-red-200">
                      <button
                        type="button"
                        onClick={() => {
                          // derive supplier code/name robustly from viewingInvoice
                          const supplierCodeVar =
                            viewingInvoice.supplierCode ||
                            viewingInvoice.supplier?.supplierCode ||
                            viewingInvoice.supplier?.code ||
                            viewingInvoice.supplier_code ||
                            viewingInvoice.supplierId ||
                            viewingInvoice.supplier_id ||
                            "";
                          const supplierNameVar =
                            viewingInvoice.supplierName ||
                            viewingInvoice.supplier?.supplierName ||
                            viewingInvoice.supplier?.name ||
                            viewingInvoice.supplier_name ||
                            "";

                          // Fill selectedProducts từ hóa đơn bị từ chối
                          const productsFromRejected = (
                            viewingInvoice.items || []
                          ).map((it, index) => ({
                            id: `recreate_${index}`,
                            productCode: it.productCode,
                            productName: getProductName(it.productCode),
                            supplierCode: supplierCodeVar,
                            supplierName: supplierNameVar,
                            quantity: it.quantity || 1,
                            unitPrice: it.unitPrice || it.importPrice || 0,
                            totalPrice:
                              (it.quantity || 1) *
                              (it.unitPrice || it.importPrice || 0)
                          }));

                          // Prefill modal state
                          setSelectedProducts(productsFromRejected);
                          if (supplierCodeVar)
                            setSelectedSupplierCode(supplierCodeVar);
                          setInvoiceNotes(viewingInvoice.notes || "");
                          setInvoiceDate(
                            formatToDateInput(
                              viewingInvoice.importDate ||
                                viewingInvoice.created_date
                            )
                          );
                          setRejectionReason(
                            viewingInvoice.reason ||
                              viewingInvoice.rejectReason ||
                              viewingInvoice.rejectedReason ||
                              ""
                          );
                          setIsRecreatingFromRejection(true);

                          // Đóng view modal và mở create modal
                          setIsViewModalOpen(false);
                          setIsModalOpen(true);
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                      >
                        <FaUndo className="text-sm" />
                        Tạo lại hóa đơn
                      </button>
                    </div>

                    {/* Help text */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 flex items-start gap-2">
                        <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
                        Bạn có thể tạo lại hóa đơn mới dựa trên thông tin của
                        hóa đơn bị từ chối này. Hệ thống sẽ tự động điền sẵn các
                        thông tin và bạn có thể chỉnh sửa trước khi lưu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items table */}
              {viewingInvoice.items && viewingInvoice.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Chi tiết sản phẩm
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Mã sản phẩm
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tên sản phẩm
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Số lượng
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Đơn giá
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.productCode}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {getProductName(item.productCode)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND"
                              }).format(item.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
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
                            className="px-4 py-3 text-right font-medium text-gray-900"
                          >
                            Tổng cộng:
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
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
              )}

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingInvoice(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Supplier Picker Modal (overlays the create-invoice modal) */}
        <Modal
          isOpen={supplierModalOpen}
          onClose={() => {
            setSupplierModalOpen(false);
            setSupplierModalProduct(null);
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaTruck className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {supplierModalProduct
                    ? supplierModalProduct.productName
                    : "Nhà cung cấp"}
                </h3>
                <p className="text-sm text-gray-500">
                  Chọn nhà cung cấp để thêm sản phẩm vào hóa đơn
                </p>
              </div>
            </div>
          }
          size="lg"
        >
          {supplierModalProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-16 bg-gray-100 rounded overflow-hidden">
                  <img
                    src={buildImageUrl(
                      supplierModalProduct.image ||
                        supplierModalProduct.thumbnail ||
                        supplierModalProduct.avatar
                    )}
                    alt={supplierModalProduct.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    {supplierModalProduct.productCode}
                  </div>
                  <div className="font-medium">
                    {supplierModalProduct.productName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supplierModalQty}
                    onChange={(e) =>
                      setSupplierModalQty(parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Đơn giá
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={supplierModalPrice}
                    onChange={(e) =>
                      setSupplierModalPrice(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredSuppliers && filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => {
                    const pp = (supplier.productProvide || []).find(
                      (p) =>
                        p.productCode ===
                        (supplierModalProduct &&
                          supplierModalProduct.productCode)
                    );
                    const supplierPrice = pp?.importPrice ?? pp?.price ?? null;
                    return (
                      <div
                        key={supplier.supplierCode}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <div className="font-medium">
                            {supplier.supplierName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {supplier.supplierCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {supplierPrice != null ? (
                            <div className="text-sm text-gray-700">
                              Giá NCC:{" "}
                              <span className="font-medium text-blue-600">
                                {new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND"
                                }).format(supplierPrice)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Không có giá
                            </div>
                          )}

                          {supplierPrice != null && (
                            <button
                              type="button"
                              onClick={() =>
                                setSupplierModalPrice(supplierPrice)
                              }
                              className="px-2 py-1 border rounded text-sm text-gray-700"
                            >
                              Điều chỉnh giá
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              addProductForSupplier(
                                supplierModalProduct.productCode,
                                supplier.supplierCode
                              )
                            }
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-sm"
                          >
                            Lựa chọn
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">
                    Không tìm thấy nhà cung cấp cho sản phẩm này.
                  </div>
                )}
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

export default ImportInvoicesPage;
