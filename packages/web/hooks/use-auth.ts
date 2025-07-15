import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import { useRevocationHandler } from "@/hooks/use-revocation-handler";

export function useAuth() {
  const { isAuthenticated, userEmail, setAuthState, clearAuthState } = useUserPreferences();
  const [isLoading, setIsLoading] = useState(!isAuthenticated); // Only load if not already authenticated
  
  // Initialize revocation handler
  useRevocationHandler();

  useEffect(() => {
    // If already authenticated, skip loading
    if (isAuthenticated && userEmail) {
      setIsLoading(false);
      return;
    }

    const checkAuthStatus = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data) {
          const sessionUserEmail = session.data.user?.email;
          if (sessionUserEmail) {
            const domain = sessionUserEmail.split('@')[1];
            console.log(`[AUTH] Validating user domain: ${sessionUserEmail} -> ${domain}`);
            
            if (domain !== 'epfl.ch') {
              console.warn(`[AUTH] ❌ Non-EPFL user detected: ${sessionUserEmail}`);
              
              // Force disconnect and redirect
              try {
                await authClient.signOut();
                localStorage.clear();
                sessionStorage.clear();
                clearAuthState();
                window.location.href = '/revoked';
                return;
              } catch (error) {
                console.error('Error during forced disconnect:', error);
                window.location.reload();
                return;
              }
            } else {
              console.log(`[AUTH] ✅ EPFL user validated: ${sessionUserEmail}`);
            }
          }
          setAuthState(true, sessionUserEmail);
        } else {
          setAuthState(false);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setAuthState(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [isAuthenticated, userEmail, setAuthState, clearAuthState]);

  const signOut = async () => {
    try {
      await authClient.signOut();
      localStorage.clear();
      sessionStorage.clear();
      clearAuthState();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    isAuthenticated,
    userEmail,
    isLoading,
    signOut,
    setAuthState,
    clearAuthState
  };
} 