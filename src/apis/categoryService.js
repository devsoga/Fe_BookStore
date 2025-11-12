import axiosClient from "./axiosClient";

const getAllCategory = async () => {
  const result = await axiosClient.get("/categories");
  return result;
};

const getCategoryByCode = async (categoryCode) => {
  const result = await axiosClient.get(`/categories/${categoryCode}`);
  return result;
};

const createCategory = async (data) => {
  const result = await axiosClient.post(`/categories/create`, data);
  return result;
};

const updateCategory = async (categoryCode, data) => {
  const result = await axiosClient.post(
    `/categories/update/${categoryCode}`,
    data
  );
  return result;
};

const deleteCategory = async (categoryCode) => {
  const result = await axiosClient.post(`/categories/delete/${categoryCode}`);
  return result;
};

export const categoryService = {
  getAllCategory,
  getCategoryByCode,
  createCategory,
  updateCategory,
  deleteCategory
};
