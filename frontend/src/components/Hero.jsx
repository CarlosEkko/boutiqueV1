import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { heroData } from '../mock';
import gsap from 'gsap';
import { animateTextChars } from '../utils/textAnimations';

const Hero = () => {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const descriptionRef = useRef(null);
  const ctaRef = useRef(null);
  const trustRef = useRef(null);
  const badgeRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Badge animation
      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8 }
      );

      // Animate title by character with 3D flip effect
      const titleLine1 = titleRef.current.querySelector('.title-line-1');
      const titleLine2 = titleRef.current.querySelector('.title-line-2');
      
      if (titleLine1) {
        animateTextChars.flip3D(titleLine1, {
          duration: 0.6,
          stagger: 0.03,
          delay: 0.3
        });
      }
      
      if (titleLine2) {
        animateTextChars.flip3D(titleLine2, {
          duration: 0.6,
          stagger: 0.025,
          delay: 0.9
        });
      }

      // Description
      tl.fromTo(
        descriptionRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.4'
      );

      // CTA buttons
      tl.fromTo(
        ctaRef.current.children,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15 },
        '-=0.3'
      );

      // Trust indicators
      tl.fromTo(
        trustRef.current.children,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 },
        '-=0.2'
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
      </div>

      {/* Animated grain texture overlay */}
      <div className="absolute inset-0 z-10 opacity-30 mix-blend-soft-light bg-noise" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div ref={badgeRef} className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-amber-950/30 backdrop-blur-sm border border-amber-700/30">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-amber-200 text-sm tracking-wider font-medium">
              EXCLUSIVE ACCESS • INSTITUTIONAL GRADE
            </span>
          </div>

          {/* Main Heading with character animation */}
          <h1 ref={titleRef} className="text-5xl md:text-7xl lg:text-8xl font-extralight leading-tight tracking-wide">
            <span className="title-line-1 block text-white mb-2">{heroData.title}</span>
            <span className="title-line-2 block text-amber-400 mb-2">{heroData.subtitle}</span>
          </h1>

          {/* Description */}
          <p ref={descriptionRef} className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {heroData.description}
          </p>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
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
          <div ref={trustRef} className="pt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
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

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
        <a href="#products" className="flex flex-col items-center space-y-2 text-amber-400 hover:text-amber-300 transition-colors duration-300">
          <span className="text-xs tracking-wider">EXPLORE</span>
          <ChevronDown size={24} />
        </a>
      </div>
    </section>
  );
};

export default Hero;
