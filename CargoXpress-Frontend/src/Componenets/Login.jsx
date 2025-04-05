import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { useNavigate } from "react-router";
import { BASE_URL } from '../utils/constants';

const Login = () => {
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [userRole, setUserRole] = useState("trader"); // Default role for signup
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const HandleLogin = async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/login`, 
        { emailId, password }, 
        { withCredentials: true }
      );
  
      dispatch(addUser(res.data));
  
      // Check if emailId contains "@cargoxpress.com"
      if (emailId.endsWith("@cargoxpress.com")) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "Something went wrong");
    }
  };
  

  const HandleSignUp = async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/signup/${userRole}`,  // API now correctly includes userRole in params
        {
          name,
          emailId,
          password,
          ...(userRole === "trader" ? { aadharNumber } : {}),
          ...(userRole === "company" ? { registrationNumber } : {})
        },
        { withCredentials: true }
      );
      dispatch(addUser(res.data));
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "Something went wrong");
    }
  };

  return (
    <div className="justify-center flex">
      <div className="card bg-base-200 w-96 shadow-xl m-4">
        <div className="card-body">
          <h2 className="card-title justify-center">{isLogin ? "Login" : "Sign Up"}</h2>

          {/* Show User Role selection only during signup */}
          {!isLogin && (
            <label className="form-control w-full max-w-xs">
              <div className="label">
                <span className="label-text">Select Role</span>
              </div>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="select select-bordered w-full max-w-xs"
              >
                <option value="trader">Trader</option>
                <option value="company">Company</option>
              </select>
            </label>
          )}

          {/* Signup Fields for Trader */}
          {!isLogin && userRole === "trader" && (
            <>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Full Name</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                />
                <div className="label">
                  <span className="label-text">Aadhar Number</span>
                </div>
                <input
                  type="text"
                  value={aadharNumber}
                  onChange={(e) => setAadharNumber(e.target.value)}
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                />
              </label>
            </>
          )}

          {/* Signup Fields for Company */}
          {!isLogin && userRole === "company" && (
            <>
              <label className="form-control w-full max-w-xs">
                <div className="label">
                  <span className="label-text">Company Name</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                />
                <div className="label">
                  <span className="label-text">Registration Number</span>
                </div>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                />
              </label>
            </>
          )}

          {/* Email Field for Everyone */}
          <label className="form-control w-full max-w-xs">
            <div className="label">
              <span className="label-text">E-mail ID</span>
            </div>
            <input
              type="text"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              placeholder="Type here"
              className="input input-bordered w-full max-w-xs"
            />
          </label>

          {/* Password Field for Everyone */}
          <label className="form-control w-full max-w-xs">
            <div className="label">
              <span className="label-text">Password</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type here"
              className="input input-bordered w-full max-w-xs"
            />
          </label>

          {/* Error Message */}
          {error && <p className="text-red-500">{error}</p>}

          {/* Login/Signup Button */}
          <div className="card-actions justify-center mt-4">
            <button className="btn btn-primary" onClick={isLogin ? HandleLogin : HandleSignUp}>
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </div>

          {/* Toggle Login/Signup for Non-Admin Users */}
          <p
            onClick={() => setIsLogin((prev) => !prev)}
            className="text-center cursor-pointer"
          >
            {isLogin ? "New User? Sign Up here" : "Existing User? Login here"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
