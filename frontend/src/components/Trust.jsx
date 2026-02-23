import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { trustFactors, stats } from '../mock';
import { ShieldCheck, Lock, Crown, Globe } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GlowText from './GlowText';

gsap.registerPlugin(ScrollTrigger);

const iconMap = {
  'shield-check': ShieldCheck,
  'lock': Lock,
  'crown': Crown,
  'globe': Globe
};

const Trust = () => {
  const sectionRef = useRef(null);
  const statsRef = useRef([]);
  const headerRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stats counter animation
      statsRef.current.forEach((stat, index) => {
        gsap.fromTo(
          stat,
          { opacity: 0, scale: 0.5, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: stat,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      });

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

      // Cards animation
      cardsRef.current.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 80,
            rotateX: -20,
            scale: 0.8
          },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.8,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Hover animation
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            y: -15,
            scale: 1.05,
            duration: 0.4,
            ease: 'power2.out'
          });
          
          const icon = card.querySelector('.trust-icon');
          if (icon) {
            gsap.to(icon, {
              rotation: 360,
              scale: 1.2,
              duration: 0.6,
              ease: 'back.out(1.7)'
            });
          }
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power2.out'
          });
          
          const icon = card.querySelector('.trust-icon');
          if (icon) {
            gsap.to(icon, {
              rotation: 0,
              scale: 1,
              duration: 0.4,
              ease: 'power2.out'
            });
          }
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="trust" className="py-24 bg-black relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              ref={(el) => (statsRef.current[index] = el)}
              className="text-center group"
            >
              <div className="mb-2">
                <span className="text-4xl md:text-5xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent inline-block">
                  {stat.value}
                </span>
              </div>
              <p className="text-gray-400 text-sm tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trust Factors */}
        <div ref={headerRef} className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            <GlowText 
              text="Why the Elite" 
              as="span"
              stagger={0.05}
              glowColor="rgba(255, 255, 255, 0.8)"
            />
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
              <GlowText 
                text="Choose Kryptobox" 
                stagger={0.05}
                delay={0.5}
                glowColor="rgba(217, 119, 6, 0.9)"
              />
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            <GlowText 
              text="Uncompromising standards that set us apart in the digital asset space" 
              stagger={0.02}
              delay={1}
              duration={0.5}
              glowColor="rgba(156, 163, 175, 0.8)"
            />
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {trustFactors.map((factor, index) => {
            const IconComponent = iconMap[factor.icon];
            return (
              <Card
                key={factor.id}
                ref={(el) => (cardsRef.current[index] = el)}
                className="group bg-gradient-to-br from-zinc-900/50 to-black/50 border-amber-900/20 hover:border-amber-600/50 backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-amber-900/20"
              >
                <CardContent className="p-6 text-center">
                  {/* Icon */}
                  <div className="trust-icon mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 transition-all duration-500">
                    <IconComponent className="text-amber-400" size={28} />
                  </div>

                  <h3 className="text-xl font-light text-white mb-3 group-hover:text-amber-400 transition-colors duration-300">
                    {factor.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {factor.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Trust;
