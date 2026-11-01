import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
}

export function Shimmer({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden bg-gray-800/40 rounded ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
      />
    </div>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-[#12161F] border border-[#1E2330] rounded-xl overflow-hidden p-5 space-y-4 flex flex-col justify-between h-[450px]">
      <div className="space-y-4">
        {/* Image Placeholder */}
        <Shimmer className="h-48 w-full rounded-lg" />
        
        {/* Brand & Type */}
        <div className="flex justify-between items-center">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3.5 w-12" />
        </div>

        {/* Title */}
        <Shimmer className="h-6 w-3/4 mt-1" />

        {/* Specs Pills */}
        <div className="flex space-x-2 mt-3">
          <Shimmer className="h-5 w-14" />
          <Shimmer className="h-5 w-16" />
          <Shimmer className="h-5 w-12" />
        </div>
      </div>

      {/* Pricing & Button */}
      <div className="space-y-3 pt-4 border-t border-[#1C202B]">
        <div className="space-y-1.5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-6 w-1/2" />
          <Shimmer className="h-2.5 w-24" />
        </div>
        <Shimmer className="h-11 w-full rounded-lg mt-3" />
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Images */}
        <div className="w-full lg:w-3/5 space-y-4">
          <Shimmer className="h-96 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            <Shimmer className="h-20 w-full rounded-lg" />
            <Shimmer className="h-20 w-full rounded-lg" />
            <Shimmer className="h-20 w-full rounded-lg" />
            <Shimmer className="h-20 w-full rounded-lg" />
          </div>
        </div>

        {/* Right Side: Primary Info */}
        <div className="w-full lg:w-2/5 space-y-6">
          <div className="space-y-2">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-10 w-3/4" />
            <Shimmer className="h-4 w-1/3" />
          </div>
          <Shimmer className="h-20 w-full rounded-xl" />
          <div className="space-y-3 pt-4 border-t border-gray-800">
            <Shimmer className="h-5 w-1/2" />
            <Shimmer className="h-5 w-2/3" />
            <Shimmer className="h-5 w-1/3" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6">
            <Shimmer className="h-12 w-full rounded-lg" />
            <Shimmer className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
