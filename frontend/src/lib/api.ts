// API Client with Authorization
import type { ApiError } from "@/schemas/api";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "access_token";

// ============================================================================
// Token Management
// ============================================================================

export const TokenManager = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  set: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },

  exists: (): boolean => {
    return !!TokenManager.get();
  },
};

// ============================================================================
// API Error Class
// ============================================================================

export class ApiException extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(error: ApiError, statusCode: number) {
    super(error.message);
    this.name = "ApiException";
    this.code = error.code;
    this.statusCode = statusCode;
    this.details = error.details ?? undefined;
  }
}

// ============================================================================
// API Client
// ============================================================================

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  requiresAuth?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private buildURL(path: string, params?: Record<string, any>): string {
    // Handle relative URLs (like /api)
    let url: URL;
    if (
      this.baseURL.startsWith("http://") ||
      this.baseURL.startsWith("https://")
    ) {
      url = new URL(path, this.baseURL);
    } else {
      // For relative base URLs, construct relative path with query params
      const fullPath = `${this.baseURL}${path}`;
      if (typeof window !== "undefined") {
        url = new URL(fullPath, window.location.origin);
      } else {
        // Server-side: return relative URL string
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
        }
        const queryString = searchParams.toString();
        return queryString ? `${fullPath}?${queryString}` : fullPath;
      }
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Return relative URL for client-side
    if (
      !this.baseURL.startsWith("http://") &&
      !this.baseURL.startsWith("https://")
    ) {
      return url.pathname + url.search;
    }

    return url.toString();
  }

  private getHeaders(requiresAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (requiresAuth) {
      const token = TokenManager.get();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(
    response: Response,
    hadToken: boolean
  ): Promise<T> {
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    // If not JSON, return text or throw error
    if (!isJson) {
      if (!response.ok) {
        throw new ApiException(
          {
            code: "UNKNOWN_ERROR",
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
          response.status
        );
      }
      return (await response.text()) as T;
    }

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const apiError: ApiError = data;

      // Auto-logout on 401 Unauthorized, but only if user was previously authenticated
      // Don't redirect on login/register failures (when hadToken is false)
      if (response.status === 401 && hadToken) {
        TokenManager.remove();
        // Dispatch custom event for components to handle navigation
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
      }

      throw new ApiException(apiError, response.status);
    }

    return data as T;
  }

  async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, requiresAuth = false, ...fetchOptions } = options;

    // Check if there was a token before making the request
    const hadToken = TokenManager.exists();

    const url = this.buildURL(path, params);
    const headers = this.getHeaders(requiresAuth);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...fetchOptions.headers,
      },
    });

    return this.handleResponse<T>(response, hadToken);
  }
  // real nhé

  // async request<T>(
  //   path: string,
  //   options: RequestOptions = {}
  // ): Promise<T> {
  //   // Fake data cho các endpoint thường dùng
  //   const fakeData: Record<string, any> = {
  //     '/auth/validate': { valid: true },
  //     '/spaces': [{ id: 1, name: 'Fake Space', location: 'Fake City' }],
  //     '/bookings': [],
  //     '/users/me': {
  //       id: 1,
  //       email: 'dev@example.com',
  //       full_name: 'Dev User',
  //       role: 'admin',
  //       status: 'active',
  //       joined_at: new Date().toISOString(),
  //     },
  //     // Thêm các endpoint khác nếu FE gọi
  //   };

  //   // Nếu path có trong fakeData, trả dữ liệu ngay
  //   if (path in fakeData) {
  //     return fakeData[path] as T;
  //   }

  //   // Nếu path chưa fake, trả về empty object để FE không crash
  //   return {} as T;
  // }

  async get<T>(
    path: string,
    params?: Record<string, any>,
    requiresAuth: boolean = false
  ): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
      params,
      requiresAuth,
    });
  }

  async post<T>(
    path: string,
    body?: any,
    requiresAuth: boolean = false
  ): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      requiresAuth,
    });
  }

  async patch<T>(
    path: string,
    body?: any,
    requiresAuth: boolean = false
  ): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      requiresAuth,
    });
  }

  async delete<T>(path: string, requiresAuth: boolean = false): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      requiresAuth,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const api = new ApiClient(API_BASE_URL);

// ============================================================================
// Convenience Re-exports
// ============================================================================

export { API_BASE_URL };
