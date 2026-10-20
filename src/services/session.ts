import { setAuthToken } from "../api/http";

const TOKEN_KEY = "weils-dashboard-token";

/** 读取浏览器会话中的管理令牌，并使其对后续请求生效。 */
export function readSessionToken(): string {
  const token = sessionStorage.getItem(TOKEN_KEY)?.trim() || "";
  setAuthToken(token);
  return token;
}

/** 让令牌对后续请求生效，但不写入浏览器存储（用于连接尝试与失败回退）。 */
export function useSessionToken(token: string | null | undefined): void {
  setAuthToken(token);
}

/** 写入浏览器会话并使其立即生效。 */
export function persistSessionToken(token: string): void {
  const value = token.trim();
  sessionStorage.setItem(TOKEN_KEY, value);
  setAuthToken(value);
}

/** 清除浏览器会话中的令牌并使其失效。 */
export function forgetSessionToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  setAuthToken("");
}
