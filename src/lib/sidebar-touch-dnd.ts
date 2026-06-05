/** 移动端侧栏：较短长按弹出重命名 / 回收站操作单 */
export const NARROW_SIDEBAR_ACTION_SHEET_LONG_PRESS_MS = 420

/** 须大于 {@link NARROW_SIDEBAR_ACTION_SHEET_LONG_PRESS_MS}，留出 React 更新 `disabled` 的时间，避免与拖拽抢同一手势 */
export const NARROW_TOUCH_DND_ACTIVATION_DELAY_MS = 560
