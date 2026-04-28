/**
 * Performance Monitoring Utility
 * 
 * Measures and reports web performance metrics (Core Web Vitals).
 * Tracks CLS, FID, FCP, LCP, and TTFB to help monitor user experience.
 * Learn more: https://bit.ly/CRA-vitals
 */

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
