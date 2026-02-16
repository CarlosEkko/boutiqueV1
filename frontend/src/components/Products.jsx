import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { products } from '../mock';
import { Check } from 'lucide-react';

const Products = () => {
  return (
    <section id="products" className="py-24 bg-gradient-to-b from-black via-zinc-950 to-black relative">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-amber-950/50 text-amber-200 border-amber-700/30 px-4 py-1">
            Premium Services
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tailored for
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
              Exceptional Clients
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            Four pillars of excellence designed exclusively for institutional and high-net-worth investors
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {products.map((product, index) => (
            <Card
              key={product.id}
              className="group bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/20 hover:border-amber-700/50 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-900/20 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Floating number badge */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-amber-600/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>

              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors duration-300">
                  {product.title}
                </h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  {product.description}
                </p>

                {/* Features */}
                <div className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-amber-950/50 border border-amber-700/30 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-amber-400" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Hover effect line */}
                <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
