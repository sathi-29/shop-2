"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JarvisLoader() {
  const router = useRouter();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const url = (event as CustomEvent<unknown>).detail;
      if (typeof url === "string" && url.startsWith("/")) router.push(url);
    };

    window.addEventListener("shopsphere:navigate", handleNavigate);
    if (!document.getElementById("shopsphere-jarvis-bootstrap")) {
      const script = document.createElement("script");
      script.id = "shopsphere-jarvis-bootstrap";
      script.type = "module";
      script.src = "/jarvis-bootstrap.js";
      document.head.append(script);
    }

    return () =>
      window.removeEventListener("shopsphere:navigate", handleNavigate);
  }, [router]);

  return null;
}