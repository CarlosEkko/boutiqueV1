import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { heroData } from '../mock';
import gsap from 'gsap';

const Hero = () => {
  const heroRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const line3Ref = useRef(null);
  const line4Ref = useRef(null);
  const finalContentRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Sequential text animation with blur/scale effect
      const tl = gsap.timeline();

      // Line 1: "The Boutique"
      tl.fromTo(
        line1Ref.current,
        {
          opacity: 0,
          scale: 1.3,
          filter: 'blur(40px)',
          textShadow: '0px 0px 40px rgba(217, 119, 6, 0.8)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          textShadow: '0px 0px 1px rgba(217, 119, 6, 0.3)',
          duration: 1,
          ease: 'power3.out'
        }
      )
      .to(
        line1Ref.current,
        {
          opacity: 0,
          scale: 0,
          filter: 'blur(50px)',
          textShadow: '0px 0px 50px rgba(217, 119, 6, 0.8)',
          duration: 0.8,
          ease: 'power3.in'
        },
        '+=1.5'
      );

      // Line 2: "Exchange for"
      tl.fromTo(
        line2Ref.current,
        {
          opacity: 0,
          scale: 1.3,
          filter: 'blur(40px)',
          textShadow: '0px 0px 40px rgba(255, 255, 255, 0.8)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          textShadow: '0px 0px 1px rgba(255, 255, 255, 0.3)',
          duration: 1,
          ease: 'power3.out'
        },
        '-=0.3'
      )
      .to(
        line2Ref.current,
        {
          opacity: 0,
          scale: 0,
          filter: 'blur(50px)',
          textShadow: '0px 0px 50px rgba(255, 255, 255, 0.8)',
          duration: 0.8,
          ease: 'power3.in'
        },
        '+=1.5'
      );

      // Line 3: "Sophisticated"
      tl.fromTo(
        line3Ref.current,
        {
          opacity: 0,
          scale: 1.3,
          filter: 'blur(40px)',
          textShadow: '0px 0px 40px rgba(217, 119, 6, 1)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          textShadow: '0px 0px 2px rgba(217, 119, 6, 0.5)',
          duration: 1,
          ease: 'power3.out'
        },
        '-=0.3'
      )
      .to(
        line3Ref.current,
        {
          opacity: 0,
          scale: 0,
          filter: 'blur(50px)',
          textShadow: '0px 0px 50px rgba(217, 119, 6, 1)',
          duration: 0.8,
          ease: 'power3.in'
        },
        '+=1.5'
      );

      // Line 4: "INVESTORS" (large)
      tl.fromTo(
        line4Ref.current,
        {
          opacity: 0,
          scale: 1.5,
          filter: 'blur(60px)',
          textShadow: '0px 0px 60px rgba(217, 119, 6, 1)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          textShadow: '0px 0px 3px rgba(217, 119, 6, 0.6)',
          duration: 1.2,
          ease: 'power3.out'
        },
        '-=0.3'
      )
      .to(
        line4Ref.current,
        {
          opacity: 0,
          scale: 0.5,
          filter: 'blur(40px)',
          duration: 0.8,
          ease: 'power3.in'
        },
        '+=1.8'
      );

      // Final content fade in
      tl.fromTo(
        finalContentRef.current,
        {
          opacity: 0,
          y: 30
        },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: 'power3.out'
        },
        '-=0.5'
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroData.backgroundImage})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-radial-gradient opacity-70" style={{
          background: 'radial-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.3) 35%, rgba(0, 0, 0, 0.7))'
        }} />
      </div>

      {/* Animated grain texture overlay */}
      <div className="absolute inset-0 z-10 opacity-30 mix-blend-soft-light bg-noise" />

      {/* Sequential animated text lines */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <h1
          ref={line1Ref}
          className="absolute text-7xl md:text-9xl font-extralight text-white opacity-0"
          style={{ willChange: 'opacity, transform, filter' }}
        >
          The Boutique
        </h1>

        <h1
          ref={line2Ref}
          className="absolute text-7xl md:text-9xl font-extralight text-white opacity-0"
          style={{ willChange: 'opacity, transform, filter' }}
        >
          Exchange for
        </h1>

        <h1
          ref={line3Ref}
          className="absolute text-7xl md:text-9xl font-extralight text-amber-400 opacity-0"
          style={{ willChange: 'opacity, transform, filter' }}
        >
          Sophisticated
        </h1>

        <h1
          ref={line4Ref}
          className="absolute text-8xl md:text-[12rem] font-extralight text-amber-400 opacity-0"
          style={{ willChange: 'opacity, transform, filter' }}
        >
          INVESTORS
        </h1>
      </div>

      {/* Final content */}
      <div ref={finalContentRef} className="relative z-30 container mx-auto px-6 text-center opacity-0">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-amber-950/30 backdrop-blur-sm border border-amber-700/30">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-amber-200 text-sm tracking-wider font-medium">
              EXCLUSIVE ACCESS • INSTITUTIONAL GRADE
            </span>
          </div>

          {/* Final title */}
          <h1 className="text-5xl md:text-7xl font-extralight text-white leading-tight tracking-wide">
            {heroData.title}
            <span className="block text-amber-400 mt-2">
              {heroData.subtitle}
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {heroData.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-2xl shadow-amber-900/50 px-8 py-6 text-lg group transition-all duration-300 hover:scale-105"
            >
              {heroData.cta.primary}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-amber-600/50 text-amber-200 hover:bg-amber-950/30 hover:border-amber-500 backdrop-blur-sm px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
            >
              {heroData.cta.secondary}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="pt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-amber-400 rounded-full" />
              <span>Licensed & Regulated</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-amber-400 rounded-full" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-amber-400 rounded-full" />
              <span>$2.5B+ AUC</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
