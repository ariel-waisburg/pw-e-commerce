import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/admin-auth";
import styles from "./admin.module.css";

export default async function AdminDashboardLayout({ children }) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Sleep Admin</span>
        <nav className={styles.nav}>
          <Link href="/admin/productos">Productos</Link>
        </nav>
        <span className={styles.userEmail}>{session.user.email}</span>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
