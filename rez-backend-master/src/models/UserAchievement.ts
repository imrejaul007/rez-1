/**
 * Re-export UserAchievement from Achievement.ts to avoid duplicate model registration.
 * The UserAchievement model is defined in Achievement.ts alongside the Achievement model.
 */
import { UserAchievement, IUserAchievement } from './Achievement';

export { IUserAchievement };
export default UserAchievement;
