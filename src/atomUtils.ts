import { RecoilValue, Snapshot } from 'recoil';

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

export function generateFormId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function snapshotToGet(snapshot: Snapshot) {
  return (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
}
