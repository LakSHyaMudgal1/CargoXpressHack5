import React from 'react';
import HeroSection from './HeroSection';
import ProductPreview from './ProductPreview';
import About from './About';
import Features from './Features';
import ContactUs from './ContactUs';

const Home = () => (
  <main className="w-full">
    <HeroSection />
    <ProductPreview />
    <About />
    <Features />
    <ContactUs />
  </main>
);

export default Home;
