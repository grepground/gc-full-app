import { AuthService } from "@/lib/services/auth.service";
import { jsonOk, toApiError } from "@/lib/http";
import { clearSessionCookie, getSidFromCookie } from "@/lib/session";

export async function POST() {
  const sid = await getSidFromCookie();
  try {
    await AuthService.logout(sid);
  } catch (error) {
    return toApiError(error);
  }
  await clearSessionCookie();
  return jsonOk({ success: true, message: "Signed out successfully." });
}
