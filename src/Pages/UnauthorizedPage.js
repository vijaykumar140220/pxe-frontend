import React from "react";
import { Link } from "react-router-dom";

const UnauthorizedPage = () => {
  return (
    <div className="enterprise-page">
      <div className="enterprise-container">
        <div className="enterprise-card portal-message">
          <p className="page-kicker">Access Control</p>
          <h2 className="page-title">Unauthorized Access</h2>
          <p className="page-subtitle">
            Your current role does not permit access to this administrative module.
          </p>
          <Link className="enterprise-btn enterprise-btn--primary portal-message__action" to="/">
            Return to Inventory
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
