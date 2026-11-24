"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { bookPlates } from "@/lib/booking";

export async function signOut() {
  clearSession();
  redirect("/");
}

function safeRedirectUrl(rawUrl: unknown, params: Record<string, string>): string {
  const str = typeof rawUrl === "string" ? rawUrl : "/";
  const validUrl = str.startsWith("/") && !str.startsWith("//") ? str : "/";
  const [path, queryString] = validUrl.split("?");
  const searchParams = new URLSearchParams(queryString || "");
  for (const [key, val] of Object.entries(params)) {
    searchParams.set(key, val);
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function bookPlatesAction(formData: FormData) {
  const rawReturnUrl = formData.get("returnUrl");
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    redirect(safeRedirectUrl(rawReturnUrl, { error: "NOT_STUDENT" }));
  }

  const offeringId = String(formData.get("offeringId") ?? "");
  const count = Number(formData.get("count"));

  const result = await bookPlates(user.id, offeringId, count);

  revalidatePath("/");
  revalidatePath("/schedule");

  if (!result.ok) {
    redirect(safeRedirectUrl(rawReturnUrl, { error: result.reason }));
  }

  redirect(safeRedirectUrl(rawReturnUrl, { booked: "1" }));
}
