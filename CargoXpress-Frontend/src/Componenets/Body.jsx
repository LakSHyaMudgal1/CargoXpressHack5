import { useEffect } from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router';
import FooterSec from './Footer';
import ParticleBackground from './ParticleBackground';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { BASE_URL } from '../utils/constants';

const Body = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(BASE_URL + '/me', { withCredentials: true });
        dispatch(addUser(res.data));
      } catch (err) {
        // Not logged in — leave store as null
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Particle canvas — fixed, behind everything */}
      <ParticleBackground />

      {/* Page radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Actual content — sits above the canvas */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />
        <Outlet />
        <FooterSec />
      </div>
    </div>
  );
};

export default Body;
