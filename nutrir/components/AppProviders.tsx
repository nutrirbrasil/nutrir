"use client";

import { CartProvider } from "@/lib/cart-context";
import { ProfileProvider } from "@/lib/profile-context";
import { CartSidebar } from "@/components/CartSidebar";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <CartProvider>
        {children}
        <CartSidebar />
      </CartProvider>
    </ProfileProvider>
  );
}
