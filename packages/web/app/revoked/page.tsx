"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RevokedPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any remaining auth state
    localStorage.clear();
    sessionStorage.clear();
    
    // Disconnect from any active chat connections
    // This will be handled by the page reload
  }, []);


  const handleReturnToLogin = () => {
    // Navigate to home page which will show login
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Account Revoked
          </h1>
          <p className="text-muted-foreground">
            Your account has been revoked because you are not using an EPFL email address.
          </p>
        </div>
        
        <div className="p-4 bg-muted rounded-lg text-left space-y-2">
          <h3 className="font-semibold text-sm">Access Requirements:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Must use an email address ending with @epfl.ch</li>
            <li>• Only EPFL Google accounts are accepted</li>
            <li>• Do not worry, your account and data have been removed</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleReturnToLogin} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Return to Login</span>
          </Button>
          
        </div>
        
        <p className="text-xs text-muted-foreground">
          If you have an EPFL email address, please sign in with your EPFL Google account.
        </p>
      </div>
    </div>
  );
} 