import type { ObjectId } from 'mongodb';
import type { FlattenMaps } from 'mongoose';

/**
 * Helper type for helpers that return Mongoose lean documents.
 *
 * In Mongoose 8.23+, .lean() returns a type that includes
 * `FlattenMaps<T> & Required<{ _id: ObjectId; }> & { __v: number }`
 * as an intersection on the element type. This causes TypeScript
 * errors when passing the result to functions that expect the bare
 * interface.
 *
 * `Lean<T>` matches mongoose's actual return type so it is assignable
 * from `.lean()` query results and from other `Lean<T>` values.
 *
 * Use this type on function return values that return arrays of
 * .lean() results, e.g.:
 *   async function findUsers(): Promise<Lean<IUser>[]>
 *
 * Phase 7 fix for the mongoose 8.23 migration.
 */
export type Lean<T> = FlattenMaps<T> & { _id: any; __v: number };

