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
  const heroImageRef = useRef(null);
  const statsRef = useRef([]);
  const featuresRef = useRef([]);
  const stepsRef = useRef([]);
  const locationsRef = useRef([]);
  const benefitsRef = useRef([]);
  const ctaSectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero parallax background
      gsap.to(heroImageRef.current, {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        }
      });

      // Hero content animation
      const heroTl = gsap.timeline();
      heroTl
        .fromTo(
          heroRef.current.querySelector('.hero-badge'),
          { opacity: 0, scale: 0.8, y: -30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }
        )
        .fromTo(
          heroRef.current.querySelector('h1'),
          { opacity: 0, y: 60, rotateX: -20 },
          { opacity: 1, y: 0, rotateX: 0, duration: 1.2, ease: 'power3.out' },
          '-=0.4'
        )
        .fromTo(
          heroRef.current.querySelectorAll('.hero-text'),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out' },
          '-=0.8'
        )
        .fromTo(
          heroRef.current.querySelectorAll('.hero-button'),
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.15, ease: 'back.out(1.4)' },
          '-=0.4'
        );

      // Stats counter animation with bounce
      statsRef.current.forEach((stat, index) => {
        const numberElement = stat.querySelector('.stat-number');
        
        gsap.fromTo(
          stat,
          { 
            opacity: 0, 
            scale: 0.3,
            y: 50,
            rotateY: -90
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            rotateY: 0,
            duration: 1,
            delay: index * 0.15,
            ease: 'elastic.out(1, 0.5)',
            scrollTrigger: {
              trigger: stat,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Number morphing animation
        if (numberElement) {
          gsap.fromTo(
            numberElement,
            { scale: 0.5, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.8,
              delay: index * 0.15 + 0.3,
              ease: 'elastic.out(1, 0.8)',
              scrollTrigger: {
                trigger: stat,
                start: 'top 85%'
              }
            }
          );
        }
      });

      // Features with magnetic hover and 3D effects
      featuresRef.current.forEach((feature, index) => {
        const image = feature.querySelector('img');
        const content = feature.querySelector('.feature-content');
        const icon = feature.querySelector('.feature-icon');

        // Entry animation
        gsap.fromTo(
          feature,
          { 
            opacity: 0, 
            x: index % 2 === 0 ? -150 : 150,
            rotateY: index % 2 === 0 ? -30 : 30
          },
          {
            opacity: 1,
            x: 0,
            rotateY: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: feature,
              start: 'top 80%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Image zoom on scroll
        if (image) {
          gsap.fromTo(
            image,
            { scale: 1.2 },
            {
              scale: 1,
              duration: 1.5,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: feature,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }

        // Icon rotation on entry
        if (icon) {
          gsap.fromTo(
            icon,
            { rotation: -180, scale: 0 },
            {
              rotation: 0,
              scale: 1,
              duration: 1,
              ease: 'back.out(2)',
              scrollTrigger: {
                trigger: feature,
                start: 'top 80%'
              }
            }
          );
        }

        // Mouse move parallax effect
        feature.addEventListener('mousemove', (e) => {
          const rect = feature.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;

          gsap.to(image, {
            x: x * 20,
            y: y * 20,
            rotateY: x * 10,
            rotateX: -y * 10,
            duration: 0.5,
            ease: 'power2.out'
          });

          gsap.to(content, {
            x: x * 10,
            y: y * 10,
            duration: 0.5,
            ease: 'power2.out'
          });
        });

        feature.addEventListener('mouseleave', () => {
          gsap.to([image, content], {
            x: 0,
            y: 0,
            rotateY: 0,
            rotateX: 0,
            duration: 0.5,
            ease: 'power2.out'
          });
        });
      });

      // Steps with cascading animation
      stepsRef.current.forEach((step, index) => {
        const numberCircle = step.querySelector('.step-number');

        gsap.fromTo(
          step,
          { 
            opacity: 0, 
            y: 100,
            scale: 0.8,
            rotateX: -30
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 1,
            delay: index * 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Number pulse animation
        if (numberCircle) {
          gsap.fromTo(
            numberCircle,
            { scale: 0, rotation: -180 },
            {
              scale: 1,
              rotation: 0,
              duration: 0.8,
              delay: index * 0.2 + 0.3,
              ease: 'elastic.out(1, 0.6)',
              scrollTrigger: {
                trigger: step,
                start: 'top 85%'
              }
            }
          );

          // Continuous pulse on hover
          step.addEventListener('mouseenter', () => {
            gsap.to(numberCircle, {
              scale: 1.2,
              duration: 0.3,
              ease: 'power2.out'
            });
          });

          step.addEventListener('mouseleave', () => {
            gsap.to(numberCircle, {
              scale: 1,
              duration: 0.3,
              ease: 'power2.out'
            });
          });
        }
      });

      // Locations with wave effect
      locationsRef.current.forEach((location, index) => {
        gsap.fromTo(
          location,
          {
            opacity: 0,
            y: 80,
            rotateY: -20,
            scale: 0.9
          },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            scale: 1,
            duration: 1,
            delay: index * 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: location,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Floating animation on hover
        location.addEventListener('mouseenter', () => {
          gsap.to(location, {
            y: -15,
            scale: 1.05,
            boxShadow: '0 20px 60px rgba(165, 122, 80, 0.3)',
            duration: 0.4,
            ease: 'power2.out'
          });
        });

        location.addEventListener('mouseleave', () => {
          gsap.to(location, {
            y: 0,
            scale: 1,
            boxShadow: '0 0 0 rgba(165, 122, 80, 0)',
            duration: 0.4,
            ease: 'power2.out'
          });
        });
      });

      // Benefits grid with stagger and rotation
      benefitsRef.current.forEach((benefit, index) => {
        const icon = benefit.querySelector('.benefit-icon');

        gsap.fromTo(
          benefit,
          { 
            opacity: 0, 
            y: 60,
            rotateX: -20,
            scale: 0.85
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
              trigger: benefit,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Icon spin on entry
        if (icon) {
          gsap.fromTo(
            icon,
            { rotation: -360, scale: 0 },
            {
              rotation: 0,
              scale: 1,
              duration: 1,
              delay: index * 0.1 + 0.2,
              ease: 'back.out(2)',
              scrollTrigger: {
                trigger: benefit,
                start: 'top 85%'
              }
            }
          );
        }

        // Hover effects
        benefit.addEventListener('mouseenter', () => {
          gsap.to(benefit, {
            y: -10,
            scale: 1.05,
            duration: 0.3,
            ease: 'power2.out'
          });

          if (icon) {
            gsap.to(icon, {
              rotation: 360,
              scale: 1.3,
              duration: 0.6,
              ease: 'power2.out'
            });
          }
        });

        benefit.addEventListener('mouseleave', () => {
          gsap.to(benefit, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: 'power2.out'
          });

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

      // CTA Section with reveal animation
      if (ctaSectionRef.current) {
        gsap.fromTo(
          ctaSectionRef.current.querySelectorAll('.cta-content > *'),
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaSectionRef.current,
              start: 'top 75%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
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
          ref={heroImageRef}
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(https://customer-assets.emergentagent.com/job_sovereign-exchange-1/artifacts/8oy0bqnz_image.png)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />

        <div className="relative z-10 container mx-auto px-6 text-center hero-content">
          <Badge className="hero-badge mb-4 bg-gold-950/50 text-gold-200 border-gold-600/30 px-4 py-1">
            Crypto ATM Network
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extralight text-white mb-4 tracking-wide">
            {atmHeroData.title}
          </h1>
          
          <p className="hero-text text-xl md:text-2xl bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mb-6 font-light">
            {atmHeroData.subtitle}
          </p>
          
          <p className="hero-text text-lg text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            {atmHeroData.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="hero-button bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white px-8 py-6 text-lg group"
            >
              Find Nearest ATM
              <MapPin className="ml-2 group-hover:scale-110 transition-transform" size={20} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/#contact')}
              className="hero-button border-2 border-gold-500/50 text-gold-200 hover:bg-gold-950/30 backdrop-blur-sm px-8 py-6 text-lg"
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
                className="bg-zinc-900/50 backdrop-blur-sm border border-gold-800/20 rounded-lg p-4"
              >
                <div className="stat-number text-3xl font-light text-gold-400 mb-1">{stat.value}</div>
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
              <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mt-2">
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
                  <div className="md:w-1/2 overflow-hidden rounded-2xl">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-80 object-cover shadow-2xl shadow-gold-800/20"
                    />
                  </div>
                  <div className="md:w-1/2 feature-content">
                    <div className="feature-icon inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/20 border border-gold-600/30 mb-6">
                      <IconComponent className="text-gold-400" size={32} />
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
              <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mt-2">
                Simple & Secure
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {howItWorks.map((item, index) => (
              <Card
                key={item.step}
                ref={(el) => (stepsRef.current[index] = el)}
                className="bg-gradient-to-br from-zinc-900/80 to-black/80 border-gold-800/20 hover:border-gold-500/50 transition-all duration-500"
              >
                <CardContent className="p-6 text-center">
                  <div className="step-number w-12 h-12 rounded-full bg-gold-500/90 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
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
              <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mt-2">
                Premium Locations
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {atmLocations.map((location, locIndex) => (
              <Card
                key={location.region}
                ref={(el) => (locationsRef.current[locIndex] = el)}
                className="bg-gradient-to-br from-zinc-900/80 to-black/80 border-gold-800/20"
              >
                <CardContent className="p-6">
                  <h3 className="text-2xl font-light text-gold-400 mb-6">{location.region}</h3>
                  <div className="space-y-4">
                    {location.cities.map((city) => (
                      <div key={city.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MapPin size={16} className="text-gold-400" />
                          <div>
                            <div className="text-white font-light">{city.name}</div>
                            <div className="text-gray-500 text-xs">{city.country}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gold-950/50 text-gold-200 text-xs">
                            {city.count} ATMs
                          </Badge>
                          {city.vip && <Crown size={14} className="text-gold-400" />}
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
                  className="bg-gradient-to-br from-zinc-900/50 to-black/50 border-gold-800/20 hover:border-gold-500/50 transition-all duration-500"
                >
                  <CardContent className="p-6">
                    <div className="benefit-icon inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/20 border border-gold-600/30 mb-4">
                      <IconComponent className="text-gold-400" size={24} />
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
      <section ref={ctaSectionRef} className="py-24 bg-gradient-to-b from-black to-zinc-950">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto cta-content">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
              Ready to Experience
              <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent mt-2">
                Premium Crypto Access?
              </span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Join our exclusive network and enjoy institutional-grade crypto services at your fingertips
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/#contact')}
              className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white px-10 py-6 text-lg group"
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

