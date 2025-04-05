import React from 'react'
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div id="about" className='mt-10'>
        <h1 className="text-3xl font-bold text-white mb-2 flex justify-center">How it Works?</h1>
        <div className="w-20 h-1 bg-emerald-500 mx-auto mb-3 rounded-full"></div>

        <div className="flex justify-center">
  <ul className="timeline">
    <li>
      <div className="timeline-start timeline-box font-semibold text-lg">Login / Sign Up</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-600 h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M12 22a10 10 0 100-20 10 10 0 000 20zm4.5-12.5a1 1 0 00-1.6-1.2L9.5 14l-2.1-2.1a1 1 0 10-1.4 1.4l3 3a1 1 0 001.5-.1l5-6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <hr className="bg-green-600 h-1" />
    </li>

    <li>
      <hr className="bg-green-600 h-1" />
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-600 h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M12 22a10 10 0 100-20 10 10 0 000 20zm4.5-12.5a1 1 0 00-1.6-1.2L9.5 14l-2.1-2.1a1 1 0 10-1.4 1.4l3 3a1 1 0 001.5-.1l5-6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="timeline-end timeline-box font-semibold text-lg">
        Add Truck
      </div>
      <hr className="bg-green-600 h-1" />
    </li>

    <li>
      <hr className="bg-green-600 h-1" />
      <div className="timeline-start timeline-box font-semibold text-lg">Schedule Route</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-600 h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M12 22a10 10 0 100-20 10 10 0 000 20zm4.5-12.5a1 1 0 00-1.6-1.2L9.5 14l-2.1-2.1a1 1 0 10-1.4 1.4l3 3a1 1 0 001.5-.1l5-6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <hr className="bg-green-600 h-1" />
    </li>

    <li>
      <hr className="bg-green-600 h-1" />
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-green-600 h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M12 22a10 10 0 100-20 10 10 0 000 20zm4.5-12.5a1 1 0 00-1.6-1.2L9.5 14l-2.1-2.1a1 1 0 10-1.4 1.4l3 3a1 1 0 001.5-.1l5-6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="timeline-end timeline-box font-semibold text-lg">Merge Trucks</div>
      <hr className="bg-gray-500 h-1" />
    </li>

    <li>
      <hr className="bg-gray-500 h-1" />
      <div className="timeline-start timeline-box font-semibold text-lg">Dispatch Trucks</div>
      <div className="timeline-middle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-gray-600 h-8 w-8"
        >
          <path
            fillRule="evenodd"
            d="M12 22a10 10 0 100-20 10 10 0 000 20zm4.5-12.5a1 1 0 00-1.6-1.2L9.5 14l-2.1-2.1a1 1 0 10-1.4 1.4l3 3a1 1 0 001.5-.1l5-6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </li>
  </ul>
</div>



<div className="flex flex-col items-center mt-6">
<Link to="/traderRequest">
  <button className="btn btn-outline btn-success text-lg px-6 py-3 shadow-md hover:scale-105 transition-transform">
    Schedule
  </button>
</Link>
  <p className="mt-5 text-lg font-semibold text-gray-500">
    Schedule Your Route Today!
  </p>
</div>

    </div>
  )
}

export default About