import { NavLink, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaStore, 
  FaUsers
} from 'react-icons/fa';
import { useState, useEffect } from 'react';

const DirectorBottomNav = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { path: "/director/asosiy", icon: FaHome, label: "Asosiy" },
    { path: "/director/sotish", icon: FaShoppingCart, label: "Sotish" },
    { path: "/director/ombor", icon: FaStore, label: "Ombor" },
    { path: "/director/hisob", icon: FaUsers, label: "Qarzdorlar" },
  ];

  // Modal ochilganini aniqlash
  useEffect(() => {
    const checkModal = () => {
      // Modal elementlarini tekshirish
      const hasModal = document.querySelector('.modal-open') || 
                      document.querySelector('[role="dialog"]') ||
                      document.querySelector('.fixed.inset-0.bg-black.bg-opacity-40') ||
                      document.querySelector('.fixed.bottom-0.left-0.right-0.z-50');
      
      setIsModalOpen(!!hasModal);
    };

    // Interval orqali modal holatini tekshirish
    const interval = setInterval(checkModal, 100);

    // MutationObserver bilan DOM o'zgarishlarini kuzatish
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Modal ochilganda ko'rinadigan overlay (agar kerak bo'lsa) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 pointer-events-none"></div>
      )}

      {/* Navigation - Modal ochilganda z-index yuqori bo'ladi */}
      <nav 
        className={`bg-gray-800/95 backdrop-blur-lg border-t border-gray-700 shadow-2xl py-3 transition-all duration-300 ${
          isModalOpen ? 'z-50 opacity-100' : 'z-40'
        }`}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70px',
          boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex justify-around items-center h-full">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-300 relative ${
                      isActive
                        ? 'text-white bg-linear-to-b from-blue-600 to-blue-800 font-semibold border border-blue-500 shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50 active:scale-95'
                    }`
                  }
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                  
                  <Icon size={22} className={isActive ? 'animate-bounce-once' : ''} />
                  <span className="text-xs font-medium">{item.label}</span>
                  
                  {/* Active bottom line */}
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-400 rounded-full"></div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Style for bounce animation */}
      <style jsx="true">{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-in-out;
        }
      `}</style>
    </>
  )
}

export default DirectorBottomNav;