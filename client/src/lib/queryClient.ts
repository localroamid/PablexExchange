import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/config/environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  
  console.log('🌐 API Request:', url);
  
  const res = await fetch(url, {
    method,
    headers: { 
      "Content-Type": "application/json",
      ...(data ? {} : {})
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    mode: 'cors'
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey.join("/") as string;
    const baseUrl = getApiBaseUrl();
    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
    
    console.log('🌐 Query Request:', url);
    
    const res = await fetch(url, {
      credentials: "include",
      mode: 'cors'
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 1000, // ACTUALIZAR CADA 1 SEGUNDO TIEMPO REAL
      refetchOnWindowFocus: true,
      staleTime: 0, // Siempre considerar datos obsoletos para forzar actualizaciones
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
