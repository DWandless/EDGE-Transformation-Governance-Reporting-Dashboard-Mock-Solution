/**
 * App Component Tests
 * 
 * Unit tests for the App component using React Testing Library.
 * Contains tests to verify that the App component renders correctly.
 */

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
