import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] to-cream-bg pt-16 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 rounded-full bg-primary-green/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 rounded-full bg-accent-gold/5 blur-3xl" />

      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8 items-center">
        {/* Text Area */}
        <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left space-y-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary-green/10 text-primary-green text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Hyperlocal Community Market</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-dark leading-tight">
            Real stories. <br />
            <span className="text-primary-green">Pure tastes.</span> <br />
            Direct from Kerala.
          </h1>

          <p className="text-base sm:text-lg text-text-dark/85 leading-relaxed max-w-xl">
            MADETRUE connects you directly with independent spice farmers in Idukki, backyard clay pot makers in Nilambur, and grandmother's kitchens in Alappuzha. Shop fresh, support families, trace every origin.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-cream-bg bg-primary-green hover:bg-[#224f3b] shadow-md hover:shadow-lg transition duration-200"
            >
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#meet-makers"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-warm-brown/30 text-sm font-semibold rounded-xl text-warm-brown hover:bg-warm-brown/5 hover:border-warm-brown/60 transition duration-200"
            >
              Meet the Maker
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-warm-brown/10 pt-6 text-left max-w-md mx-auto lg:mx-0">
            <div>
              <span className="block font-serif text-2xl font-bold text-primary-green">100%</span>
              <span className="text-xs text-text-dark/70">Traceable Origin</span>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold text-primary-green">Within 15km</span>
              <span className="text-xs text-text-dark/70">Hyperlocal Radius</span>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold text-primary-green">No Stock</span>
              <span className="text-xs text-text-dark/70">Only Real Producers</span>
            </div>
          </div>
        </div>

        {/* Image Area */}
        <div className="mt-12 sm:mt-16 lg:mt-0 lg:col-span-6 flex justify-center">
          <div className="relative w-full max-w-md lg:max-w-none">
            {/* Main picture */}
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border-4 border-cream-bg">
              <img
                src="https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=80"
                alt="Traditional Kerala Spices drying"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Accent badge floating */}
            <div className="absolute -bottom-6 -left-6 bg-accent-gold text-text-dark px-5 py-4 rounded-xl shadow-lg border border-cream-bg max-w-[200px] hidden sm:block">
              <p className="font-serif text-sm font-bold">"Sun-cured cardamoms, hand-picked in Idukki."</p>
              <span className="text-[10px] uppercase font-bold text-warm-brown mt-1.5 block">— Kannan's Farm</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
