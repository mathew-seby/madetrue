import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function CartPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      <div className="w-16 h-16 bg-primary-green/10 text-primary-green rounded-full flex items-center justify-center mx-auto">
        <ShoppingBag className="h-8 w-8" />
      </div>

      <h1 className="font-serif text-3xl font-bold text-text-dark">Your Basket</h1>
      
      <p className="text-sm text-text-dark/70 max-w-md mx-auto leading-relaxed">
        This is where your organic crops, sun-dried spices, and hand-molded crafts will wait. Cart checkout operations will be integrated soon.
      </p>

      <div className="pt-4">
        <Link
          href="/products"
          className="inline-flex items-center justify-center px-5 py-2.5 border border-primary-green rounded-xl text-sm font-semibold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Explore Local Goods
        </Link>
      </div>
    </div>
  );
}
