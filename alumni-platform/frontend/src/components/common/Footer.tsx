import React from 'react';
import { Link } from 'react-router-dom';
import { FiAward } from 'react-icons/fi';

const Footer: React.FC = () => (
  <footer className="relative overflow-hidden mt-auto" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
    {/* aurora orbs */}
    <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow">
              <FiAward className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CareerSaathi</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Intelligent platform connecting students with alumni for mentorship, career growth, and technical education.
          </p>
          <div className="flex gap-2 mt-5">
            {['AI-Powered', 'Free to Use', 'Secure'].map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-xs font-medium border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">Platform</h4>
          <ul className="space-y-2.5 text-sm">
            {[
              { to: '/mentors', label: 'Find Mentors' },
              { to: '/jobs', label: 'Job Board' },
              { to: '/forum', label: 'Discussion Forum' },
              { to: '/interview', label: 'Interview Practice' },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-gray-400 hover:text-white transition-colors duration-200 link-underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">AI Features</h4>
          <ul className="space-y-2.5 text-sm">
            {[
              { to: '/chatbot', label: 'Career Chatbot' },
              { to: '/interview', label: 'AI Interview' },
              { to: '/roadmap', label: 'Skill Roadmap' },
              { to: '/mentors', label: 'Smart Matching' },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-gray-400 hover:text-white transition-colors duration-200 link-underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-xs text-gray-500">© 2026 CareerSaathi. All rights reserved.</p>
        <p className="text-xs text-gray-500">Built with React, Node.js, Firebase &amp; Groq AI</p>
      </div>
    </div>
  </footer>
);

export default Footer;

