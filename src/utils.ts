import 'core-js/features/string/virtual/match-all';

export function getPathInObj(
  obj: any,
  path: string,
  defaultValue = undefined,
  ancestors: { name: string; index: number }[] = []
) {
  if (ancestors?.length) {
    let prefix = '';
    for (const ancestor of ancestors) {
      prefix = prefix + `${ancestor.name}[${ancestor.index}].`;
    }
    path = prefix + path;
  }
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

// Note that a[2].b behaves as if a is an array while a.2.b behaves like a is an object.
export function setPathInObj(
  obj: any,
  path: string,
  fieldValue: any,
  ancestors?: { name: string; index: number }[]
) {
  if (path && fieldValue && obj) {
    const value = cloneDeep(fieldValue);
    if (ancestors?.length) {
      let prefix = '';
      for (const ancestor of ancestors) {
        prefix = prefix + `${ancestor.name}[${ancestor.index}].`;
      }
      path = prefix + path;
    }
    const pathArray = path.matchAll(/([^[.\]])+/g);
    let pathMatch = pathArray.next();
    let key: string = '';
    let objInFocus = obj;
    while (!pathMatch.done) {
      const match = pathMatch.value;
      const nextPathMatch = pathArray.next();
      const isLastKey = nextPathMatch.done;
      const nextMatch = nextPathMatch.value;
      key = match[0];
      const isKeyArrIdx =
        !isLastKey && path.charAt(nextMatch.index - 1) === '[';
      if (isLastKey) {
        objInFocus[key] = value;
      } else {
        if (objInFocus[key] === undefined || objInFocus[key] === null) {
          objInFocus[key] = isKeyArrIdx ? [] : {};
        }
        objInFocus = objInFocus[key];
      }
      pathMatch = nextPathMatch;
    }
  }
  return obj;
}

// Taken from https://dev.to/sanderdebr/deep-equality-checking-of-objects-in-vanilla-javascript-5592
export function isDeepEqual(
  obj1: any,
  obj2: any,
  eq?: (a: any, b: any) => boolean
) {
  if ((eq && eq(obj1, obj2)) || obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 == null ||
    obj2 == null
  ) {
    return false;
  }

  const keysA = Object.keys(obj1).filter((k) => !isUndefined(obj1[k]));
  const keysB = Object.keys(obj2).filter((k) => !isUndefined(obj2[k]));

  if (keysA.length !== keysB.length) {
    return false;
  }

  let result = true;

  keysA.forEach((key) => {
    if (!keysB.includes(key)) {
      result = false;
    }

    if (typeof obj1[key] === 'function' || typeof obj2[key] === 'function') {
      if (obj1[key].toString() !== obj2[key].toString()) {
        result = false;
      }
    }

    if (!isDeepEqual(obj1[key], obj2[key])) {
      result = false;
    }
  });

  return result;
}

function fromEntries(iterable: any[]) {
  if ('fromEntries' in Object) {
    return Object.fromEntries(iterable);
  }
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {});
}

export function cloneDeep(src: any): any {
  if (Array.isArray(src)) {
    return src.map(cloneDeep);
  }
  // DEVNOTE: null needs to be checked separately since typeof null is 'object' in javascript
  if (src === null || typeof src !== 'object' || src instanceof File) {
    return src;
  }
  return fromEntries(
    Object.entries(src).map(([key, val]) => [key, cloneDeep(val)])
  );
}

export function isUndefined(val: any) {
  return val === undefined || Number.isNaN(val);
}
