import React from 'react';
import { contactData } from '../utils/contact';
import { Mail, User, Send, Phone, MapPin } from 'lucide-react';

const ContactUs = () => {
  return (
    <div id="contact" className="min-h-screen bg-gradient-to-br mt-10 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Get in Touch</h1>
          <div className="w-20 h-1 bg-emerald-500 mx-auto mb-3 rounded-full"></div>
          <p className="text-base text-gray-400">
            We're here to help and answer any questions you might have
          </p>
        </div>

        <div className="grid lg:grid-cols-7 gap-6 items-start">
          {/* Contact Cards */}
          <div className="lg:col-span-3 space-y-4">
            {contactData.map((item, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    {index === 0 ? (
                      <Phone className="w-5 h-5 text-emerald-400" />
                    ) : index === 1 ? (
                      <Mail className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {item.description}
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-emerald-400 font-medium text-sm">
                        {item.phone}
                      </p>
                      <p className="text-gray-300 text-sm">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">
                Send us a Message
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    Your Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-9 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-200 text-white placeholder-gray-500 text-sm"
                      placeholder="Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      className="block w-full pl-9 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-200 text-white placeholder-gray-500 text-sm"
                      placeholder="Email Address"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-200 text-white placeholder-gray-500 resize-none text-sm"
                    placeholder="How can we help you?"
                  ></textarea>
                </div>

                <button className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg text-sm">
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;