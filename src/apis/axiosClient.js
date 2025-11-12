import axios from "axios";
const apilocal = import.meta.env.VITE_DB_URL_LOCAL;
const apiRender = import.meta.env.VITE_DB_URL_RENDER;

const axiosClient = axios.create({
  baseURL: apilocal,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization:
      "Bearer eyJhbGciOiJIUzUxMiJ9.eyJleHAiOjE3NjM5MDY4MzAsInN1YiI6ImRldnNvZ2EiLCJpYXQiOjE3NjEzMTQ4MzB9.fLbjXL50_HFr1MS_KDB6FPsKC1nwrC2WdUROU1QlDsjbU-CUDNYRIoCvggtL3d37hkHM2mi5j0MhiOSz8Ozdtg"
  }
});

export default axiosClient;
