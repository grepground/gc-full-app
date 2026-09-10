import { AuthService } from "@/lib/services/auth.service";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";
import { jsonOk, toApiError, parseBody } from "@/lib/http";

export async function POST(req: Request) {
  const parsed = await parseBody(req, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await AuthService.resetPassword(
      parsed.data.email,
      parsed.data.code,
      parsed.data.newPassword,
    );
    return jsonOk({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return toApiError(error);
  }
}
