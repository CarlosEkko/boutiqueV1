import React from 'react';
import Header from '../components/Header';
import HeroV2 from '../components/HeroV2';
import Products from '../components/Products';
import Trust from '../components/Trust';
import Regions from '../components/Regions';
import ContactCTA from '../components/ContactCTA';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="bg-black min-h-screen">
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
