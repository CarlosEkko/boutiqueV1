import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import HeroV2 from '../components/HeroV2';
import Products from '../components/Products';
import Trust from '../components/Trust';
import Regions from '../components/Regions';
import ContactCTA from '../components/ContactCTA';
import Footer from '../components/Footer';

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#contact') {
      setTimeout(() => {
        const el = document.getElementById('contact');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location]);

  return (
    <div className="dark bg-black min-h-screen">
      <Header />
      <HeroV2 />
      <Products />
      <Trust />
      <Regions />
      <ContactCTA />
      <Footer />
    </div>
  );
};

export default Home;
