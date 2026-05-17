'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HeroNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <motion.div
          className="text-3xl tracking-tight display-font text-black"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Aethera<sup>®</sup>
        </motion.div>

        {/* Navigation Links */}
        <div className="flex items-center gap-8">
          <motion.ul
            className="flex items-center gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <li>
              <Link
                href="/"
                className="text-sm font-medium text-black transition-colors hover:text-gray-600 body-font"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-sm font-medium text-[#6F6F6F] transition-colors hover:text-black body-font"
              >
                Studio
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-sm font-medium text-[#6F6F6F] transition-colors hover:text-black body-font"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-sm font-medium text-[#6F6F6F] transition-colors hover:text-black body-font"
              >
                Journal
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-sm font-medium text-[#6F6F6F] transition-colors hover:text-black body-font"
              >
                Reach Us
              </Link>
            </li>
          </motion.ul>

          {/* CTA Button */}
          <motion.button
            className="rounded-full px-6 py-2.5 text-sm font-medium text-white bg-black hover:scale-103 transition-transform body-font"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Begin Journey
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
