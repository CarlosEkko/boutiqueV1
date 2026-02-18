import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  MapPin,
  Shield,
  Coins,
  Headset,
  Zap,
  TrendingUp,
  BarChart,
  Lock,
  Globe,
  Phone,
  ArrowRight,
  CheckCircle2,
  Crown
} from 'lucide-react';
import {
  atmHeroData,
  atmFeatures,
  howItWorks,
  atmLocations,
  atmBenefits
} from '../mockAtm';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const iconMap = {
  'map-pin': MapPin,
  'shield': Shield,
  'coins': Coins,
  'headset': Headset,
  'zap': Zap,
  'trending-up': TrendingUp,
  'bar-chart': BarChart,
  'lock': Lock,
  'globe': Globe,
  'phone': Phone
};

const CryptoATMPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const statsRef = useRef([]);
  const featuresRef = useRef([]);
  const stepsRef = useRef([]);
  const locationsRef = useRef([]);
  const benefitsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      const tl = gsap.timeline();
      tl.fromTo(
        heroRef.current.querySelectorAll('.hero-content > *'),
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out' }
      );

      // Stats animation
      statsRef.current.forEach((stat, index) => {
        gsap.fromTo(
          stat,
          { opacity: 0, scale: 0.5 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: stat,
              start: 'top 85%'
            }
          }
        );
      });

      // Features animation
      featuresRef.current.forEach((feature, index) => {
        gsap.fromTo(
          feature,
          { opacity: 0, x: index % 2 === 0 ? -100 : 100 },
          {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: feature,
              start: 'top 80%'
            }
          }
        );
      });

      // Steps animation
      stepsRef.current.forEach((step, index) => {
        gsap.fromTo(
          step,
          { opacity: 0, y: 60, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            delay: index * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
              start: 'top 85%'
            }
          }
        );
      });

      // Benefits grid animation
      benefitsRef.current.forEach((benefit, index) => {
        gsap.fromTo(
          benefit,
          { opacity: 0, y: 50, rotateX: -15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.6,
            delay: index * 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: benefit,
              start: 'top 85%'
            }
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-black min-h-screen">
      <Header />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-20"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://customer-assets.emergentagent.com/job_sovereign-exchange-1/artifacts/8oy0bqnz_image.png)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />

        <div className="relative z-10 container mx-auto px-6 text-center hero-content">
          <Badge className="mb-4 bg-amber-950/50 text-amber-200 border-amber-700/30 px-4 py-1">
            Crypto ATM Network
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extralight text-white mb-4 tracking-wide">
            {atmHeroData.title}
          </h1>
          
          <p className="text-xl md:text-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-6 font-light">
            {atmHeroData.subtitle}
          </p>
          
          <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            {atmHeroData.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-8 py-6 text-lg group"
            >
              Find Nearest ATM
              <MapPin className="ml-2 group-hover:scale-110 transition-transform" size={20} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/#contact')}
              className="border-2 border-amber-600/50 text-amber-200 hover:bg-amber-950/30 backdrop-blur-sm px-8 py-6 text-lg"
            >
              Request VIP Access
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {atmHeroData.stats.map((stat, index) => (
              <div
                key={index}
                ref={(el) => (statsRef.current[index] = el)}
                className="bg-zinc-900/50 backdrop-blur-sm border border-amber-900/20 rounded-lg p-4"
              >
                <div className="text-3xl font-light text-amber-400 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              Exclusive Features
              <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
                Premium Experience
              </span>
            </h2>
          </div>

          <div className="space-y-24 max-w-6xl mx-auto">
            {atmFeatures.map((feature, index) => {
              const IconComponent = iconMap[feature.icon];
              return (
                <div
                  key={feature.id}
                  ref={(el) => (featuresRef.current[index] = el)}
                  className={`flex flex-col ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  } items-center gap-12`}
                >
                  <div className="md:w-1/2">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-80 object-cover rounded-2xl shadow-2xl shadow-amber-900/20"
                    />
                  </div>
                  <div className="md:w-1/2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 mb-6">
                      <IconComponent className="text-amber-400" size={32} />
                    </div>
                    <h3 className="text-3xl font-light text-white mb-4">{feature.title}</h3>
                    <p className="text-gray-400 text-lg leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              How It Works
              <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
                Simple & Secure
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {howItWorks.map((item, index) => (
              <Card
                key={item.step}
                ref={(el) => (stepsRef.current[index] = el)}
                className="bg-gradient-to-br from-zinc-900/80 to-black/80 border-amber-900/20 hover:border-amber-600/50 transition-all duration-500"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-600/90 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h4 className="text-xl font-light text-white mb-3">{item.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-24 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              Global Network
              <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
                Premium Locations
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {atmLocations.map((location, locIndex) => (
              <Card
                key={location.region}
                ref={(el) => (locationsRef.current[locIndex] = el)}
                className="bg-gradient-to-br from-zinc-900/80 to-black/80 border-amber-900/20"
              >
                <CardContent className="p-6">
                  <h3 className="text-2xl font-light text-amber-400 mb-6">{location.region}</h3>
                  <div className="space-y-4">
                    {location.cities.map((city) => (
                      <div key={city.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MapPin size={16} className="text-amber-400" />
                          <div>
                            <div className="text-white font-light">{city.name}</div>
                            <div className="text-gray-500 text-xs">{city.country}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-amber-950/50 text-amber-200 text-xs">
                            {city.count} ATMs
                          </Badge>
                          {city.vip && <Crown size={14} className="text-amber-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              Why Choose Our ATMs
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {atmBenefits.map((benefit, index) => {
              const IconComponent = iconMap[benefit.icon];
              return (
                <Card
                  key={benefit.title}
                  ref={(el) => (benefitsRef.current[index] = el)}
                  className="bg-gradient-to-br from-zinc-900/50 to-black/50 border-amber-900/20 hover:border-amber-600/50 transition-all duration-500"
                >
                  <CardContent className="p-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-700/30 mb-4">
                      <IconComponent className="text-amber-400" size={24} />
                    </div>
                    <h4 className="text-lg font-light text-white mb-2">{benefit.title}</h4>
                    <p className="text-gray-400 text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-black to-zinc-950">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
              Ready to Experience
              <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mt-2">
                Premium Crypto Access?
              </span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join our exclusive network and enjoy institutional-grade crypto services at your fingertips
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/#contact')}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-10 py-6 text-lg group"
            >
              Apply for VIP Access
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CryptoATMPage;