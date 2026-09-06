import { redirect } from "next/navigation";
import { requireStaff } from "./auth";

export async function guardAdminPage() {
  try {
    return await requireStaff();
  } catch {
    redirect("/admin/login");
  }
}
