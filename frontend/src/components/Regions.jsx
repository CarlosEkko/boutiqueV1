import React from 'react';
import { Badge } from './ui/badge';
import { MapPin } from 'lucide-react';
import { regions } from '../mock';
import GlowText from './GlowText';

const Regions = () => {
  return (
    <section id="regions" className="py-24 bg-gradient-to-b from-black via-zinc-950 to-black relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-amber-950/50 text-amber-200 border-amber-700/30 px-4 py-1">
            <GlowText 
              text="Global Presence" 
              stagger={0.04}
              duration={0.6}
              glowColor="rgba(254, 243, 199, 0.9)"
            />
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            <GlowText 
              text="Serving Excellence" 
              as="span"
              stagger={0.05}
              delay={0.3}
              glowColor="rgba(255, 255, 255, 0.8)"
            />
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
              <GlowText 
                text="Across Three Continents" 
                stagger={0.05}
                delay={0.8}
                glowColor="rgba(217, 119, 6, 0.9)"
              />
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            <GlowText 
              text="Local expertise with global reach - where you need us, when you need us" 
              stagger={0.02}
              delay={1.3}
              duration={0.5}
              glowColor="rgba(156, 163, 175, 0.8)"
            />
          </p>
        </div>

        {/* Regions Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {regions.map((region, index) => (
            <div
              key={region.name}
              className="group relative bg-gradient-to-br from-zinc-900/80 to-black/80 border border-amber-900/20 hover:border-amber-600/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-amber-900/20 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/10 to-transparent rounded-bl-full" />

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 group-hover:scale-110 transition-transform duration-500">
                  <MapPin className="text-amber-400" size={24} />
                </div>

                {/* Region Name */}
                <h3 className="text-2xl font-light text-white mb-3 group-hover:text-amber-400 transition-colors duration-300">
                  {region.name}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {region.description}
                </p>
              </div>

              {/* Hover effect line */}
              <div className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Regions;
