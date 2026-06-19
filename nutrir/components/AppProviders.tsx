"use client";

import { CartProvider } from "@/lib/cart-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { ProfileProvider } from "@/lib/profile-context";
import { CartSidebar } from "@/components/CartSidebar";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <CheckoutProvider>
        <CartProvider>
          <AuthHashRedirect />
          {children}
          <CartSidebar />
        </CartProvider>
      </CheckoutProvider>
    </ProfileProvider>
  );
}
