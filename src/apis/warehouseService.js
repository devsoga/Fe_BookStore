import axiosClient from "./axiosClient";

const getAllInventory = async () => {
  const result = await axiosClient.get("/inventory");
  return result?.data?.data;
};

const getInventoryByProductCode = async (productCode) => {
  const result = await axiosClient.get(`/inventory/by-product/${productCode}`);
  return result?.data?.data;
};

const getInventoryDetailsByInventoryCode = async (inventoryCode) => {
  const result = await axiosClient.get(
    `/inventory-details/by-inventory/${inventoryCode}`
  );
  return result?.data?.data;
};

export const warehouseService = {
  getAllInventory,
  getInventoryDetailsByInventoryCode,
  getInventoryByProductCode
};
