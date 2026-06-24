import { redirect } from "next/navigation";

export default function PixThankYouRedirect({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const order = searchParams.order?.trim();
  if (!order) {
    redirect("/checkout/obrigado");
  }
  redirect(`/checkout/obrigado?order=${encodeURIComponent(order)}`);
}
