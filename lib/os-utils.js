const fs = require('fs');
const path = require('path');

/**
 * Searches all folders found in the `PATH` environment variable for a file that
 * has the specified `basename`. In addition to the pure base name, all file
 * extensions found in the `PATHEXT` environment variable will be probed.
 * The type of the return value depends on the `limit` parameter:
 * - If set to `1`, only the first result will be returned, and the return value
 * will be a string expression. If no results are found, an empty string is
 * returned.
 * - If set to a value `< 1`, all results will be returned in a string array,
 * no matter how many results are found.
 * - If set to a value `> 1`, the first `limit` results will be returned in a
 * string array (i.e. less than `limit` if less than `limit` results have been
 * found).
 *
 * The `platform` parameter controls the behaviour of the search, e.g. on
 * Windows(TM) platforms, the current directory will be included in the list of
 * paths.
 * @param {string} basename The base name of the file to resolve.
 * @param {number=} limit The maximum number of results to return (defaults to
 * `1` if omitted).
 * @param {string=} platform The platform to behave like (defaults to
 * `process.platform` if omitted).
 * @returns {string|string[]} A list of all files that have been found.
 */
exports.ResolvePath = (basename, limit, platform) => {
  if (typeof limit !== 'number') {
    limit = 1;
  }
  if (typeof platform !== 'string') {
    platform = process.platform;
  }
  var ucase = [];

  var pathExtStr = process.env.PATHEXT;
  var pathExtArr = [];
  ucase = [];
  if (platform.toLowerCase() !== 'win32') {
    pathExtArr.push('');
  }
  pathExtArr.forEach(pathSpec => ucase.push(pathSpec.toLowerCase()));
  if (pathExtStr && typeof pathExtStr === 'string') {
    pathExtStr.split(';').forEach(pathSpec => {
      if (!ucase.includes(pathSpec.toUpperCase())) {
        ucase.push(pathSpec.toUpperCase());
        pathExtArr.push(pathSpec.toLowerCase());
      }
    });
  }
  if (platform.toLowerCase() === 'win32') {
    pathExtArr.push('');
  }

  var pathStr = process.env.PATH;
  var pathStrArr = [];
  if (platform.toLowerCase() === 'win32') {
    pathStrArr.push(path.resolve('.'));
  }
  ucase = [];
  pathStrArr.forEach(pathSpec => ucase.push(pathSpec.toUpperCase()));
  if (pathStr && typeof pathStr === 'string') {
    pathStr.split(';').forEach(pathSpec => {
      if (!ucase.includes(pathSpec.toUpperCase())) {
        ucase.push(pathSpec.toUpperCase());
        pathStrArr.push(pathSpec);
      }
    });
  }

  var abort = false;
  var result = [];
  for (let pIdx = 0; pIdx < pathStrArr.length; pIdx++) {
    pathStr = pathStrArr[pIdx];
    for (let eIdx = 0; eIdx < pathExtArr.length; eIdx++) {
      pathExtStr = pathExtArr[eIdx];
      var pathSpec = this.ResolveEnv(path.join(pathStr, basename) + pathExtStr, platform);
      if (fs.existsSync(pathSpec) && !result.includes(pathSpec)) {
        result.push(pathSpec);
        if (limit > 0 && result.length >= limit) {
          abort = true;
          break;
        }
      }
    }
    if (abort) {
      break;
    }
  }

  // pathStrArr.forEach(pathStr => {
  //   pathExtArr.forEach(pathExtStr => {
  //     var pathSpec = this.ResolveEnv(path.join(pathStr, basename) + pathExtStr, platform);
  //     if (fs.existsSync(pathSpec) && result.includes(pathSpec)) {
  //       result.push(pathSpec);
  //       if (limit > 0 && result.length >= limit) {
  //         break;
  //       }
  //     }
  //   });
  // });

  if (limit === 1) {
    return result[0] || '';
  } else {
    return result;
  }
};

/**
 * @param {string} text The text to resolve.
 * @param {string=} platform The platform to behave like (defaults to
 * `process.platform` if omitted).
 * @returns {string}
 */
exports.ResolveEnv = (text, platform) => {
  var out = {};
  out.value = `${text}`;

  var replacements = 0;
  do {
    replacements = resolveEnv(out, platform);
  } while (replacements > 0);

  return out.value;
};

/**
 * @typedef {object} OutString
 * @property {string} value
 */
//
/**
 * @param {OutString} out The string output parameter
 * @param {string=} platform The platform to behave like (defaults to
 * `process.platform` if omitted).
 */
function resolveEnv (out, platform) {
  if (typeof platform !== 'string') {
    platform = process.platform;
  }
  var result = 0;

  Object.keys(process.env).forEach(key => {
    var envStr;
    switch (platform.toLowerCase()) {
      case 'win32':
        envStr = `%${key}%`;
        break;
      default:
        envStr = `$(${key})`;
        break;
    }
    while (out.value.indexOf(envStr) >= 0) {
      out.value = out.value.replace(envStr, process.env[key]);
      result++;
    }
    // var matches = out.value.match(envStr);
    // if (matches) {
    //   result += matches.length;
    //   out.value = out.value.replace(envStr, process.env[key]);
    // }
  });

  return result;
}
