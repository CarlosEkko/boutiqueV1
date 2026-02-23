import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GlowText Component - Letter-by-letter glow animation
 * Text is always visible, glow effect is just decorative
 */
const GlowText = ({ 
  text, 
  className = '', 
  as: Tag = 'span',
  delay = 0,
  stagger = 0.03,
  duration = 0.5,
  glowColor = 'rgba(217, 119, 6, 0.9)',
  triggerOnScroll = true,
  triggerStart = 'top 85%'
}) => {
  const containerRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!containerRef.current || hasAnimated) return;

    const letters = containerRef.current.querySelectorAll('.glow-letter');
    if (letters.length === 0) return;

    // Letters start visible but without glow
    gsap.set(letters, {
      opacity: 0.3,
    });

    const animateLetters = () => {
      if (hasAnimated) return;
      setHasAnimated(true);

      gsap.to(letters, {
        opacity: 1,
        duration: duration,
        stagger: stagger,
        ease: 'power2.out',
        delay: delay,
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
  }, [text, delay, stagger, duration, triggerOnScroll, triggerStart, hasAnimated]);

  // Split text into individual letter spans
  const renderLetters = () => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="glow-letter inline-block"
        style={{ 
          opacity: hasAnimated ? 1 : 0.3,
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <Tag ref={containerRef} className={className}>
      {renderLetters()}
    </Tag>
  );
};

export default GlowText;
