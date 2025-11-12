import axiosClient from "./axiosClient";

const createOrder = async (body) => {
  const result = await axiosClient.post(`/orders`, body);
  return result;
};

const getAllOrders = async () => {
  const result = await axiosClient.get(`/orders`);
  return result;
};

const getOrderByCode = async (orderCode) => {
  const result = await axiosClient.get(`/orders/${orderCode}`);
  return result;
};

const updateOrder = async (orderCode, body) => {
  const result = await axiosClient.post(`/orders/update/${orderCode}`, body);
  return result;
};

const deleteOrder = async (orderCode) => {
  const result = await axiosClient.post(`/orders/${orderCode}`);
  return result;
};

const getOrdersByCustomer = async (customerCode) => {
  console.log(customerCode);
  const result = await axiosClient.get(`/orders/customer/${customerCode}`);
  console.log(result);
  return result;
};

// Order details
const getOrderDetails = async (orderCode) => {
  const result = await axiosClient.get(`/orders/${orderCode}/details`);
  return result;
};

const createOrderDetail = async (orderCode, body) => {
  const result = await axiosClient.post(
    `/orders/${orderCode}/details/create`,
    body
  );
  return result;
};

const updateOrderDetail = async (orderCode, detailCode, body) => {
  const result = await axiosClient.post(
    `/orders/${orderCode}/details/update/${detailCode}`,
    body
  );
  return result;
};

const deleteOrderDetail = async (orderCode, detailCode) => {
  const result = await axiosClient.post(
    `/orders/${orderCode}/details/delete/${detailCode}`
  );
  return result;
};

export const orderService = {
  createOrder,
  getAllOrders,
  getOrderByCode,
  updateOrder,
  deleteOrder,
  getOrdersByCustomer,
  getOrderDetails,
  createOrderDetail,
  updateOrderDetail,
  deleteOrderDetail
};
