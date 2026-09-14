import axios from "axios";

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./auth";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
);

let isRefreshing = false;

let refreshSubscribers: Array<
  (token: string) => void
> = [];

function subscribeToRefresh(
  callback: (token: string) => void,
): void {
  refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(
  token: string,
): void {
  refreshSubscribers.forEach(
    (callback) => callback(token),
  );

  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeToRefresh((newToken) => {
          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {
          refresh_token: refreshToken,
        },
      );

      const newAccessToken =
        response.data.access_token;

      const newRefreshToken =
        response.data.refresh_token;

      setTokens(
        newAccessToken,
        newRefreshToken,
      );

      notifyRefreshSubscribers(
        newAccessToken,
      );

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();

      return Promise.reject(
        refreshError,
      );
    } finally {
      isRefreshing = false;
    }
  },
);