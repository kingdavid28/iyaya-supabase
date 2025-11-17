import React from 'react';
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Store original createElement function
const originalCreateElement = React.createElement;

// Web-only shim: map deprecated `pointerEvents` prop to `style.pointerEvents`
if (Platform.OS === 'web') {
  React.createElement = (type, props, ...children) => {
    if (props?.pointerEvents !== undefined) {
      const { pointerEvents, style, ...restProps } = props;
      
      // Create merged style array
      let mergedStyle;
      if (Array.isArray(style)) {
        mergedStyle = [...style, { pointerEvents }];
      } else if (style) {
        mergedStyle = [style, { pointerEvents }];
      } else {
        mergedStyle = [{ pointerEvents }];
      }
      
      return originalCreateElement(type, { ...restProps, style: mergedStyle }, ...children);
    }
    
    return originalCreateElement(type, props, ...children);
  };
}

// Native defensive shim: strip unsupported accessibilityRole values
if (Platform.OS !== 'web') {
  const allowedRoles = new Set([
    'none', 'button', 'link', 'header', 'image', 'imagebutton', 'keyboardkey', 
    'text', 'adjustable', 'summary', 'alert', 'checkbox', 'combobox', 'menu', 
    'menubar', 'menuitem', 'progressbar', 'radio', 'radiogroup', 'scrollbar', 
    'spinbutton', 'switch', 'tab', 'tablist', 'timer', 'toolbar'
  ]);

  React.createElement = (type, props, ...children) => {
    if (props?.accessibilityRole) {
      const role = props.accessibilityRole;
      
      if (typeof role === 'string' && !allowedRoles.has(role)) {
        // Remove unsupported role in production, warn in development
        if (__DEV__) {
          const componentName = typeof type === 'string' 
            ? type 
            : type?.displayName || type?.name || 'UnknownComponent';
          
          console.warn(
            `[Accessibility] Stripped unsupported accessibilityRole "${role}" from <${componentName}>`
          );
        }
        
        // Create new props without the unsupported accessibilityRole
        const { accessibilityRole, ...restProps } = props;
        return originalCreateElement(type, restProps, ...children);
      }
    }
    
    return originalCreateElement(type, props, ...children);
  };
}

// Register the app component
registerRootComponent(App);