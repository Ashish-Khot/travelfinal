const run = require('./primary.js');

module.exports.hasProfanity = function hasProfanity(SentenceToCheck) {
  return new Promise((resolve, reject) => {
    run.isProfane(SentenceToCheck)
      .then((answer) => { resolve(answer); })
      .catch(() => { reject(Error('Error occured')); });
  }).then(ans => ans).catch(() => Error('Could not use the package'));
};
