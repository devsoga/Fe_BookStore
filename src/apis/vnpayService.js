import axiosClient from "./axiosClient";

const createPayment = (amount, bankCode = "NCB", orderCode) => {
  return axiosClient.get("/vnpay/create_payment", {
    params: { amount, bankCode, orderCode }
  });
};

export default {
  createPayment
};
