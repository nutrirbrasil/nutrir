import { Suspense } from "react";
import { PendingPaymentStep } from "@/components/checkout/PendingPaymentStep";

export default function PendingPage() {
  return (
    <Suspense>
      <PendingPaymentStep />
    </Suspense>
  );
}
