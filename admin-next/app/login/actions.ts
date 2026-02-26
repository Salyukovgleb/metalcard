"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, setAdminSession, verifyDjangoPassword } from "@/lib/auth";

function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = asText(formData.get("email")).toLowerCase();
  const password = asText(formData.get("password"));

  if (!email || !password) {
    redirect("/login?error=1");
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyDjangoPassword(password, user.passwordHash)) {
    redirect("/login?error=1");
  }

  await setAdminSession(user.id);
  redirect("/");
}
