import { Suspense } from "react";
import { AuthCallbackClient } from "@/components/AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-nutrir-emerald/70">
          Confirmando login…
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
