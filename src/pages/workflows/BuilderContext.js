import { createContext, useContext } from 'react';

/**
 * What the custom nodes and edges need from the builder without threading functions through node data:
 *   catalogByCode, problemsByNode, run (test-run highlight), readOnly,
 *   openPicker({ sourceId, port, insertEdgeId, x, y }) — opens the step picker.
 */
export const BuilderContext = createContext(null);

export const useBuilder = () => useContext(BuilderContext);
