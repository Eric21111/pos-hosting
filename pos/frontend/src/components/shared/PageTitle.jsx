import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'CYSPOS';


    switch (path) {
      case '/':
        title = 'Login - CYSPOS';
        break;
      case '/pin':
        title = 'Enter PIN - CYSPOS';
        break;
      case '/staff':
        title = 'Select Staff - CYSPOS';
        break;
      case '/set-pin':
        title = 'Set PIN - CYSPOS';
        break;
      case '/dashboard':
        title = 'Dashboard - CYSPOS';
        break;
      case '/reports':
        title = 'Reports - CYSPOS';
        break;
      case '/manage-employees':
        title = 'Manage Employees - CYSPOS';
        break;
      case '/inventory':
        title = 'Inventory - CYSPOS';
        break;
      case '/stock-movement':
        title = 'Stock Movement - CYSPOS';
        break;
      case '/terminal':
        title = 'Terminal - CYSPOS';
        break;
      case '/transactions':
        title = 'Transactions - CYSPOS';
        break;
      case '/settings':
        title = 'Settings - CYSPOS';
        break;
      case '/discount-management':
        title = 'Discounts - CYSPOS';
        break;
      case '/brand-partners':
        title = 'Brand Partners - CYSPOS';
        break;
      case '/categories':
        title = 'Categories - CYSPOS';
        break;
      default:

        if (path.startsWith('/inventory')) {
          title = 'Inventory - CYSPOS';
        } else {
          title = 'CYSPOS';
        }
        break;
    }

    document.title = title;
  }, [location]);

  return null;
};

export default PageTitle;