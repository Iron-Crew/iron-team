export const Status = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
}

export function cycleStatus(s) {
  if (s === Status.TODO) return Status.IN_PROGRESS
  if (s === Status.IN_PROGRESS) return Status.DONE
  return Status.TODO
}

export function statusLabel(s) {
  if (s === Status.DONE) return 'X'
  if (s === Status.IN_PROGRESS) return 'O'
  return ''
}
