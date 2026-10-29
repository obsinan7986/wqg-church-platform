import React from 'react';

export const Container = ({ children, className = '', ...props }) => {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const Section = ({ children, className = '', ...props }) => {
  return (
    <section className={`py-12 md:py-16 ${className}`} {...props}>
      {children}
    </section>
  );
};

export default Container;
