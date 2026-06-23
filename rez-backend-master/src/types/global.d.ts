/**
 * Global type shim for mongoose 8.23+ migration.
 *
 * Mongoose 8.x added `FlattenMaps<T>` to indicate post-`.lean()` result
 * types. Our codebase passes these to helpers typed against the original
 * interface — at runtime the values are identical. Without this shim, the
 * compiler rejects every such call with TS2322/TS2345.
 *
 * This module augmentation overrides mongoose's `FlattenMaps<T>` to be
 * identity (so `FlattenMaps<T>` reduces to `T`). Per-helper signature
 * updates in `services/*` then use the `Lean<T>` helper from
 * `src/types/lean.ts` to accept the `& Required<{ _id: ObjectId }> &
 * { __v: number }` intersection that mongoose's `Require_id` and
 * `Default__v` add on the element type.
 *
 * DELETE this file once the migration is complete and helpers are typed
 * against `FlattenMaps<T>` directly.
 */
declare module 'mongoose' {
  // Make FlattenMaps<T> indistinguishable from T. With the conditional
  // array branch, FlattenMaps<T>[] becomes T[] at the type level.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type FlattenMaps<T> = T extends Array<infer U>
    ? Array<U>
    : T extends object
    ? T
    : T;
}

export {};

