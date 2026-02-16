import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Products from '../components/Products';
import Trust from '../components/Trust';
import Regions from '../components/Regions';
import ContactCTA from '../components/ContactCTA';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="bg-black min-h-screen">
      <Header />
      <Hero />
      <Products />
      <Trust />
      <Regions />
      <ContactCTA />
      <Footer />
    </div>
  );
};

export default Home;
