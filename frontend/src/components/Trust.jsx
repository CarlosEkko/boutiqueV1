import React from 'react';
import { Card, CardContent } from './ui/card';
import { trustFactors, stats } from '../mock';
import { ShieldCheck, Lock, Crown, Globe } from 'lucide-react';

const iconMap = {
  'shield-check': ShieldCheck,
  'lock': Lock,
  'crown': Crown,
  'globe': Globe
};

const Trust = () => {
  return (
    <section id="trust" className="py-24 bg-black relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-2">
                <span className="text-4xl md:text-5xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent group-hover:scale-110 inline-block transition-transform duration-300">
                  {stat.value}
                </span>
              </div>
              <p className="text-gray-400 text-sm tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Trust Factors */}
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
            Why the Elite
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
              Choose Kryptobox
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            Uncompromising standards that set us apart in the digital asset space
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {trustFactors.map((factor, index) => {
            const IconComponent = iconMap[factor.icon];
            return (
              <Card
                key={factor.id}
                className="group bg-gradient-to-br from-zinc-900/50 to-black/50 border-amber-900/20 hover:border-amber-600/50 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-amber-900/20 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  {/* Icon */}
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
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
