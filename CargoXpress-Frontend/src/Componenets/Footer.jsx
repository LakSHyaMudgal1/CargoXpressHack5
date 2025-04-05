import React from "react";
import { Twitter, Youtube, Facebook, Truck, Phone, Mail, MapPin, Heart } from "lucide-react";

const FooterSec = () => {
  // Function to smoothly scroll to the section
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Company Info */}
          <div className="space-y-4">
            <a 
              className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent hover:from-green-500 hover:to-blue-600 transition-all cursor-pointer"
              href="/"
            >
              CargoXpress
            </a>
            <p className="text-gray-400 leading-relaxed">A RunTime Terror Project.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => scrollToSection("about")}
                  className="inline-flex items-center text-gray-400 hover:text-green-400 transition-colors duration-200"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex items-center text-gray-400 hover:text-green-400 transition-colors duration-200"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Contact
                </button>
              </li>
              <li>
                <button 
                 
                  className="inline-flex items-center text-gray-400 hover:text-green-400 transition-colors duration-200"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  <a href="truck/">Schedule Delivery</a>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 mt-1 text-green-400" />
                <span className="text-gray-400">IIIT Una</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-green-400" />
                <span className="text-gray-400">+91 73404-39674</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-green-400" />
                <a href="mailto:Admin@RuntimeTerror.com" className="text-gray-400 hover:text-blue-400 transition-colors duration-200">
                  Admin@RuntimeTerror.com
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Connect With Us</h4>
            <div className="flex space-x-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-3 rounded-full hover:bg-blue-500 transition-colors duration-300">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-3 rounded-full hover:bg-red-500 transition-colors duration-300">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-3 rounded-full hover:bg-blue-600 transition-colors duration-300">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} CargoXpress Industries Ltd. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-blue-400 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-gray-500 hover:text-blue-400 transition-colors duration-200">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSec;
