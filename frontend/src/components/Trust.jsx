import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { trustFactors, stats } from '../mock';
import { ShieldCheck, Lock, Crown, Globe } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GlowText from './GlowText';
import { useLanguage } from '../i18n';

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
  const { t, isRTL } = useLanguage();

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
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
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
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Translated stats
  const translatedStats = [
    { value: t('trust.stats.auc'), label: t('trust.stats.aucLabel') },
    { value: t('trust.stats.clients'), label: t('trust.stats.clientsLabel') },
    { value: t('trust.stats.uptime'), label: t('trust.stats.uptimeLabel') },
    { value: t('trust.stats.support'), label: t('trust.stats.supportLabel') }
  ];

  // Translated trust factors
  const translatedFactors = [
    { icon: 'shield-check', title: t('trust.regulated'), description: t('trust.regulatedDesc') },
    { icon: 'lock', title: t('trust.security'), description: t('trust.securityDesc') },
    { icon: 'crown', title: t('trust.exclusive'), description: t('trust.exclusiveDesc') },
    { icon: 'globe', title: t('trust.global'), description: t('trust.globalDesc') }
  ];

  return (
    <section ref={sectionRef} id="trust" className={`py-24 bg-gradient-to-b from-black via-zinc-950 to-black ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {translatedStats.map((stat, index) => (
            <div
              key={index}
              ref={(el) => (statsRef.current[index] = el)}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400 tracking-wider uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Factors */}
        <div ref={headerRef} className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            <GlowText 
              text={t('trust.title')} 
              as="span"
              stagger={0.05}
              glowColor="rgba(255, 255, 255, 0.8)"
            />
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
              <GlowText 
                text={t('trust.titleHighlight')} 
                stagger={0.05}
                delay={0.5}
                glowColor="rgba(217, 119, 6, 0.9)"
              />
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            <GlowText 
              text={t('trust.description')} 
              stagger={0.02}
              delay={1}
              duration={0.5}
              glowColor="rgba(156, 163, 175, 0.8)"
            />
          </p>
        </div>

        {/* Trust Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {translatedFactors.map((factor, index) => {
            const IconComponent = iconMap[factor.icon];
            return (
              <Card
                key={index}
                ref={(el) => (cardsRef.current[index] = el)}
                className="group bg-gradient-to-br from-zinc-900/80 to-black/80 border-amber-900/20 hover:border-amber-600/50 overflow-hidden transition-all duration-500 hover:scale-105"
              >
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <IconComponent className="text-amber-400" size={28} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-light text-white mb-3 group-hover:text-amber-400 transition-colors duration-300">
                    {factor.title}
                  </h3>

                  {/* Description */}
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
