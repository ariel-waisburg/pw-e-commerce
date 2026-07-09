"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./productos.module.css";

export default function AdminProductsPage() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/products")
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los productos");
        return response.json();
      })
      .then((data) => {
        if (isMounted) setProducts(data.products);
      })
      .catch((fetchError) => {
        if (isMounted) setError(fetchError.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Productos</h1>
        <Link href="/admin/productos/nuevo" className={styles.newButton}>
          Nuevo producto
        </Link>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {!products && !error ? <p>Cargando...</p> : null}
      {products?.length === 0 ? <p>Todavía no hay productos cargados.</p> : null}

      {products?.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Variantes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.slug}</td>
                <td>{product.status}</td>
                <td>{product.variants?.length ?? 0}</td>
                <td>
                  <Link href={`/admin/productos/${product.id}`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
