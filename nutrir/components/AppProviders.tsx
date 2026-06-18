"use client";

import { CartProvider } from "@/lib/cart-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { ProfileProvider } from "@/lib/profile-context";
import { CartSidebar } from "@/components/CartSidebar";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <CheckoutProvider>
        <CartProvider>
          {children}
          <CartSidebar />
        </CartProvider>
      </CheckoutProvider>
    </ProfileProvider>
  );
}
