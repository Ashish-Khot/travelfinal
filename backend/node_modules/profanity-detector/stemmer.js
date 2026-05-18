/**
 * This script uses Porter stemmer logic which is used to stem the words
 * and Ngrams created from the user input.
 * Then we can search if the stem word is present as a key
 * in profaneDict which is loaded from the CDN
 * stemmer('string')
 * return type = string
 */
const stemmer = (() => {
  const step2list = {
    ational: 'ate',
    tional: 'tion',
    enci: 'ence',
    anci: 'ance',
    izer: 'ize',
    bli: 'ble',
    alli: 'al',
    entli: 'ent',
    eli: 'e',
    ousli: 'ous',
    ization: 'ize',
    ation: 'ate',
    ator: 'ate',
    alism: 'al',
    iveness: 'ive',
    fulness: 'ful',
    ousness: 'ous',
    aliti: 'al',
    iviti: 'ive',
    biliti: 'ble',
    logi: 'log',
  };

  const step3list = {
    icate: 'ic',
    ative: '',
    alize: 'al',
    iciti: 'ic',
    ical: 'ic',
    ful: '',
    ness: '',
  };

  const consonant = '[^aeiou]'; //  consonants
  const vowel = '[aeiouy]'; //  vowels
  const consonantSequence = `${consonant}[^aeiouy]*`;
  const vowelSequence = `${vowel}[aeiou]*`;

  const mgr0 = `^(${consonantSequence})?${vowelSequence}${consonantSequence}`;
  const meq1 = `^(${consonantSequence})?${vowelSequence}${consonantSequence}(${vowelSequence})?$`;
  const mgr1 = `^(${consonantSequence})?${vowelSequence}${consonantSequence}${vowelSequence}${consonantSequence}`;
  const vowelsInStem = `^(${consonantSequence})?${vowel}`;

  return function f1(word) {
    let stem;
    let suffix;
    let re;
    let re2;
    let re3;
    let re4;
    let originalWord = word;

    if (originalWord.length < 3) { return originalWord; }

    const firstch = originalWord.substr(0, 1);
    if (firstch === 'y') {
      originalWord = firstch.toUpperCase() + originalWord.substr(1);
    }

    // Step 1a
    re = /^(.+?)(ss|i)es$/;
    re2 = /^(.+?)([^s])s$/;

    if (re.test(originalWord)) { originalWord = originalWord.replace(re, '$1$2'); }
    else if (re2.test(originalWord)) { originalWord = originalWord.replace(re2, '$1$2'); }

    // Step 1b
    re = /^(.+?)eed$/;
    re2 = /^(.+?)(ed|ing)$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      re = new RegExp(mgr0);
      if (re.test(foundPatterns[1])) {
        re = /.$/;
        originalWord = originalWord.replace(re, '');
      }
    } else if (re2.test(originalWord)) {
      const foundPatterns = re2.exec(originalWord);
      [stem] = [foundPatterns[1]];
      re2 = new RegExp(vowelsInStem);
      if (re2.test(stem)) {
        originalWord = stem;
        re2 = /(at|bl|iz)$/;
        re3 = new RegExp('([^aeiouylsz])\\1$');
        re4 = new RegExp(`^${consonantSequence}${vowel}[^aeiouwxy]$`);
        if (re2.test(originalWord)) { originalWord = `${originalWord}e`;}
        else if (re3.test(originalWord)) { re = /.$/; originalWord = originalWord.replace(re, ''); }
        else if (re4.test(originalWord)) { originalWord = `${originalWord}e`; }
      }
    }

    // Step 1c
    re = /^(.+?)y$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      [stem] = [foundPatterns[1]];
      re = new RegExp(vowelsInStem);
      if (re.test(stem)) { originalWord = `${stem}i`; }
    }

    // Step 2
    re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      [stem, suffix] = [foundPatterns[1], foundPatterns[2]];
      re = new RegExp(mgr0);
      if (re.test(stem)) {
        originalWord = stem + step2list[suffix];
      }
    }

    // Step 3
    re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      [stem, suffix] = [foundPatterns[1], foundPatterns[2]];
      // suffix = foundPatterns[2];
      re = new RegExp(mgr0);
      if (re.test(stem)) {
        originalWord = stem + step3list[suffix];
      }
    }

    // Step 4
    re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
    re2 = /^(.+?)(s|t)(ion)$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      [stem] = [foundPatterns[1]];
      re = new RegExp(mgr1);
      if (re.test(stem)) {
        originalWord = stem;
      }
    } else if (re2.test(originalWord)) {
      const foundPatterns = re2.exec(originalWord);
      stem = foundPatterns[1] + foundPatterns[2];
      re2 = new RegExp(mgr1);
      if (re2.test(stem)) {
        originalWord = stem;
      }
    }

    // Step 5
    re = /^(.+?)e$/;
    if (re.test(originalWord)) {
      const foundPatterns = re.exec(originalWord);
      [stem] = [foundPatterns[1]];
      re = new RegExp(mgr1);
      re2 = new RegExp(meq1);
      re3 = new RegExp(`^${consonantSequence}${vowel}[^aeiouwxy]$`);
      if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
        originalWord = stem;
      }
    }

    re = /ll$/;
    re2 = new RegExp(mgr1);
    if (re.test(originalWord) && re2.test(originalWord)) {
      re = /.$/;
      originalWord = originalWord.replace(re, '');
    }

    // and turn initial Y back to y

    if (firstch === 'y') {
      originalWord = firstch.toLowerCase() + originalWord.substr(1);
    }

    return originalWord;
  };
})();

module.exports = {
  stemmer,
};
