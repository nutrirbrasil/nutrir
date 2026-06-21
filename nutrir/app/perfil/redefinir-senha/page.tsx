import { Suspense } from "react";
import { ProfilePage } from "@/components/ProfilePage";

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-10 text-center text-nutrir-emerald/70">
          Carregando…
        </div>
      }
    >
      <ProfilePage />
    </Suspense>
  );
}
