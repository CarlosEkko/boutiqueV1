// GSAP Text Animation Utilities
import gsap from 'gsap';

/**
 * Split text into individual characters wrapped in spans
 * @param {HTMLElement} element - The text element to split
 * @returns {Array} - Array of character span elements
 */
export const splitTextByCharacter = (element) => {
  if (!element) return [];
  
  const text = element.textContent;
  element.innerHTML = '';
  
  const chars = [];
  
  text.split('').forEach((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
    span.style.display = 'inline-block';
    element.appendChild(span);
    chars.push(span);
  });
  
  return chars;
};

/**
 * Split text into words wrapped in spans
 * @param {HTMLElement} element - The text element to split
 * @returns {Array} - Array of word span elements
 */
export const splitTextByWord = (element) => {
  if (!element) return [];
  
  const text = element.textContent;
  element.innerHTML = '';
  
  const words = [];
  
  text.split(' ').forEach((word, index) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    element.appendChild(span);
    words.push(span);
    
    // Add space between words (except last)
    if (index < text.split(' ').length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });
  
  return words;
};

/**
 * Animate text characters with various effects
 */
export const animateTextChars = {
  // Fade and slide up
  fadeUp: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.05,
      stagger = 0.03,
      delay = 0,
      ease = 'power2.out',
      y = 50
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0, 
        y: y,
        rotateX: -90
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // Rotate and scale
  rotateScale: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.06,
      stagger = 0.03,
      delay = 0,
      ease = 'back.out(1.7)'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0, 
        scale: 0,
        rotation: -180
      },
      {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // Blur and focus
  blurFocus: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.08,
      stagger = 0.02,
      delay = 0,
      ease = 'power3.out'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0,
        filter: 'blur(10px)',
        scale: 1.5
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // Elastic bounce
  bounce: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.8,
      stagger = 0.02,
      delay = 0,
      ease = 'elastic.out(1, 0.3)'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0,
        y: -100,
        scale: 0.3
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // Wave effect
  wave: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.6,
      stagger = 0.03,
      delay = 0,
      ease = 'sine.inOut'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0,
        y: (i) => Math.sin(i * 0.5) * 50,
        rotateZ: (i) => i * 5
      },
      {
        opacity: 1,
        y: 0,
        rotateZ: 0,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // 3D flip
  flip3D: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.8,
      stagger = 0.04,
      delay = 0,
      ease = 'power3.out'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0,
        rotateY: -180,
        rotateX: 90,
        scale: 0.5
      },
      {
        opacity: 1,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease,
        transformPerspective: 1000
      }
    );
  },

  // Random scatter
  scatter: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 1,
      stagger = 0.02,
      delay = 0,
      ease = 'power4.out'
    } = options;
    
    gsap.fromTo(
      chars,
      { 
        opacity: 0,
        x: () => gsap.utils.random(-200, 200),
        y: () => gsap.utils.random(-200, 200),
        rotation: () => gsap.utils.random(-360, 360),
        scale: 0
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: duration,
        stagger: stagger,
        delay: delay,
        ease: ease
      }
    );
  },

  // Glitch effect
  glitch: (element, options = {}) => {
    const chars = splitTextByCharacter(element);
    const {
      duration = 0.1,
      stagger = 0.02,
      delay = 0
    } = options;
    
    chars.forEach((char, i) => {
      const tl = gsap.timeline({ delay: delay + (i * stagger) });
      
      tl.fromTo(
        char,
        { opacity: 0, x: -20, skewX: 20 },
        { opacity: 1, x: 0, skewX: 0, duration: duration }
      )
      .to(char, { x: 5, duration: duration * 0.5 })
      .to(char, { x: -5, duration: duration * 0.5 })
      .to(char, { x: 0, duration: duration * 0.5 });
    });
  }
};

/**
 * Continuous hover animation for text
 */
export const addTextHoverEffect = (element) => {
  const chars = element.querySelectorAll('span');
  
  element.addEventListener('mouseenter', () => {
    gsap.to(chars, {
      y: -10,
      duration: 0.3,
      stagger: 0.02,
      ease: 'power2.out'
    });
  });
  
  element.addEventListener('mouseleave', () => {
    gsap.to(chars, {
      y: 0,
      duration: 0.3,
      stagger: 0.02,
      ease: 'power2.out'
    });
  });
};

export default {
  splitTextByCharacter,
  splitTextByWord,
  animateTextChars,
  addTextHoverEffect
};
