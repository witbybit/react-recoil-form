export function getPathInObj(obj: any, path: string, defaultValue = undefined) {
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
export function setPathInObj(obj: any, path: string, value: any) {
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
    const isKeyArrIdx = !isLastKey && path.charAt(nextMatch.index - 1) === '[';
    if (isLastKey) {
      objInFocus[key] = value;
    } else {
      if (objInFocus[key] === undefined) {
        objInFocus[key] = isKeyArrIdx ? [] : {};
      }
      objInFocus = objInFocus[key];
    }
    pathMatch = nextPathMatch;
  }
  return obj;
}

// Taken from https://dev.to/sanderdebr/deep-equality-checking-of-objects-in-vanilla-javascript-5592
export function isDeepEqual(obj1: any, obj2: any) {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 == null ||
    obj2 == null
  ) {
    return false;
  }

  const keysA = Object.keys(obj1).filter(k => obj1[k] !== undefined);
  const keysB = Object.keys(obj2).filter(k => obj2[k] !== undefined);

  if (keysA.length !== keysB.length) {
    return false;
  }

  let result = true;

  keysA.forEach(key => {
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

export function cloneDeep(obj: any) {
  if (!obj) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj));
}