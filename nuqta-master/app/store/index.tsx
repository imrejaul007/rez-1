// Re-export Store page for /store route compatibility
// The main Store component lives at ../Store.tsx but Expo Router
// needs store/index.tsx to serve the /store path since the store/ directory exists
export { default } from '../Store';
