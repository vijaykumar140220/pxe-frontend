// Function to check if session is still valid (under 1 hour of inactivity)
const getValidToken = () => {
  const token = localStorage.getItem('token');
  const lastActivityTimestamp =
    localStorage.getItem('lastActivityTimestamp') || localStorage.getItem('loginTimestamp');
  
  if (!token || !lastActivityTimestamp) return null;

  const currentTime = new Date().getTime();
  const oneHour = 60 * 60 * 1000;

  if (currentTime - parseInt(lastActivityTimestamp) > oneHour) {
    // Session expired
    localStorage.removeItem('token');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('lastActivityTimestamp');
    return null;
  }
  return token;
};

const initialToken = getValidToken();

const initialState = {
  token: initialToken,
  isAuthenticated: !!initialToken,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        token: action.payload, 
        isAuthenticated: true 
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('lastActivityTimestamp');
      return { ...state, token: null, isAuthenticated: false };
    default:
      return state;
  }
};

export default authReducer;
