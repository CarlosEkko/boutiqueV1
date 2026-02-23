import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * GlowText Component - Letter-by-letter glow animation (inspired by CodePen StephenScaff)
 * Each letter fades in with a glowing effect sequentially
 */
const GlowText = ({ 
  text, 
  className = '', 
  as: Tag = 'span',
  delay = 0,
  stagger = 0.05,
  duration = 0.7,
  glowColor = 'rgba(217, 119, 6, 0.9)', // amber-600
  finalColor = 'inherit',
  triggerOnScroll = true,
  triggerStart = 'top 80%'
}) => {
  const containerRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const letters = containerRef.current.querySelectorAll('.glow-letter');
    if (letters.length === 0) return;

    // Set initial state
    gsap.set(letters, {
      opacity: 0,
      textShadow: `0px 0px 1px ${glowColor.replace('0.9', '0.1')}`
    });

    const animateLetters = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      gsap.to(letters, {
        opacity: 1,
        textShadow: `0px 0px 20px ${glowColor}`,
        duration: duration * 0.66,
        stagger: stagger,
        ease: 'power2.out',
        delay: delay,
        onComplete: () => {
          // Fade out the glow after letters appear
          gsap.to(letters, {
            textShadow: '0px 0px 0px transparent',
            duration: duration * 0.34,
            stagger: stagger * 0.5,
            ease: 'power2.out'
          });
        }
      });
    };

    if (triggerOnScroll) {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: triggerStart,
        onEnter: animateLetters,
        once: true
      });
    } else {
      animateLetters();
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === containerRef.current) {
          trigger.kill();
        }
      });
    };
  }, [text, delay, stagger, duration, glowColor, triggerOnScroll, triggerStart]);

  // Split text into individual letter spans
  const renderLetters = () => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="glow-letter inline-block"
        style={{ 
          opacity: 0,
          color: finalColor
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
