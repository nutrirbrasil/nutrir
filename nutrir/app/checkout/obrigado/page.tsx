import { Suspense } from "react";
import { OrderThankYouStep } from "@/components/checkout/OrderThankYouStep";

export default function CheckoutObrigadoPage() {
  return (
    <Suspense>
      <OrderThankYouStep />
    </Suspense>
  );
}
