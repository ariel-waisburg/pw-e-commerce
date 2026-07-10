import AdminProductForm from "@/components/admin/AdminProductForm";
import styles from "../productos.module.css";

export default function NewAdminProductPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Nuevo producto</h1>
      <AdminProductForm />
    </div>
  );
}
