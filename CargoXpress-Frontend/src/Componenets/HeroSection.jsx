import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Truck, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const slides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=2070",
    title: "Professional Trucking Solutions",
    subtitle: "Reliable Transportation Services Nationwide"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=2070",
    title: "Modern Fleet Management",
    subtitle: "Advanced Technology for Efficient Delivery"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1565891741441-64926e441838?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Sustainable Logistics",
    subtitle: "Eco-friendly Transportation Solutions"
  }
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[720px] w-full overflow-hidden">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 rounded-full p-3 backdrop-blur-md transition-colors 
        bg-white/20 text-white hover:bg-white/30 dark:bg-gray-800/40 dark:text-white dark:hover:bg-gray-700/40"
      >
        {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </button>
      
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
            index === currentSlide ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="relative h-full w-full">
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
            />
            <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'}`} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl">
                <Truck className="mb-6 h-16 w-16 text-white" />
                <h1 className="mb-4 text-5xl font-bold text-white">{slide.title}</h1>
                <p className="mb-8 text-xl text-gray-200">{slide.subtitle}</p>
                
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="absolute inset-0 flex items-center justify-between p-4">
        <button
          onClick={prevSlide}
          className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
            isDark 
              ? 'bg-gray-800/40 text-white hover:bg-gray-700/40' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
            isDark 
              ? 'bg-gray-800/40 text-white hover:bg-gray-700/40' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      
      <div className="absolute bottom-4 left-0 right-0">
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentSlide
                  ? `w-8 ${isDark ? 'bg-gray-300' : 'bg-white'}`
                  : `${isDark ? 'bg-gray-300/50' : 'bg-white/50'}`
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
