import React, { useState } from 'react';

interface GreetingProps {
  name: string;
}

export function Greeting({ name }: GreetingProps) {
  const [message, setMessage] = useState(`Hello, ${name}!`);

  const handleClick = () => {
    setMessage(`You clicked the button, ${name}!`);
  };

  return (
    <div>
      <h1>{message}</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
}