import { Suspense } from "react";
import { PixPaymentStep } from "@/components/checkout/PixPaymentStep";

export default function CheckoutPixPage() {
  return (
    <Suspense>
      <PixPaymentStep />
    </Suspense>
  );
}
