import { Suspense } from "react";
import { CheckoutSuccessStep } from "@/components/checkout/CheckoutSuccessStep";

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessStep />
    </Suspense>
  );
}
