import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Cloud, Home, Settings, FileText, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/api-docs", label: "API Docs", icon: FileText },
    ...(user?.isAdmin ? [{ path: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Cloud className="h-8 w-8 text-mega-red mr-3" data-testid="nav-logo-icon" />
              <span className="text-xl font-bold text-mega-text" data-testid="nav-logo-text">
                MEGA File Manager
              </span>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                        isActive
                          ? "text-mega-red border-b-2 border-mega-red"
                          : "text-mega-text hover:text-mega-red"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="user-menu-trigger">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || ""} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-mega-text">
                    {user?.firstName || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="logout-menu-item">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
