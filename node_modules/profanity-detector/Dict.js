const axios = require('axios');

let resp;
const url = 'http://res.cloudinary.com/dzbqhaluy/raw/upload/v1528264211/profane_wordsV4.json';


module.exports.getDict = async function getDict() {
  return new Promise(async (resolve, reject) => {
    resp = await axios.get(url);
    const dicVal = await resp.data;
    if (dicVal) resolve(dicVal);
    else reject();
  });
};
