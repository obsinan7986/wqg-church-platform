import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { Button, Badge } from '../../components/ui';

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-white text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in duration-300">
        {/* Visual Badge & Cross Icon */}
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 rounded-3xl bg-royal-tint border-2 border-gold-500/50 flex items-center justify-center mx-auto shadow-sm">
            <Compass className="w-12 h-12 text-gold-600 animate-spin-slow" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-gold-500 text-royal font-black text-xs shadow-md">
            404
          </span>
        </div>

        {/* Heading & Multilingual Notice */}
        <div className="space-y-3">
          <Badge variant="gold" size="md">
            Fuula Hin Argamne • 404 Error
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-royal tracking-tight">
            Fuulli Kun Hin Argamne
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Teessoon browser keessan irratti barreessitan hin jiru ykn bakka biraatti jijjiirameera.
          </p>
          <p className="text-xs text-slate-500 font-medium font-ethiopic leading-relaxed">
            የተጠየቀው ገጽ አልተገኘም ወይም ወደ ሌላ ቦታ ተዘዋውሯል።
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              icon={Home}
              className="w-full sm:w-auto"
            >
              <span>Fuula Jalqabaa (Home)</span>
            </Button>
          </Link>

          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              icon={LayoutDashboard}
              className="w-full sm:w-auto"
            >
              <span>Dashboard Seeni</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;