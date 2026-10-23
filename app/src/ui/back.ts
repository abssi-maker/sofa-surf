// The screen on top can claim the Back button first (return true to keep it),
// before App pops the screen. Only one claimer at a time: the live page.
export const backClaim: {current: null | (() => boolean)} = {current: null};
