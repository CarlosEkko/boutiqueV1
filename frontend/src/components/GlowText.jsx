import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GlowText Component - Letter-by-letter glow animation
 * Text starts fully visible, glow effect sweeps across on scroll
 */
const GlowText = ({ 
  text, 
  className = '', 
  as: Tag = 'span',
  delay = 0,
  stagger = 0.04,
  duration = 0.6,
  glowColor = 'rgba(165, 122, 80, 0.6)',
  triggerOnScroll = true,
  triggerStart = 'top 85%'
}) => {
  const containerRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const letters = containerRef.current.querySelectorAll('.glow-letter');
    if (letters.length === 0) return;

    // Ensure letters are fully visible from the start
    gsap.set(letters, { opacity: 1 });

    const animateLetters = () => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      // Create a subtle glow sweep animation
      const tl = gsap.timeline();
      
      // Phase 1: Add subtle glow effect letter by letter
      tl.to(letters, {
        textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
        duration: duration * 0.5,
        stagger: stagger,
        ease: 'power2.out',
        delay: delay
      });
      
      // Phase 2: Fade out glow, text remains fully visible
      tl.to(letters, {
        textShadow: 'none',
        duration: duration * 0.5,
        stagger: stagger * 0.2,
        ease: 'power2.inOut'
      }, `-=${duration * 0.2}`);
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
      const timer = setTimeout(animateLetters, 100);
      return () => clearTimeout(timer);
    }
  }, [text, delay, stagger, duration, glowColor, triggerOnScroll, triggerStart]);

  // Split text into individual letter spans - all visible from start
  const renderLetters = () => {
    return text.split('').map((char, index) => (
      <span
        key={`${char}-${index}`}
        className="glow-letter"
        style={{ 
          display: 'inline-block',
          opacity: 1
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <Tag ref={containerRef} className={className} style={{ display: 'inline' }}>
      {renderLetters()}
    </Tag>
  );
};

export default GlowText;
