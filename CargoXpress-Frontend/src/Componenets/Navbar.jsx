import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '../utils/constants';
import { removeUser } from '../utils/userSlice';
import axios from 'axios';
import { Truck, LayoutDashboard, PackagePlus, Route, Menu, X, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin   = user && user.emailId?.endsWith('@cargoxpress.com');
  const isTrader  = user && !isAdmin && user.aadharNumber !== undefined;
  const isCompany = user && !isAdmin && user.registrationNumber !== undefined;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const HandleLogout = async () => {
    try {
      await axios.post(BASE_URL + '/logout', {}, { withCredentials: true });
      dispatch(removeUser());
      navigate('/login');
    } catch (err) { console.error('Logout failed', err); }
  };

  const scroll = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-gray-950/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Cargo</span>
          <span className="text-white">Xpress</span>
        </Link>

        {/* Desktop guest links */}
        {!user && (
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6 text-sm text-white/60">
              {[['about','About'],['feature','Features'],['contact','Contact']].map(([id,label]) => (
                <button key={id} onClick={() => scroll(id)}
                  className="hover:text-white transition-colors">{label}</button>
              ))}
            </div>
            <Link to="/login">
              <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors">
                Get Started
              </button>
            </Link>
          </div>
        )}

        {/* Desktop logged-in links */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin">
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </button>
              </Link>
            )}
            {isCompany && (
              <>
                <Link to="/truck">
                  <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <Truck className="h-4 w-4" /> Add Truck
                  </button>
                </Link>
                <Link to="/route">
                  <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <Route className="h-4 w-4" /> Add Route
                  </button>
                </Link>
              </>
            )}
            {isTrader && (
              <Link to="/traderRequest">
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <PackagePlus className="h-4 w-4" /> Request Delivery
                </button>
              </Link>
            )}

            {/* Avatar */}
            <div className="dropdown dropdown-end ml-2">
              <div tabIndex={0} role="button" className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-500/40">
                  <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm text-white/80 hidden lg:block max-w-[100px] truncate">{user.name}</span>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-gray-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 w-52 p-2 mt-2">
                <li className="px-3 py-2 text-xs text-white/30 font-medium truncate">{user.emailId}</li>
                <div className="border-t border-white/5 my-1" />
                <li><Link to="/profile" className="text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex gap-2"><User className="h-4 w-4"/>Profile</Link></li>
                {isCompany && <li><Link to="/truck" className="text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex gap-2"><Truck className="h-4 w-4"/>Add Truck</Link></li>}
                {isTrader  && <li><Link to="/traderRequest" className="text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex gap-2"><PackagePlus className="h-4 w-4"/>Request Delivery</Link></li>}
                {isAdmin   && <li><Link to="/admin" className="text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex gap-2"><LayoutDashboard className="h-4 w-4"/>Admin Dashboard</Link></li>}
                <div className="border-t border-white/5 my-1" />
                <li><button onClick={HandleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg w-full text-left flex gap-2 px-3 py-2 text-sm"><LogOut className="h-4 w-4"/>Logout</button></li>
              </ul>
            </div>
          </div>
        )}

        {/* Mobile hamburger */}
        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(p => !p)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950/98 border-t border-white/5 px-6 py-4 space-y-2">
          {!user && (
            <>
              {[['about','About'],['feature','Features'],['contact','Contact']].map(([id,label]) => (
                <button key={id} onClick={() => scroll(id)} className="block w-full text-left py-2 text-white/60 hover:text-white text-sm">{label}</button>
              ))}
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <button className="w-full mt-2 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold">Get Started</button>
              </Link>
            </>
          )}
          {user && (
            <>
              {isAdmin   && <Link to="/admin"        onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 text-sm">Dashboard</Link>}
              {isCompany && <Link to="/truck"        onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 text-sm">Add Truck</Link>}
              {isCompany && <Link to="/route"        onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 text-sm">Add Route</Link>}
              {isTrader  && <Link to="/traderRequest"onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 text-sm">Request Delivery</Link>}
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="block py-2 text-white/60 text-sm">Profile</Link>
              <button onClick={HandleLogout} className="block py-2 text-red-400 text-sm">Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
