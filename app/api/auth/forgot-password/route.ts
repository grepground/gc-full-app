import { AuthService } from "@/lib/services/auth.service";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";
import { jsonOk, toApiError, parseBody } from "@/lib/http";

export async function POST(req: Request) {
  const parsed = await parseBody(req, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await AuthService.requestPasswordReset(parsed.data.email);
    return jsonOk({
      success: true,
      message: "If that email exists, a reset code has been sent.",
    });
  } catch (error) {
    return toApiError(error);
  }
}
