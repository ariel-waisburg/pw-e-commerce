import { z } from "zod";

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresá tu nombre"),
    email: z.string().trim().email("Ingresá un email válido"),
  })
  .strip();

export function parseRegistrationInput(input) {
  const result = registrationSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }

  const issue = result.error.issues[0];
  return {
    success: false,
    data: null,
    error: {
      field: issue?.path?.join(".") ?? null,
      message: issue?.message ?? "No se pudo validar el registro",
    },
  };
}
