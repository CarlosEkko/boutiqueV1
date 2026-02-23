import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GlowText Component - Letter-by-letter glow animation
 * Text is always visible, glow effect animates on scroll
 */
const GlowText = ({ 
  text, 
  className = '', 
  as: Tag = 'span',
  delay = 0,
  stagger = 0.04,
  duration = 0.6,
  glowColor = 'rgba(217, 119, 6, 0.9)',
  triggerOnScroll = true,
  triggerStart = 'top 85%'
}) => {
  const containerRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isReady || hasAnimatedRef.current) return;

    const letters = containerRef.current.querySelectorAll('.glow-letter');
    if (letters.length === 0) return;

    // Set initial state - text visible but dimmed
    gsap.set(letters, {
      opacity: 0.4,
      color: 'inherit'
    });

    const animateLetters = () => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      // Phase 1: Fade in with glow
      gsap.to(letters, {
        opacity: 1,
        textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
        duration: duration * 0.5,
        stagger: stagger,
        ease: 'power2.out',
        delay: delay,
        onComplete: () => {
          // Phase 2: Fade out glow, keep text visible
          gsap.to(letters, {
            textShadow: '0 0 0 transparent',
            duration: duration * 0.5,
            stagger: stagger * 0.3,
            ease: 'power2.out'
          });
        }
      });
    };

    if (triggerOnScroll) {
      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: triggerStart,
        onEnter: animateLetters,
        once: true
      });

      return () => trigger.kill();
    } else {
      animateLetters();
    }
  }, [text, delay, stagger, duration, glowColor, triggerOnScroll, triggerStart, isReady]);

  // Split text into individual letter spans
  const renderLetters = () => {
    return text.split('').map((char, index) => (
      <span
        key={`${char}-${index}`}
        className="glow-letter inline-block transition-all"
        style={{ 
          opacity: 0.4,
          color: 'inherit'
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <Tag ref={containerRef} className={`${className}`} style={{ display: 'inline' }}>
      {renderLetters()}
    </Tag>
  );
};

export default GlowText;
