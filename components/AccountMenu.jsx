"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./AccountMenu.module.css";

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return (
      <div className={styles.menu}>
        <Link href="/login" className={styles.link}>
          Ingresar
        </Link>
        <Link href="/registro" className={`${styles.link} ${styles.registerLink}`}>
          Registrarme
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email;

  return (
    <div className={styles.menu}>
      <span className={styles.greeting}>Hola, {displayName}</span>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Salir
      </button>
    </div>
  );
}
