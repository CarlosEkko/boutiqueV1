import React from 'react';
import { Badge } from './ui/badge';
import { MapPin } from 'lucide-react';
import GlowText from './GlowText';
import { useLanguage } from '../i18n';

const Regions = () => {
  const { t, isRTL } = useLanguage();

  // Translated regions
  const translatedRegions = [
    { name: t('regions.europe'), description: t('regions.europeDesc') },
    { name: t('regions.middleEast'), description: t('regions.middleEastDesc') },
    { name: t('regions.brazil'), description: t('regions.brazilDesc') }
  ];

  return (
    <section id="regions" className={`py-24 bg-gradient-to-b from-black via-zinc-950 to-black relative ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-gold-950/50 text-gold-200 border-gold-600/30 px-4 py-1">
            <GlowText 
              text={t('regions.badge')} 
              stagger={0.05}
              duration={0.8}
              glowColor="rgba(196, 168, 122, 0.5)"
            />
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            <GlowText 
              text={t('regions.title')} 
              stagger={0.06}
              delay={0.2}
              glowColor="rgba(255, 255, 255, 0.4)"
            />
            <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mt-2">
              <GlowText 
                text={t('regions.titleHighlight')} 
                stagger={0.06}
                delay={0.5}
                glowColor="rgba(165, 122, 80, 0.5)"
              />
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            <GlowText 
              text={t('regions.description')} 
              stagger={0.02}
              delay={0.8}
              duration={0.5}
              glowColor="rgba(156, 163, 175, 0.4)"
            />
          </p>
        </div>

        {/* Regions Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {translatedRegions.map((region, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-zinc-900/80 to-black/80 border border-gold-800/20 hover:border-gold-500/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gold-800/20 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Decorative corner */}
              <div className={`absolute top-0 ${isRTL ? 'left-0 rounded-br-full' : 'right-0 rounded-bl-full'} w-24 h-24 bg-gradient-to-br from-gold-500/10 to-transparent`} />

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/20 border border-gold-600/30 group-hover:scale-110 transition-transform duration-500">
                  <MapPin className="text-gold-400" size={24} />
                </div>

                {/* Region Name */}
                <h3 className="text-2xl font-light text-white mb-3 group-hover:text-gold-400 transition-colors duration-300">
                  {region.name}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {region.description}
                </p>
              </div>

              {/* Hover effect line */}
              <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Regions;
