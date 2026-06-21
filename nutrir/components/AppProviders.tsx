"use client";

import { CartProvider } from "@/lib/cart-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { ProfileProvider } from "@/lib/profile-context";
import { AddonsFlowProvider } from "@/lib/addons-flow-context";
import { CartSidebar } from "@/components/CartSidebar";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <CheckoutProvider>
        <CartProvider>
          <AddonsFlowProvider>
            <AuthHashRedirect />
            {children}
            <CartSidebar />
          </AddonsFlowProvider>
        </CartProvider>
      </CheckoutProvider>
    </ProfileProvider>
  );
}
