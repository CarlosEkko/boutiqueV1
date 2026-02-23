import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { products } from '../mock';
import { Check } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GlowText from './GlowText';
import { useLanguage } from '../i18n';
import translations from '../i18n/translations';

gsap.registerPlugin(ScrollTrigger);

const Products = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef([]);
  const { t, isRTL, language } = useLanguage();

  // Get translated products
  const translatedProducts = translations[language]?.products?.items || products.map((p) => ({
    title: p.title,
    description: p.description,
    features: p.features
  }));

  // Merge with images from mock
  const productsWithImages = translatedProducts.map((item, index) => ({
    ...item,
    id: index + 1,
    image: products[index]?.image || ''
  }));

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current.children,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Cards stagger animation
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 100,
            rotateY: -15,
            scale: 0.9
          },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            scale: 1,
            duration: 1,
            delay: index * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [language]);

  return (
    <section ref={sectionRef} id="products" className={`py-24 bg-black relative ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-black to-black" />
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-amber-950/50 text-amber-200 border-gold-600/30 px-4 py-1">
            <GlowText 
              text={t('products.badge')} 
              stagger={0.05}
              duration={0.8}
              glowColor="rgba(254, 243, 199, 0.9)"
            />
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            <GlowText 
              text={t('products.title')} 
              stagger={0.06}
              delay={0.2}
              glowColor="rgba(255, 255, 255, 0.8)"
            />
            <span className="block bg-gradient-to-r from-amber-200 via-gold-400 to-amber-200 bg-clip-text text-transparent mt-2">
              <GlowText 
                text={t('products.titleHighlight')} 
                stagger={0.06}
                delay={0.5}
                glowColor="rgba(217, 119, 6, 0.9)"
              />
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            <GlowText 
              text={t('products.description')} 
              stagger={0.02}
              delay={0.8}
              duration={0.5}
              glowColor="rgba(156, 163, 175, 0.8)"
            />
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {productsWithImages.map((product, index) => (
            <Card
              key={product.id}
              ref={(el) => (cardsRef.current[index] = el)}
              className="group relative bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/20 hover:border-gold-500/50 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-900/20"
            >
              <CardContent className="p-0">
                {/* Product Number Badge */}
                <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-20`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-amber-900/50">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Image Container */}
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${product.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6 relative">
                  <h3 className="text-2xl font-light text-white mb-3 group-hover:text-gold-400 transition-colors duration-300">
                    {product.title}
                  </h3>
                  <p className="text-gray-400 mb-4 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-2">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-sm text-gray-300`}>
                        <Check size={16} className="text-gold-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Hover effect line */}
                  <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
