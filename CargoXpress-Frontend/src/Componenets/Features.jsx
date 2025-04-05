import React from 'react'
import { featureData } from '../utils/features';

const FeatureCard = ({ image, title, description }) => {
  return (
    <div className="card  w-[220px] bg-gray-800/50 border border-gray-700/50 shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
      <figure className="px-10 pt-10">
        <img
          src={image}
          alt={title}
          className="rounded-full w-[120px] h-[120px]"
        />
      </figure>
      <div className="card-body items-center text-center">
        <h2 className="card-title">{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
};


const Features = () => {

  return (
    <div id="feature" className="mb-10">
      <h1 className="text-3xl font-bold text-white mb-2 flex justify-center mt-10">Our Features</h1>
      <div className="w-20 h-1 bg-emerald-500 mx-auto mb-3 rounded-full"></div>
    <div className="flex flex-wrap justify-center gap-6">

      {featureData.map((feature, index) => (
        <FeatureCard 
          key={index}
          image={feature.image}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
    </div>
  );
};


export default Features