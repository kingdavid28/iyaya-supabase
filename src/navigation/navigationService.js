import { createNavigationContainerRef } from '@react-navigation/native';

// Create the navigation ref
export const navigationRef = createNavigationContainerRef();

// Navigation service with safe navigation methods
export const navigationService = {
  navigate: (name, params) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
    } else {
      console.warn('Navigation not ready, queuing navigation to:', name);
      // Queue the navigation for when ready
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(name, params);
        }
      }, 500);
    }
  },
  
  replace: (name, params) => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name, params }],
      });
    } else {
      console.warn('Navigation not ready for replace');
    }
  },
  
  goBack: () => {
    if (navigationRef.isReady()) {
      navigationRef.goBack();
    }
  },
  
  isReady: () => {
    return navigationRef.isReady();
  },
  
  navigationRef: navigationRef,
};

export default navigationService;
