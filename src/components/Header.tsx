import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LogOut, FileText, Shield, Menu, X, Package, 
  LayoutDashboard, PackageSearch, Factory
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';

export const Header = () => {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const { isDispatchedPageVisible } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'text-primary-200' : 'text-white'} hover:text-primary-100 transition-colors duration-200`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'bg-primary-700 text-white' : 'text-primary-100'} block px-3 py-2 rounded-md text-base font-medium hover:bg-primary-700 hover:text-white transition-colors duration-200`;

  return (
    <header className="bg-primary shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src="https://i.ibb.co/wrsybZF8/logo.png" 
                alt="Nimmadhi Mattress Logo"
                className="h-10 w-10"
              />
            </div>
            <h1 className="ml-3 text-xl sm:text-2xl font-bold text-white hidden sm:block">
              Nimmadhi Mattress
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <NavLink to="/dashboard" className={navLinkClass} end>
              <span className="flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Dashboard
              </span>
            </NavLink>
            <NavLink to="/dashboard/inventory" className={navLinkClass}>
              <span className="flex items-center">
                <PackageSearch className="h-4 w-4 mr-1" />
                Inventory
              </span>
            </NavLink>
            <NavLink to="/dashboard/production" className={navLinkClass}>
              <span className="flex items-center">
                <Factory className="h-4 w-4 mr-1" />
                Production
              </span>
            </NavLink>
            {isDispatchedPageVisible && (
              <NavLink to="/dashboard/dispatched" className={navLinkClass}>
                <span className="flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  Dispatched
                </span>
              </NavLink>
            )}
            <NavLink to="/dashboard/reports" className={navLinkClass}>
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Reports
              </span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin Panel
                </span>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-white hover:text-primary-100 transition-colors duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary-100 hover:text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <NavLink
            to="/dashboard"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
            end
          >
            <span className="flex items-center">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/dashboard/inventory"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <PackageSearch className="h-4 w-4 mr-2" />
              Inventory
            </span>
          </NavLink>
          <NavLink
            to="/dashboard/production"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <Factory className="h-4 w-4 mr-2" />
              Production
            </span>
          </NavLink>
          {isDispatchedPageVisible && (
            <NavLink
              to="/dashboard/dispatched"
              className={mobileNavLinkClass}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Dispatched
              </span>
            </NavLink>
          )}
          <NavLink
            to="/dashboard/reports"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={mobileNavLinkClass}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </span>
            </NavLink>
          )}
          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="w-full text-left flex items-center px-3 py-2 text-primary-100 hover:bg-primary-700 hover:text-white rounded-md transition-colors duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};