import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
