import React from "react";
import { useRoutes } from "react-router-dom";
import { path } from "~/assets/Path/path";
import DetailProduct from "~/pages/DetailProduct/DetailProduct";
import Cart from "~/pages/Cart/Cart";
import HomePage from "~/pages/HomePage/HomePage";
import OurShop from "~/pages/OurShop/OurShop";
import Order from "~/pages/Order/Order";
import PageNotFound from "~/components/PageNotFound/PageNotFound";
import About from "~/pages/About/About";
import AdminDashboard from "~/pages/Admin/AdminDashboard";
import RolesPage from "~/pages/Admin/Roles/RolesPage";
import AccountsPage from "~/pages/Admin/AdminDashboard/AccountsPage";
import CustomersPage from "~/pages/Admin/Customers/CustomersPage";
import EmployeesPage from "~/pages/Admin/Employees/EmployeesPage";
import CustomerTypePage from "~/pages/Admin/CustomerType/CustomerTypePage";
import SuppliersPage from "~/pages/Admin/Supplier/SuppliersPage";
import ProductCategoriesPage from "~/pages/Admin/ProductCategories/ProductCategoriesPage";
import ProductsPage from "~/pages/Admin/Product/ProductsPage";
import PriceHistoryPage from "~/pages/Admin/PriceHistory/PriceHistoryPage";
import WarehousePage from "~/pages/Admin/Warehouse/WarehousePage";
import OrdersPage from "~/pages/Admin/Orders/OrdersPage";
import ImportInvoicesPage from "~/pages/Admin/ImportInvoice/ImportInvoicesPage";
import AdminApprovalPage from "~/pages/Admin/ImportInvoice/AdminApprovalPage";
import ImportInvoicePrint from "~/pages/Admin/ImportInvoice/ImportInvoicePrint";
import PromotionTypesPage from "~/pages/Admin/PromotionTypes/PromotionTypesPage";
import PromotionsPage from "~/pages/Admin/Promotions/PromotionsPage";
import POSPage from "~/pages/Admin/POS/POSPage";
import CouponPage from "~/pages/Admin/Coupon/CouponPage";

const useRouteCustom = () => {
  const elements = useRoutes([
    {
      path: "*",
      element: <PageNotFound />
    },
    {
      path: path.Homepage,
      element: <HomePage />
    },
    {
      path: path.About,
      element: <About />
    },
    {
      path: path.OurShop,
      element: <OurShop />
    },
    {
      path: path.Cart,
      element: <Cart />
    },
    {
      path: path.Product,
      element: <DetailProduct />
    },
    {
      path: path.Order,
      element: <Order />
    },
    {
      path: path.POS,
      element: <POSPage />
    },
    {
      path: path.Admin,
      element: <AdminDashboard />
    },
    {
      path: path.AdminRoles,
      element: <RolesPage />
    },
    {
      path: path.AdminAccounts,
      element: <AccountsPage />
    },
    {
      path: path.AdminCustomerTypes,
      element: <CustomerTypePage />
    },
    {
      path: path.AdminCustomers,
      element: <CustomersPage />
    },
    {
      path: path.AdminEmployees,
      element: <EmployeesPage />
    },
    {
      path: path.AdminSuppliers,
      element: <SuppliersPage />
    },
    {
      path: path.AdminProductCategories,
      element: <ProductCategoriesPage />
    },
    {
      path: path.AdminProducts,
      element: <ProductsPage />
    },
    {
      path: path.AdminPriceHistory,
      element: <PriceHistoryPage />
    },
    {
      path: path.AdminInventory,
      element: <WarehousePage />
    },
    {
      path: path.AdminOrders,
      element: <OrdersPage />
    },
    {
      path: path.AdminPromotionTypes,
      element: <PromotionTypesPage />
    },
    {
      path: path.AdminPromotions,
      element: <PromotionsPage />
    },
    {
      path: "/admin/coupons",
      element: <CouponPage />
    },
    {
      path: path.AdminImportInvoices,
      element: <ImportInvoicesPage />
    },
    {
      path: path.AdminImportDetails,
      element: <AdminApprovalPage />
    },
    {
      path: path.AdminImportPrint,
      element: <ImportInvoicePrint />
    }
  ]);
  return elements;
};

export default useRouteCustom;
