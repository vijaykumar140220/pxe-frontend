import React from "react";

const Logo = ({ compact = false }) => {
  return (
    <div className={`pxe-logo ${compact ? "pxe-logo--compact" : ""}`} aria-label="PXE logo">
      <img
        className="pxe-logo__mark"
        src="/pxe_system_logo.png"
        alt="PXE system logo"
      />
    </div>
  );
};

export default Logo;
