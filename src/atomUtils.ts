export function gan(atomName: string) {
  return `WitForm_${atomName}`;
}

export function getNewRowId(rowIds: number[]) {
  let val = Math.floor(Math.random() * 10000);
  while (rowIds.indexOf(val) !== -1) {
    val++;
  }
  return val;
}
