import { notFound } from "next/navigation";
import AdminProductForm from "@/components/admin/AdminProductForm";
import { getAdminProductById } from "@/lib/products/admin-service";
import styles from "../productos.module.css";

export default async function EditAdminProductPage({ params }) {
  const { id } = await params;
  const product = await getAdminProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Editar producto</h1>
      <AdminProductForm product={product} productId={product.id} />
    </div>
  );
}
