import React from 'react';

export const EventContext = React.createContext({});
export const useEvent = () => React.useContext(EventContext);