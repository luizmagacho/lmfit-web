export function apiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Se o usuário estiver acessando pelo celular (ex: 192.168.15.22), a API deve apontar para o mesmo IP
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.includes("kivoni.com.br")) {
      const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
      if (isIP) {
        return `http://${hostname}:4000`;
      }
    }
  }
  return "http://localhost:4000";
}
