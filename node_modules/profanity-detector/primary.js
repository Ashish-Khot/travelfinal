const PorterStemmer = require('./stemmer.js');
const Dictionary = require('./Dict.js');

function getNgrams(sentence, N) {
  const words = sentence.split(/\s|\.|\?|-|,|#|!/g); // [\\s\\-\\.\\'\\?\\,\\_\\@\\!]+
  const nGramSet = new Set();
  const len = words.length;

  for (let currentIndex = 0; currentIndex <= len - N; currentIndex += 1) {
    let stringBuilder = words[currentIndex];
    for (let next = currentIndex + 1; next - currentIndex < N; next += 1) {
      stringBuilder += `_${words[next]}`;
    }
    const nGramSetValue = stringBuilder;
    nGramSet.add(nGramSetValue);
  }
  return nGramSet;
}

module.exports.isProfane = async function isProfane(sentence) {
  let profane = false;
  let N = 1;
  const inputSize = sentence.split().length;
  let profaneDictionary;
  await Dictionary.getDict().then((dictionary) => { profaneDictionary = dictionary; });
  if (profaneDictionary) {
    while (N <= Math.min(4, inputSize)) {
      const ngrams = Array.from(getNgrams(sentence.toLowerCase(), N));
      for (let i = 0; i < ngrams.length && !profane; i += 1) {
        profane = profaneDictionary.hasOwnProperty(PorterStemmer.stemmer(ngrams[i]));
      }
      N += 1;
    }
  }

  return profane;
};
