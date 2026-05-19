type DataEnvelope<T> = {
  data: T;
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type ApiFetchOptions = RequestInit & {
  skipAuthRedirect?: boolean;
};

const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "");

let baseUrl = DEFAULT_BASE_URL.replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return baseUrl;
}

export function setApiBaseUrl(url: string): void {
  baseUrl = url.replace(/\/$/, "");
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRedirect = false, headers, ...init } = options;

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers
    }
  });

  if (
    response.status === 401 &&
    !skipAuthRedirect &&
    typeof window !== "undefined" &&
    window.location.pathname !== "/login"
  ) {
    window.location.href = "/login";
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: (DataEnvelope<T> & ErrorEnvelope) | undefined;
  try {
    payload = (await response.json()) as DataEnvelope<T> & ErrorEnvelope;
  } catch {
    throw new ApiError(
      "invalid_response",
      `Запрос завершился с ошибкой ${response.status}`,
      response.status
    );
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? `Запрос завершился с ошибкой ${response.status}`,
      response.status
    );
  }

  return payload!.data;
}
