// None - no effect
export const id = 'none';
export const name = 'none';
export const key = '0';
export const params = { label: '', map: v => 0, default: 50 };

export function apply(ctx, dt) {
  // No-op - main loop stops animation when effect is 'none'
}
