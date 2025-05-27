"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle account revocation detection and cleanup
 */
export function useRevocationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Listen for navigation events to detect revocation headers
    const handleNavigation = () => {
      // Check for revocation indicators in current page
      const isRevoked = window.location.pathname === '/revoked';
      
      if (isRevoked) {
        // Clear all local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear any user preferences
        const userPrefsKey = 'user-preferences';
        localStorage.removeItem(userPrefsKey);
        
        // Force disconnect from any active connections
        // This includes chat connections, websockets, etc.
        window.dispatchEvent(new Event('account-revoked'));
      }
    };

    // Handle page load
    handleNavigation();

    // Listen for fetch responses to detect revocation headers
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check for revocation headers
      if (response.headers.get('X-Account-Revoked') === 'true') {
        console.warn('Account revocation detected via API response');
        
        // Clear local state
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to revoked page
        window.location.href = '/revoked';
      }
      
      return response;
    };

    // Listen for custom revocation events
    const handleRevocationEvent = () => {
      console.log('Account revocation event detected');
      
      // Clear all data
      localStorage.clear();
      sessionStorage.clear();
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/revoked';
      }, 100);
    };

    const handleDisconnectEvent = () => {
      console.log('User disconnect event detected');
      
      // Clear all data
      localStorage.clear();
      sessionStorage.clear();
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    };

    window.addEventListener('account-revoked', handleRevocationEvent);
    window.addEventListener('user-disconnected', handleDisconnectEvent);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('account-revoked', handleRevocationEvent);
      window.removeEventListener('user-disconnected', handleDisconnectEvent);
    };
  }, [router]);

  // Function to manually trigger revocation cleanup
  const triggerRevocation = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.dispatchEvent(new Event('account-revoked'));
  };

  return { triggerRevocation };
} 