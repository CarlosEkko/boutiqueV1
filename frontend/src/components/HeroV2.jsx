import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { heroData } from '../mock';
import { useLanguage } from '../i18n';
import gsap from 'gsap';

// Utility to split text into spans for letter-by-letter animation
const splitTextIntoSpans = (text) => {
  return text.split('').map((char, i) => (
    <span 
      key={i} 
      className="inline-block hero-letter"
      style={{ opacity: 0 }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));
};

const HeroV2 = () => {
  const heroRef = useRef(null);
  const frame1Ref = useRef(null);
  const frame2Ref = useRef(null);
  const frame3Ref = useRef(null);
  const frame4Ref = useRef(null);
  const finalFrameRef = useRef(null);
  const finalContentRef = useRef(null);
  const [showFinalFrame, setShowFinalFrame] = useState(false);
  const [showFinalContent, setShowFinalContent] = useState(false);
  const { t, isRTL, language } = useLanguage();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const masterTimeline = gsap.timeline();

      // REDUCED TIMING - Frame 1: "The Boutique"
      masterTimeline
        .fromTo(
          frame1Ref.current,
          {
            opacity: 0,
            scale: 1.3,
            filter: 'blur(40px)',
          },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power2.out'
          }
        )
        .to(
          frame1Ref.current,
          {
            opacity: 0,
            scale: 0,
            filter: 'blur(50px)',
            duration: 0.5,
            ease: 'power2.in'
          },
          '+=0.6'
        );

      // Frame 2: "Exchange for" 
      masterTimeline
        .fromTo(
          frame2Ref.current,
          {
            opacity: 0,
            scale: 1.3,
            filter: 'blur(40px)',
          },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power2.out'
          },
          '-=0.2'
        )
        .to(
          frame2Ref.current,
          {
            opacity: 0,
            scale: 0,
            filter: 'blur(50px)',
            duration: 0.5,
            ease: 'power2.in'
          },
          '+=0.6'
        );

      // Frame 3: "Sophisticated"
      masterTimeline
        .fromTo(
          frame3Ref.current,
          {
            opacity: 0,
            scale: 1.3,
            filter: 'blur(40px)',
          },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power2.out'
          },
          '-=0.2'
        )
        .to(
          frame3Ref.current,
          {
            opacity: 0,
            scale: 0,
            filter: 'blur(50px)',
            duration: 0.5,
            ease: 'power2.in'
          },
          '+=0.6'
        );

      // Frame 4: "INVESTORS"
      masterTimeline
        .fromTo(
          frame4Ref.current,
          {
            opacity: 0,
            scale: 1.5,
            filter: 'blur(60px)',
          },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power2.out'
          },
          '-=0.2'
        )
        .to(
          frame4Ref.current,
          {
            opacity: 0,
            scale: 0.5,
            filter: 'blur(40px)',
            duration: 0.5,
            ease: 'power2.in'
          },
          '+=0.8'
        );

      // Show final frame with letter glow effect
      masterTimeline.call(() => {
        setShowFinalFrame(true);
      }, null, '-=0.1');

      // Animate letters
      masterTimeline.call(() => {
        const letters = finalFrameRef.current?.querySelectorAll('.hero-letter');
        if (letters && letters.length > 0) {
          gsap.fromTo(
            letters,
            {
              opacity: 0,
              textShadow: '0px 0px 1px rgba(165, 122, 80, 0.1)'
            },
            {
              opacity: 0.9,
              textShadow: '0px 0px 20px rgba(165, 122, 80, 0.0)',
              duration: 0.5,
              stagger: 0.03,
              ease: 'power2.out',
              onComplete: () => {
                // Fade out and show final content faster
                gsap.to(finalFrameRef.current, {
                  opacity: 0,
                  duration: 0.6,
                  delay: 1,
                  ease: 'power2.in',
                  onComplete: () => {
                    setShowFinalContent(true);
                  }
                });
              }
            }
          );
        }
      }, null, '+=0.05');

    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Animate final content when it appears
  useEffect(() => {
    if (showFinalContent && finalContentRef.current) {
      gsap.fromTo(
        finalContentRef.current,
        {
          opacity: 0,
          y: 30
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out'
        }
      );
    }
  }, [showFinalContent]);

  return (
    <section ref={heroRef} className={`relative min-h-screen flex items-center justify-center overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroData.backgroundImage})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
        <div 
          className="absolute inset-0" 
          style={{
            background: 'radial-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.3) 35%, rgba(0, 0, 0, 0.7))'
          }} 
        />
      </div>

      {/* Animated grain texture overlay */}
      <div className="absolute inset-0 z-10 opacity-20 mix-blend-soft-light bg-noise" />

      {/* Sequential Blur/Fade Text Frames */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        {/* Frame 1 */}
        <h1
          ref={frame1Ref}
          className="absolute text-6xl md:text-8xl lg:text-9xl font-extralight text-white opacity-0 text-center px-4"
          style={{ 
            willChange: 'opacity, transform, filter',
            textShadow: '0px 0px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          The Boutique
        </h1>

        {/* Frame 2 */}
        <h1
          ref={frame2Ref}
          className="absolute text-6xl md:text-8xl lg:text-9xl font-extralight text-white opacity-0 text-center px-4"
          style={{ 
            willChange: 'opacity, transform, filter',
            textShadow: '0px 0px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          Exchange for
        </h1>

        {/* Frame 3 */}
        <h1
          ref={frame3Ref}
          className="absolute text-6xl md:text-8xl lg:text-9xl font-extralight text-gold-400 opacity-0 text-center px-4"
          style={{ 
            willChange: 'opacity, transform, filter',
            textShadow: '0px 0px 1px rgba(165, 122, 80, 0.4)'
          }}
        >
          Sophisticated
        </h1>

        {/* Frame 4 */}
        <h1
          ref={frame4Ref}
          className="absolute text-7xl md:text-9xl lg:text-[11rem] font-extralight text-gold-400 opacity-0 text-center px-4"
          style={{ 
            willChange: 'opacity, transform, filter',
            textShadow: '0px 0px 1px rgba(165, 122, 80, 0.4)'
          }}
        >
          INVESTORS
        </h1>

        {/* Final Frame - Letter Glow Effect */}
        {showFinalFrame && (
          <div 
            ref={finalFrameRef}
            className="absolute text-center px-4"
          >
            <h1 
              className="glow-text-animate text-4xl md:text-6xl lg:text-7xl font-extralight text-gold-400 tracking-widest uppercase mb-4"
              style={{ textShadow: '0px 0px 1px rgba(165, 122, 80, 0.4)' }}
            >
              {splitTextIntoSpans('KBEX')}
            </h1>
            <p 
              className="glow-text-animate text-lg md:text-xl lg:text-2xl font-light text-gray-300 tracking-wider"
              style={{ textShadow: '0px 0px 1px rgba(255, 255, 255, 0.3)' }}
            >
              {splitTextIntoSpans('Premium Crypto Exchange')}
            </p>
          </div>
        )}
      </div>

      {/* Final content - TRANSLATED */}
      {showFinalContent && (
        <div 
          ref={finalContentRef} 
          className="relative z-30 container mx-auto px-6 text-center opacity-0"
          data-testid="hero-final-content"
        >
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Badge */}
            <div className={`inline-flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-6 py-3 rounded-full bg-gold-950/30 backdrop-blur-sm border border-gold-600/30`}>
              <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
              <span className="text-gold-200 text-sm tracking-wider font-medium">
                {t('hero.badge')}
              </span>
            </div>

            {/* Final title - TRANSLATED */}
            <h1 className="text-5xl md:text-7xl font-extralight text-white leading-tight tracking-wide">
              {t('hero.title')}
              <span className="block text-gold-400 mt-2">
                {t('hero.subtitle')}
              </span>
            </h1>

            {/* Description - TRANSLATED */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('hero.description')}
            </p>

            {/* CTA Buttons - TRANSLATED */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white border-none shadow-2xl shadow-gold-800/50 px-8 py-6 text-lg group transition-all duration-300 hover:scale-105"
                data-testid="hero-cta-primary"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className={`${isRTL ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform duration-300`} size={20} />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gold-500/50 text-gold-200 hover:bg-gold-950/30 hover:border-gold-400 backdrop-blur-sm px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
                data-testid="hero-cta-secondary"
              >
                {t('hero.ctaSecondary')}
              </Button>
            </div>

            {/* Trust indicators - TRANSLATED */}
            <div className={`pt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <div className="w-1 h-1 bg-gold-400 rounded-full" />
                <span>{t('hero.trustLicensed')}</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <div className="w-1 h-1 bg-gold-400 rounded-full" />
                <span>{t('hero.trustSecurity')}</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <div className="w-1 h-1 bg-gold-400 rounded-full" />
                <span>{t('hero.trustAuc')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for letter glow animation */}
      <style>{`
        .hero-letter {
          color: transparent;
          text-shadow: 0px 0px 1px rgba(165, 122, 80, 0.8);
        }
      `}</style>
    </section>
  );
};

export default HeroV2;
