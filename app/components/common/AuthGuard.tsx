"use client";

import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function GlobalSuspensionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user) {
      // FIX: If the user's isActive is false and they are NOT already on the suspended page, block them!
      if (user.isActive === false && pathname !== "/suspended") {
        router.replace("/suspended");
      }

      // If the user is active but manually tries to visit /suspended, send them back home
      if (user.isActive === true && pathname === "/suspended") {
        router.replace("/");
      }
    }
  }, [user, loading, pathname, router]);

  // If the user is penalized and tries to render other pages, lock the screen against leaks
  if (
    !loading &&
    user &&
    user.isActive === false &&
    pathname !== "/suspended"
  ) {
    return null;
  }

  return <>{children}</>;
}
