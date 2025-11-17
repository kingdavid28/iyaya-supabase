import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// Removed imports to avoid dependency issues

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Simple error logging without any processing
    console.error('ACTUAL ERROR:', error);
    console.error('ERROR MESSAGE:', error?.message);
    console.error('ERROR STACK:', error?.stack);
    console.error('COMPONENT STACK:', errorInfo?.componentStack);
    
    // Simple fallback without any complex processing
    this.setState({
      error: {
        userMessage: error?.message || 'Something went wrong',
        retryable: true
      },
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;
      
      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error}
            retry={this.handleRetry}
          />
        );
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.userMessage || 'An unexpected error occurred'}
          </Text>
          {this.state.error?.retryable && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={this.handleRetry}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
