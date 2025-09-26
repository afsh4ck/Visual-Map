
'use client';

import { Separator } from "@/components/ui/separator";

export default function AppFooter() {
  const version = "1.0.0"; 

  return (
    <footer className="w-full mt-auto">
        <Separator />
        <div className="flex items-center justify-center px-4 h-14 text-sm text-muted-foreground">
            <p>
              Visual Map v{version} - Developed by{' '}
              <a 
                href="https://github.com/afsh4ck" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-foreground transition-colors font-medium"
              >
                afsh4ck
              </a>
            </p>
        </div>
    </footer>
  );
}
