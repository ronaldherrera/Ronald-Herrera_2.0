import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="layout" style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;
