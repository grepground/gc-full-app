import { AuthService } from "@/lib/services/auth.service";
import { loginSchema } from "@/lib/validations/auth.schema";
import { jsonOk, toApiError, parseBody } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const auth = await AuthService.login(
      parsed.data.username,
      parsed.data.password,
    );
    await setSessionCookie(auth.sid);
    return jsonOk(auth.user);
  } catch (error) {
    return toApiError(error);
  }
}
