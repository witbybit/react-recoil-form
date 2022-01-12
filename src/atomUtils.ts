import { RecoilValue, Snapshot } from 'recoil';
import { fieldAtomFamily } from './atoms';
import { IAncestorInput, IFieldArrayAtomValue, IFieldAtomSelectorInput } from './types';

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
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function snapshotToGet(snapshot: Snapshot) {
	return (atom: RecoilValue<any>) => snapshot.getLoadable(atom).contents;
}

export function getFullObjectPath(params: IFieldAtomSelectorInput, get: (val: RecoilValue<any>) => any) {
	let path = '';
	let prevAncestors: IAncestorInput[] = [];
	for (const ancestor of params.ancestors) {
		const ancestorValue = get(
			fieldAtomFamily({
				formId: params.formId,
				ancestors: prevAncestors,
				name: ancestor.name,
				type: 'field-array',
			})
		) as IFieldArrayAtomValue;
		const rowIndex = ancestorValue.rowIds.indexOf(ancestor.rowId);
		path = path + `${ancestor.name}[${rowIndex}].`;
		prevAncestors.push(ancestor);
	}
	path = path + params.name;
	return path;
}
