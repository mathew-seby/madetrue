import Link from "next/link";
import { CreditCard, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      <div className="w-16 h-16 bg-warm-brown/10 text-warm-brown rounded-full flex items-center justify-center mx-auto">
        <CreditCard className="h-8 w-8" />
      </div>

      <h1 className="font-serif text-3xl font-bold text-text-dark">Checkout</h1>

      <p className="text-sm text-text-dark/70 max-w-md mx-auto leading-relaxed">
        Secure UPI payments and Cash on Delivery routing will be connected during the next phase of development.
      </p>

      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 border border-warm-brown/20 rounded-xl text-sm font-semibold text-warm-brown hover:bg-warm-brown/5 transition duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
