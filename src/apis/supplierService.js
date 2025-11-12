import axiosClient from "./axiosClient";

const getAllSuppliers = async () => {
  const result = await axiosClient.get("/suppliers");
  return result;
};

const getById = async (id) => {
  const result = await axiosClient.get(`/suppliers/${id}`);
  return result;
};

const searchSupplier = async (value) => {
  const result = await axiosClient.get(`/suppliers/search?q=${value}`);
  return result;
};

const createSupplier = async (data) => {
  const result = await axiosClient.post(`/suppliers/create`, data);
  return result;
};

const updateSupplier = async (id, data) => {
  console.log(data);
  const result = await axiosClient.post(`/suppliers/update/${id}`, data);
  // console.log(result);
  return result;
};

const deleteSupplier = async (id) => {
  console.log(id);
  const result = await axiosClient.post(`/suppliers/delete/${id}`);
  return result;
};

export const supplierService = {
  getAllSuppliers,
  getById,
  searchSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
