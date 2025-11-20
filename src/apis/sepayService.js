import axiosClient from "./axiosClient";

// Sepay-related API helpers
// Polling helper to check transfer records for an order
const getTransfersByOrder = async (orderCode) => {
  // GET /orders/{orderCode}/transfers
  // axiosClient baseURL should point to http://localhost:8080/v1/api or equivalent
  const res = await axiosClient.get(`/orders/${orderCode}/transfers`);
  return res;
};

export const sepayService = {
  getTransfersByOrder
};
