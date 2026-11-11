import Link from "next/link";
import { Compass, ShoppingBag, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-cream-bg">
      <div className="max-w-md w-full bg-[#FAF7F2] border border-warm-brown/15 rounded-3xl p-8 sm:p-10 text-center shadow-sm space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-primary-green/10 border border-primary-green/20 text-primary-green flex items-center justify-center shadow-inner">
          <Compass className="h-8 w-8 text-primary-green" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-warm-brown uppercase tracking-widest font-sans">
            404 • Path Not Found
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-dark">
            This trail wandered off
          </h1>
          <p className="text-xs sm:text-sm text-text-dark/70 font-sans leading-relaxed">
            We couldn&apos;t locate the page, maker shop, or product you were looking for.
            Perhaps the fragrant spice breeze guided you down an uncharted country road!
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center font-sans">
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg text-xs font-bold uppercase tracking-wider hover:bg-[#224f3b] transition duration-200 shadow-sm"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Explore Local Goods
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-warm-brown/20 text-text-dark text-xs font-bold uppercase tracking-wider hover:bg-warm-brown/5 transition duration-200"
          >
            Home
            <ArrowRight className="ml-2 h-4 w-4 text-warm-brown" />
          </Link>
        </div>

        <div className="pt-4 border-t border-warm-brown/10">
          <p className="text-xs text-warm-brown font-medium italic font-serif">
            &ldquo;Every true flavor has a home in Kerala.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

