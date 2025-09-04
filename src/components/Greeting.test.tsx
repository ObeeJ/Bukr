import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Greeting } from './Greeting';

describe('Greeting Component', () => {
  it('should render the initial greeting message', () => {
    render(<Greeting name="World" />);

    // Check if the initial message is rendered
    const headingElement = screen.getByRole('heading', { name: /Hello, World!/i });
    expect(headingElement).toBeInTheDocument();
  });

  it('should render a button', () => {
    render(<Greeting name="World" />);

    // Check if the button is present
    const buttonElement = screen.getByRole('button', { name: /Click Me/i });
    expect(buttonElement).toBeInTheDocument();
  });

  it('should update the message when the button is clicked', () => {
    render(<Greeting name="Jest" />);

    const buttonElement = screen.getByRole('button', { name: /Click Me/i });

    // Simulate a user click
    fireEvent.click(buttonElement);

    // Check if the message has been updated
    const updatedHeadingElement = screen.getByRole('heading', { name: /You clicked the button, Jest!/i });
    expect(updatedHeadingElement).toBeInTheDocument();
  });
});