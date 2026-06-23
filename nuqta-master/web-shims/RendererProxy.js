// Web shim for RendererProxy
import { findDOMNode } from 'react-dom';
export const findNodeHandle = (component) => {
  try { return findDOMNode(component); } catch (e) { return null; }
};
export default { findNodeHandle };
