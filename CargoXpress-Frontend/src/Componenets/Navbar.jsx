import React from 'react';
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '../utils/constants';
import { removeUser } from '../utils/userSlice';
import axios from 'axios';

const Navbar = () => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const HandleLogout = async () => {
    try {
      await axios.post(BASE_URL + '/logout', {}, { withCredentials: true });
      dispatch(removeUser());
      navigate('/login');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="navbar h-[88px] bg-base-100">
      <div className="flex-1">
        <a className="btn btn-ghost text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent hover:from-green-500 hover:to-blue-600 transition-all" href="/">CargoXpress</a>
      </div>
      <div className="flex-none gap-2">
        <div className='flex gap-10 text-lg mr-5 font-bold'>
          {!user && (
            <div className="flex gap-8">
              <button onClick={() => scrollToSection("about")}>About</button>
              <button onClick={() => scrollToSection("feature")}>Features</button>
              <button onClick={() => scrollToSection("contact")}>Contact Us</button>
              <Link to="/login"><div>Login</div></Link>
            </div>
          )}
        </div>

        {user && (
          <div className="flex-none gap-2">
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-base-300">
                  <img alt="User" src={user.photoUrl} />
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
                <li>
                  <Link to="/profile" className="justify-between">Profile</Link>
                </li>
                <li><Link to='/truck'>Schedule</Link></li>
                <li><button onClick={HandleLogout}>Logout</button></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
