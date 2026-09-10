import { AuthService } from "@/lib/services/auth.service";
import { jsonMessage, jsonOk, toApiError } from "@/lib/http";
import { getSidFromCookie } from "@/lib/session";

export async function GET() {
  const sid = await getSidFromCookie();
  try {
    const user = await AuthService.getUserBySid(sid);
    if (!user) {
      return jsonMessage("You must be signed in to continue", 401);
    }
    return jsonOk(user);
  } catch (error) {
    return toApiError(error);
  }
}
